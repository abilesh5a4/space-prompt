import { isPromptCategory, promptCategories } from '@/lib/categories';
import type { IntentAnalysis, PromptCategory } from '@/types';

/**
 * The contract between the model and the application.
 *
 * Two halves live here on purpose: the schema sent to the provider so it decodes
 * into the right shape, and the validator that assumes it did not. Model output
 * is untrusted input like any other — nothing reaches the UI without passing
 * through `parseIntentAnalysis` first.
 */

/** Per-field ceilings. Analysis is a readback, not an essay. */
export const FIELD_LIMITS = {
  intent: 90,
  goal: 220,
  summary: 420,
  listItem: 180,
  expectedOutput: 140,
  targetModel: 48,
} as const;

/** Per-array ceilings, so one verbose response cannot flood the result screen. */
export const LIST_LIMITS = {
  knownRequirements: 8,
  missingRequirements: 6,
  constraints: 6,
  ambiguities: 4,
} as const;

/**
 * Response schema in the OpenAPI subset the Gemini API accepts for
 * `responseSchema`. Every field is required: a constrained decode with holes in
 * it just moves the guesswork into the validator.
 *
 * `expectedOutput` and `targetModel` are plain strings rather than nullable
 * ones, with the empty string standing for "the user did not say". That keeps
 * the schema portable across model versions, and `parseIntentAnalysis` converts
 * `''` back to `null` before the value is used.
 */
export const intentAnalysisResponseSchema = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      description: 'Short label for what the user is trying to do. Max 12 words.',
    },
    category: {
      type: 'string',
      enum: promptCategories,
      description: 'Best fitting category. Use "general" when nothing else clearly fits.',
    },
    goal: {
      type: 'string',
      description: 'The outcome the user wants, in one sentence.',
    },
    summary: {
      type: 'string',
      description: "Restatement of the request in 1-3 sentences, in the user's own terms.",
    },
    knownRequirements: {
      type: 'array',
      items: { type: 'string' },
      description: 'Facts the user actually stated. Never inferred. Short phrases.',
    },
    missingRequirements: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Information genuinely needed before writing a good prompt. Empty when the request is already clear.',
    },
    constraints: {
      type: 'array',
      items: { type: 'string' },
      description: 'Explicit limits the user set, such as "do not use Firebase".',
    },
    ambiguities: {
      type: 'array',
      items: { type: 'string' },
      description: 'Genuinely unclear points worth naming. Usually empty.',
    },
    expectedOutput: {
      type: 'string',
      description:
        'Deliverable the user asked for, such as "React component" or "LinkedIn post". Empty string when unstated.',
    },
    targetModel: {
      type: 'string',
      description:
        'AI model the prompt is aimed at, such as "Claude" or "ChatGPT". Empty string when unstated.',
    },
    needsClarification: {
      type: 'boolean',
      description: 'True only when something material is missing.',
    },
  },
  required: [
    'intent',
    'category',
    'goal',
    'summary',
    'knownRequirements',
    'missingRequirements',
    'constraints',
    'ambiguities',
    'expectedOutput',
    'targetModel',
    'needsClarification',
  ],
  additionalProperties: false,
  propertyOrdering: [
    'intent',
    'category',
    'goal',
    'summary',
    'knownRequirements',
    'missingRequirements',
    'constraints',
    'ambiguities',
    'expectedOutput',
    'targetModel',
    'needsClarification',
  ],
} as const;

export type ParseResult =
  | { ok: true; value: IntentAnalysis }
  | { ok: false; issues: string[] };

/** Collapses whitespace and trims. Models like to pad with newlines. */
function tidy(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Truncates on a word boundary where one is close enough to the limit.
 * Over-long text is a formatting problem, not a correctness one, so it is cut
 * rather than treated as a failed response.
 */
function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;

  const hard = value.slice(0, limit);
  const lastSpace = hard.lastIndexOf(' ');
  const cut = lastSpace > limit * 0.6 ? hard.slice(0, lastSpace) : hard;

  return `${cut.replace(/[\s,;:.-]+$/, '')}...`;
}

/** Required, non-empty, length-capped string. */
function readText(
  source: Record<string, unknown>,
  key: string,
  limit: number,
  issues: string[]
): string {
  const raw = source[key];

  if (typeof raw !== 'string') {
    issues.push(`${key}: expected a string`);
    return '';
  }

  const text = tidy(raw);
  if (!text) {
    issues.push(`${key}: empty`);
    return '';
  }

  return truncate(text, limit);
}

