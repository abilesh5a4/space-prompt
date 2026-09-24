import { generateJson, AIError } from '@/lib/ai/provider';
import {
  extractJson,
  parsePromptVariants,
  promptVariantsResponseSchema,
} from '@/lib/ai/schemas';
import {
  buildPromptGenerationRequest,
  PROMPT_GENERATOR_SYSTEM_INSTRUCTION,
  REPAIR_INSTRUCTION,
} from '@/lib/ai/system-instruction';
import type { PromptContext, PromptVariants } from '@/types';

export interface GeneratePromptResult {
  title: string;
  variants: PromptVariants;
}

/**
 * Server-side prompt generator.
 * Converts a validated PromptContext into title and multi-variant meta-prompts (Balanced, Detailed, Expert).
 */
export async function generatePrompt(context: PromptContext): Promise<GeneratePromptResult> {
  const userContent = buildPromptGenerationRequest(context);

  const text = await generateJson({
    systemInstruction: PROMPT_GENERATOR_SYSTEM_INSTRUCTION,
    userContent,
    responseSchema: promptVariantsResponseSchema,
    schemaName: 'prompt_variants',
    temperature: 0.3,
  });

  const parsed = parsePromptVariants(extractJson(text));
  if (parsed.ok) {
    return parsed.value;
  }

  // One single repair attempt if model output fails schema validation
  const repairText = await generateJson({
    systemInstruction: `${PROMPT_GENERATOR_SYSTEM_INSTRUCTION}\n\n${REPAIR_INSTRUCTION}`,
    userContent,
    responseSchema: promptVariantsResponseSchema,
    schemaName: 'prompt_variants',
    temperature: 0.1,
  });

  const repairedParsed = parsePromptVariants(extractJson(repairText));
  if (repairedParsed.ok) {
    return repairedParsed.value;
  }

  throw new AIError(
    'INVALID_AI_RESPONSE',
    'The AI provider returned an unparseable prompt generation structure.'
  );
}
