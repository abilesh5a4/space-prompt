import type {
  ClarificationAnswer,
  ClarificationQuestion,
  DelegatedDecision,
  IntentAnalysis,
  PromptContext,
} from '@/types';

export interface BuildPromptContextInput {
  originalInput: string;
  analysis: IntentAnalysis;
  clarifications?: ClarificationQuestion[];
  clarificationAnswers?: Record<string, ClarificationAnswer>;
  templateId?: string | null;
  categoryHint?: string | null;
}

/** Helper for normalizing strings for case/whitespace insensitive deduplication. */
function normalizeForComparison(str: string): string {
  return str.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Deterministic pure function to build a structured PromptContext object.
 *
 * Combines the user's original text, intent analysis (Phase 7), and clarification answers (Phase 8).
 * Ensures no duplicate requirements, preserves all stated requirements, and captures delegated AI decisions.
 */
export function buildPromptContext({
  originalInput,
  analysis,
  clarifications = [],
  clarificationAnswers = {},
  templateId = null,
  categoryHint = null,
}: BuildPromptContextInput): PromptContext {
  const seenFingerprints = new Set<string>();

  // 1. Process Known Requirements from Phase 7 Analysis
  const knownRequirements: string[] = [];
  for (const item of analysis.knownRequirements ?? []) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const fp = normalizeForComparison(trimmed);
    if (!seenFingerprints.has(fp)) {
      seenFingerprints.add(fp);
      knownRequirements.push(trimmed);
    }
  }

  // Also include expected output or target model if explicitly stated
  if (analysis.expectedOutput) {
    seenFingerprints.add(normalizeForComparison(analysis.expectedOutput));
  }
  if (analysis.targetModel) {
    seenFingerprints.add(normalizeForComparison(analysis.targetModel));
  }

  // 2. Process Clarification Answers from Phase 8
  const clarifiedRequirements: string[] = [];
  const delegatedDecisions: DelegatedDecision[] = [];
  const ambiguitiesResolved: string[] = [];

  for (const question of clarifications) {
    const answer: ClarificationAnswer | undefined = clarificationAnswers[question.id];
    if (!answer) continue;

    if (answer.delegatedToAI) {
      delegatedDecisions.push({
        questionId: question.id,
        topic: question.topic,
      });
    } else {
      const value = answer.value.trim();
      if (!value) continue;

      const fp = normalizeForComparison(value);
      if (!seenFingerprints.has(fp)) {
        seenFingerprints.add(fp);
        clarifiedRequirements.push(value);
      }
    }
  }

  // 3. Process Constraints from Phase 7 Analysis
  const constraints: string[] = [];
  const constraintFingerprints = new Set<string>();
  for (const item of analysis.constraints ?? []) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const fp = normalizeForComparison(trimmed);
    if (!constraintFingerprints.has(fp)) {
      constraintFingerprints.add(fp);
      constraints.push(trimmed);
    }
  }

  // 4. Ambiguities resolved (any remaining unresolved ambiguities from Phase 7)
  for (const amb of analysis.ambiguities ?? []) {
    const trimmed = amb.trim();
    if (trimmed) ambiguitiesResolved.push(trimmed);
  }

  return {
    originalInput: originalInput.trim(),
    category: analysis.category,
    goal: analysis.goal,
    summary: analysis.summary,
    knownRequirements,
    clarifiedRequirements,
    constraints,
    ambiguitiesResolved,
    delegatedDecisions,
    expectedOutput: analysis.expectedOutput,
    targetModel: analysis.targetModel,
    ...(templateId ? { templateId } : {}),
    ...(categoryHint ? { categoryHint } : {}),
  };
}