/** Optional string where the empty string means "the user did not say". */
function readNullableText(
  source: Record<string, unknown>,
  key: string,
  limit: number,
  issues: string[]
): string | null {
  const raw = source[key];

  if (raw === null || raw === undefined) return null;

  if (typeof raw !== 'string') {
    issues.push(`${key}: expected a string or null`);
    return null;
  }

  const text = tidy(raw);
  if (!text || /^(none|null|unknown|n\/a|not specified|unspecified)$/i.test(text)) {
    return null;
  }

  return truncate(text, limit);
}

/**
 * Array of short strings: tidied, de-duplicated case-insensitively, capped in
 * both item length and count. A missing array is an error rather than an
 * implicit `[]`, because "nothing is missing" is a claim the model has to make.
 */
function readList(
  source: Record<string, unknown>,
  key: string,
  maxItems: number,
  issues: string[]
): string[] {
  const raw = source[key];

  if (!Array.isArray(raw)) {
    issues.push(`${key}: expected an array`);
    return [];
  }

  const seen = new Set<string>();
  const items: string[] = [];

  for (const entry of raw) {
    if (typeof entry !== 'string') continue;

    const text = truncate(tidy(entry), FIELD_LIMITS.listItem);
    if (!text) continue;

    const fingerprint = text.toLowerCase();
    if (seen.has(fingerprint)) continue;

    seen.add(fingerprint);
    items.push(text);

    if (items.length === maxItems) break;
  }

  return items;
}

function readCategory(source: Record<string, unknown>, issues: string[]): PromptCategory {
  const raw = source.category;

  if (typeof raw !== 'string') {
    issues.push('category: expected a string');
    return 'general';
  }

  const slug = raw.trim().toLowerCase();

  // An unknown slug is corrected rather than rejected: `general` is a truthful
  // answer for anything that does not fit, and it is what the instruction asks
  // for anyway.
  return isPromptCategory(slug) ? slug : 'general';
}

/**
 * Turns raw parsed JSON into a validated `IntentAnalysis`.
 *
 * Issues are field-level descriptions with no values in them, so they are safe
 * to log: they say `goal: empty`, never what the goal was.
 */
export function parseIntentAnalysis(input: unknown): ParseResult {
  const issues: string[] = [];

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, issues: ['root: expected a JSON object'] };
  }

  const source = input as Record<string, unknown>;

  const intent = readText(source, 'intent', FIELD_LIMITS.intent, issues);
  const category = readCategory(source, issues);
  const goal = readText(source, 'goal', FIELD_LIMITS.goal, issues);
  const summary = readText(source, 'summary', FIELD_LIMITS.summary, issues);

  const knownRequirements = readList(
    source,
    'knownRequirements',
    LIST_LIMITS.knownRequirements,
    issues
  );
  const missingRequirements = readList(
    source,
    'missingRequirements',
    LIST_LIMITS.missingRequirements,
    issues
  );
  const constraints = readList(source, 'constraints', LIST_LIMITS.constraints, issues);
  const ambiguities = readList(source, 'ambiguities', LIST_LIMITS.ambiguities, issues);

  const expectedOutput = readNullableText(
    source,
    'expectedOutput',
    FIELD_LIMITS.expectedOutput,
    issues
  );
  const targetModel = readNullableText(source, 'targetModel', FIELD_LIMITS.targetModel, issues);

  if (typeof source.needsClarification !== 'boolean') {
    issues.push('needsClarification: expected a boolean');
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      intent,
      category,
      goal,
      summary,
      knownRequirements,
      missingRequirements,
      constraints,
      ambiguities,
      expectedOutput,
      targetModel,
      // Derived, not taken on trust: the flag and the list have to agree or the
      // result screen promises questions it has nothing to ask about.
      needsClarification: missingRequirements.length > 0,
    },
  };
}

/**
 * Extracts a JSON object from model text.
 *
 * The provider is asked for `application/json` and a schema, so the happy path
 * is a straight parse. The fenced-block fallback exists because a model that
 * ignores the mime type usually wraps the same JSON in backticks, and one
 * cheap recovery beats a failed analysis.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall through to the fenced / embedded object recovery below.
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() ?? trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1);

  if (!candidate) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

/**
 * OpenAPI subset response schema for clarification questions.
 */
