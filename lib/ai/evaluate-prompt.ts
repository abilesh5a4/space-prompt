import { generateJson, AIError } from '@/lib/ai/provider';
import {
  extractJson,
  parsePromptEvaluation,
  promptEvaluationResponseSchema,
} from '@/lib/ai/schemas';
import {
  buildPromptEvaluationRequest,
  PROMPT_EVALUATION_SYSTEM_INSTRUCTION,
  REPAIR_INSTRUCTION,
} from '@/lib/ai/system-instruction';
import type { PromptContext, PromptEvaluation, PromptVariantType } from '@/types';

export interface EvaluatePromptOptions {
  prompt: string;
  context?: PromptContext;
  variant?: PromptVariantType;
}

/**
 * Server-side prompt evaluation function (Phase 15).
 * Evaluates a generated meta-prompt against objective quality dimensions using Gemini.
 */
export async function evaluatePrompt({
  prompt,
  context,
  variant = 'balanced',
}: EvaluatePromptOptions): Promise<PromptEvaluation> {
  const userContent = buildPromptEvaluationRequest({
    prompt,
    context,
    variant,
  });

  const text = await generateJson({
    systemInstruction: PROMPT_EVALUATION_SYSTEM_INSTRUCTION,
    userContent,
    responseSchema: promptEvaluationResponseSchema,
    schemaName: 'prompt_evaluation',
    temperature: 0.1,
  });

  const parsed = parsePromptEvaluation(extractJson(text));
  if (parsed.ok) {
    return parsed.value;
  }

  // One single repair retry if schema parsing fails
  const repairText = await generateJson({
    systemInstruction: `${PROMPT_EVALUATION_SYSTEM_INSTRUCTION}\n\n${REPAIR_INSTRUCTION}`,
    userContent,
    responseSchema: promptEvaluationResponseSchema,
    schemaName: 'prompt_evaluation',
    temperature: 0.1,
  });

  const repairedParsed = parsePromptEvaluation(extractJson(repairText));
  if (repairedParsed.ok) {
    return repairedParsed.value;
  }

  throw new AIError(
    'INVALID_AI_RESPONSE',
    'The AI provider returned an unparseable prompt evaluation response.'
  );
}
