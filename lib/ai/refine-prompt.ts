import { generateJson, AIError } from '@/lib/ai/provider';
import {
  extractJson,
  parsePromptRefinement,
  promptRefinementResponseSchema,
} from '@/lib/ai/schemas';
import {
  buildPromptRefinementRequest,
  PROMPT_REFINEMENT_SYSTEM_INSTRUCTION,
  REPAIR_INSTRUCTION,
} from '@/lib/ai/system-instruction';
import type { PromptContext, RefineMode } from '@/types';

export interface RefinePromptOptions {
  prompt: string;
  mode: RefineMode;
  instruction?: string;
  context?: PromptContext;
}

export interface RefinePromptResult {
  refinedPrompt: string;
  summaryOfChanges: string;
}

/**
 * Server-side prompt refinement function (Phase 14).
 * Refines a meta-prompt according to the requested mode or custom instruction using Gemini.
 */
export async function refinePrompt({
  prompt,
  mode,
  instruction,
  context,
}: RefinePromptOptions): Promise<RefinePromptResult> {
  const userContent = buildPromptRefinementRequest({
    prompt,
    mode,
    instruction,
    context,
  });

  const text = await generateJson({
    systemInstruction: PROMPT_REFINEMENT_SYSTEM_INSTRUCTION,
    userContent,
    responseSchema: promptRefinementResponseSchema,
    schemaName: 'prompt_refinement',
    temperature: 0.2,
  });

  const parsed = parsePromptRefinement(extractJson(text));
  if (parsed.ok) {
    return parsed.value;
  }

  // One single repair retry if schema parsing fails
  const repairText = await generateJson({
    systemInstruction: `${PROMPT_REFINEMENT_SYSTEM_INSTRUCTION}\n\n${REPAIR_INSTRUCTION}`,
    userContent,
    responseSchema: promptRefinementResponseSchema,
    schemaName: 'prompt_refinement',
    temperature: 0.1,
  });

  const repairedParsed = parsePromptRefinement(extractJson(repairText));
  if (repairedParsed.ok) {
    return repairedParsed.value;
  }

  throw new AIError(
    'INVALID_AI_RESPONSE',
    'The AI provider returned an unparseable prompt refinement response.'
  );
}