export const clarificationQuestionsResponseSchema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      description: '3 to 6 targeted clarification questions. Empty array if nothing material is missing.',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier for the question e.g. q1',
          },
          topic: {
            type: 'string',
            description: 'Short topic title, max 4 words e.g. Domain Focus',
          },
          question: {
            type: 'string',
            description: 'Clear, user-facing clarification question sentence',
          },
          description: {
            type: 'string',
            description: 'Optional 1 sentence guidance or rationale',
          },
          options: {
            type: 'array',
            description: '3 to 5 options for the question',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Unique option identifier e.g. opt-1' },
                label: { type: 'string', description: 'Short option label e.g. Personal Finance' },
                description: { type: 'string', description: 'Optional explanation of option' },
                value: { type: 'string', description: 'Specific choice phrase' },
                recommended: { type: 'boolean', description: 'True if AI recommends this choice' },
                type: {
                  type: 'string',
                  enum: ['normal', 'ai-recommend', 'custom'],
                  description: 'Type of option',
                },
              },
              required: ['id', 'label', 'description', 'value', 'recommended', 'type'],
              additionalProperties: false,
            },
          },
          allowCustom: {
            type: 'boolean',
            description: 'True to allow user to type a custom answer',
          },
          required: {
            type: 'boolean',
            description: 'True if question must be answered',
          },
        },
        required: ['id', 'topic', 'question', 'description', 'options', 'allowCustom', 'required'],
        additionalProperties: false,
      },
    },
  },
  required: ['questions'],
  additionalProperties: false,
  propertyOrdering: ['questions'],
} as const;

export type ParseClarificationsResult =
  | { ok: true; value: import('@/types').ClarificationQuestion[] }
  | { ok: false; issues: string[] };

export const CLARIFICATION_LIMITS = {
  maxQuestions: 6,
  maxOptions: 7,
  topic: 60,
  question: 220,
  description: 300,
  optionLabel: 80,
  optionValue: 200,
} as const;

/**
 * Validates and normalises raw AI output into a list of ClarificationQuestions.
 */
export function parseClarificationQuestions(input: unknown): ParseClarificationsResult {
  const issues: string[] = [];

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, issues: ['root: expected a JSON object'] };
  }

  const source = input as Record<string, unknown>;
  const rawQuestions = source.questions;

  if (!Array.isArray(rawQuestions)) {
    return { ok: false, issues: ['questions: expected an array'] };
  }

  const result: import('@/types').ClarificationQuestion[] = [];
  const questionIds = new Set<string>();

  for (let i = 0; i < rawQuestions.length; i++) {
    if (result.length >= CLARIFICATION_LIMITS.maxQuestions) break;

    const rawQ = rawQuestions[i];
    if (typeof rawQ !== 'object' || rawQ === null || Array.isArray(rawQ)) continue;

    const qObj = rawQ as Record<string, unknown>;
    const rawId = typeof qObj.id === 'string' && qObj.id.trim() ? qObj.id.trim() : `q${i + 1}`;
    if (questionIds.has(rawId)) continue;
    questionIds.add(rawId);

    const topic = readText(qObj, 'topic', CLARIFICATION_LIMITS.topic, issues);
    const question = readText(qObj, 'question', CLARIFICATION_LIMITS.question, issues);
    const description = readNullableText(
      qObj,
      'description',
      CLARIFICATION_LIMITS.description,
      []
    );

    const rawOptions = Array.isArray(qObj.options) ? qObj.options : [];
    const options: import('@/types').ClarificationOption[] = [];
    const optionIds = new Set<string>();

    for (let j = 0; j < rawOptions.length; j++) {
      if (options.length >= CLARIFICATION_LIMITS.maxOptions) break;
      const rawOpt = rawOptions[j];
      if (typeof rawOpt !== 'object' || rawOpt === null || Array.isArray(rawOpt)) continue;
      const optObj = rawOpt as Record<string, unknown>;

      const optId =
        typeof optObj.id === 'string' && optObj.id.trim()
          ? optObj.id.trim()
          : `${rawId}-opt-${j + 1}`;
      if (optionIds.has(optId)) continue;
      optionIds.add(optId);

      const label = readText(optObj, 'label', CLARIFICATION_LIMITS.optionLabel, []);
      const value = readText(optObj, 'value', CLARIFICATION_LIMITS.optionValue, []);
      if (!label || !value) continue;

      const optDesc = readNullableText(
        optObj,
        'description',
        CLARIFICATION_LIMITS.description,
        []
      );

      const typeStr = typeof optObj.type === 'string' ? optObj.type : 'normal';
      const type: import('@/types').ClarificationOptionType =
        typeStr === 'ai-recommend' || typeStr === 'custom' ? typeStr : 'normal';

      options.push({
        id: optId,
        label,
        value,
        ...(optDesc ? { description: optDesc } : {}),
        ...(optObj.recommended === true ? { recommended: true } : {}),
        type,
      });
    }

    // Guarantee presence of "Let AI Recommend" and "Other" options if missing
    if (!options.some((o) => o.type === 'ai-recommend')) {
      const recId = `${rawId}-opt-ai-rec`;
      if (!optionIds.has(recId)) {
        options.push({
          id: recId,
          label: 'Let AI Recommend',
          value: 'Let AI choose the best option based on best practices',
          type: 'ai-recommend',
        });
      }
    }

    if (!options.some((o) => o.type === 'custom')) {
      const customId = `${rawId}-opt-other`;
      if (!optionIds.has(customId)) {
        options.push({
          id: customId,
          label: 'Other',
          value: 'Custom specification',
          type: 'custom',
        });
      }
    }

    if (!topic || !question || options.length < 2) continue;

    const allowCustom =
      typeof qObj.allowCustom === 'boolean' ? qObj.allowCustom : true;
    const required = typeof qObj.required === 'boolean' ? qObj.required : true;

    result.push({
      id: rawId,
      topic,
      question,
      ...(description ? { description } : {}),
      options,
      allowCustom,
      required,
    });
  }

  // Hard maximum enforcement: max 6 questions
  const finalQuestions = result.slice(0, CLARIFICATION_LIMITS.maxQuestions);

  return { ok: true, value: finalQuestions };
}

/**
 * OpenAPI subset response schema for prompt generation (Phase 10).
 */
export const promptVariantsResponseSchema = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Short, descriptive 2 to 5 word title for the prompt session e.g. AI Finance Project Architect',
    },
    balanced: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Variant name e.g. Balanced' },
        prompt: {
          type: 'string',
          description: 'Balanced meta-prompt with clear role, objective, requirements, and constraints',
        },
      },
      required: ['title', 'prompt'],
      additionalProperties: false,
    },
    detailed: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Variant name e.g. Detailed' },
        prompt: {
          type: 'string',
          description: 'Detailed meta-prompt with background, process guidance, and deliverables',
        },
      },
      required: ['title', 'prompt'],
      additionalProperties: false,
    },
    expert: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Variant name e.g. Expert' },
        prompt: {
          type: 'string',
          description: 'Expert meta-prompt with advanced constraints, assumptions, and quality criteria',
        },
      },
      required: ['title', 'prompt'],
      additionalProperties: false,
    },
  },
  required: ['title', 'balanced', 'detailed', 'expert'],
  additionalProperties: false,
  propertyOrdering: ['title', 'balanced', 'detailed', 'expert'],
} as const;

export type ParsePromptVariantsResult =
  | { ok: true; value: { title: string; variants: import('@/types').PromptVariants } }
  | { ok: false; issues: string[] };

/**
 * Validates and normalises raw AI output into a session title and PromptVariants.
 */
export function parsePromptVariants(input: unknown): ParsePromptVariantsResult {
  const issues: string[] = [];

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, issues: ['root: expected a JSON object'] };
  }

  const source = input as Record<string, unknown>;

  const title = readText(source, 'title', 80, issues);

  const readVariant = (
    key: string,
    fallbackTitle: string
  ): import('@/types').GeneratedPrompt | null => {
    const raw = source[key];
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      issues.push(`${key}: expected an object`);
      return null;
    }

    const obj = raw as Record<string, unknown>;
    const vTitle = readText(obj, 'title', 60, []) || fallbackTitle;
    const vPrompt = readText(obj, 'prompt', 8000, issues);

    if (!vPrompt) return null;

    return { title: vTitle, prompt: vPrompt };
  };

  const balanced = readVariant('balanced', 'Balanced');
  const detailed = readVariant('detailed', 'Detailed');
  const expert = readVariant('expert', 'Expert');

  if (!title || !balanced || !detailed || !expert) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      title,
      variants: {
        balanced,
        detailed,
        expert,
      },
    },
  };
}

/**
 * OpenAPI subset response schema for prompt refinement (Phase 14).
 */
export const promptRefinementResponseSchema = {
  type: 'object',
  properties: {
    refinedPrompt: {
      type: 'string',
      description: 'The refined meta-prompt',
    },
    summaryOfChanges: {
      type: 'string',
      description: 'One short sentence explaining what was adjusted',
    },
  },
  required: ['refinedPrompt', 'summaryOfChanges'],
  additionalProperties: false,
  propertyOrdering: ['refinedPrompt', 'summaryOfChanges'],
} as const;

export type ParsePromptRefinementResult =
  | { ok: true; value: { refinedPrompt: string; summaryOfChanges: string } }
  | { ok: false; issues: string[] };

/**
 * Validates and normalises raw AI output into refinedPrompt and summaryOfChanges.
 */
export function parsePromptRefinement(input: unknown): ParsePromptRefinementResult {
  const issues: string[] = [];

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, issues: ['root: expected a JSON object'] };
  }

  const source = input as Record<string, unknown>;

  const refinedPrompt = readText(source, 'refinedPrompt', 8000, issues);
  const summaryOfChanges = readText(source, 'summaryOfChanges', 300, []) || 'Refinement applied.';

  if (!refinedPrompt) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      refinedPrompt,
      summaryOfChanges,
    },
  };
}

/**
 * OpenAPI subset response schema for prompt quality evaluation (Phase 15).
 */
export const promptEvaluationResponseSchema = {
  type: 'object',
  properties: {
    overallScore: { type: 'integer', description: 'Overall weighted integer score from 0 to 100' },
    dimensions: {
      type: 'object',
      properties: {
        clarity: { type: 'integer', description: 'Clarity score 0-100' },
        specificity: { type: 'integer', description: 'Specificity score 0-100' },
        context: { type: 'integer', description: 'Context score 0-100' },
        constraints: { type: 'integer', description: 'Constraints score 0-100' },
        outputDefinition: { type: 'integer', description: 'Output definition score 0-100' },
        actionability: { type: 'integer', description: 'Actionability score 0-100' },
      },
      required: ['clarity', 'specificity', 'context', 'constraints', 'outputDefinition', 'actionability'],
      additionalProperties: false,
    },
    strengths: {
      type: 'array',
      items: { type: 'string' },
      description: '2 to 4 concise strengths of the prompt',
    },
    improvements: {
      type: 'array',
      items: { type: 'string' },
      description: '2 to 4 actionable suggestions for improvement',
    },
    summary: {
      type: 'string',
      description: '1-2 sentence executive summary of evaluation',
    },
  },
  required: ['overallScore', 'dimensions', 'strengths', 'improvements', 'summary'],
  additionalProperties: false,
  propertyOrdering: ['overallScore', 'dimensions', 'strengths', 'improvements', 'summary'],
} as const;

function clampScore(value: unknown, fallback = 75): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export type ParsePromptEvaluationResult =
  | { ok: true; value: import('@/types').PromptEvaluation }
  | { ok: false; issues: string[] };

export function parsePromptEvaluation(input: unknown): ParsePromptEvaluationResult {
  const issues: string[] = [];

  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { ok: false, issues: ['root: expected a JSON object'] };
  }

  const source = input as Record<string, unknown>;

  const overallScore = clampScore(source.overallScore, 80);

  const rawDims = (typeof source.dimensions === 'object' && source.dimensions !== null
    ? source.dimensions
    : {}) as Record<string, unknown>;

  const dimensions: import('@/types').PromptEvaluationDimensions = {
    clarity: clampScore(rawDims.clarity, 80),
    specificity: clampScore(rawDims.specificity, 75),
    context: clampScore(rawDims.context, 75),
    constraints: clampScore(rawDims.constraints, 70),
    outputDefinition: clampScore(rawDims.outputDefinition, 75),
    actionability: clampScore(rawDims.actionability, 85),
  };

  const strengths = readList(source, 'strengths', 5, issues);
  const improvements = readList(source, 'improvements', 5, issues);
  const summary = readText(source, 'summary', 300, issues) || 'Prompt evaluated.';

  if (issues.length > 0 && strengths.length === 0 && improvements.length === 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    value: {
      overallScore,
      dimensions,
      strengths: strengths.length > 0 ? strengths : ['Prompt presents a clear structure.'],
      improvements: improvements.length > 0 ? improvements : ['Consider specifying explicit edge case requirements.'],
      summary,
    },
  };
}




