import { AIError, generateJson } from '@/lib/ai/provider';
import { extractJson, intentAnalysisResponseSchema, parseIntentAnalysis } from '@/lib/ai/schemas';
import {
  buildIntentAnalysisRequest,
  INTENT_ANALYSIS_SYSTEM_INSTRUCTION,
  REPAIR_INSTRUCTION,
} from '@/lib/ai/system-instruction';
import { findQuickCategory } from '@/lib/categories';
import { findTemplate } from '@/lib/templates';
import type { IntentAnalysis } from '@/types';

/**
 * Intent analysis: rough idea in, validated `IntentAnalysis` out.
 *
 * This is the only entry point the API route uses, which is what keeps the route
 * thin enough to bolt a rate limiter onto later without touching provider code.
 */

export interface AnalyzeIntentInput {
  /** The user's own words. Already validated for presence and length. */
  input: string;
  /** Recognised dashboard chip slug, or null. Treated as a weak hint. */
  categorySlug?: string | null;
  /** Recognised template id, or null. Treated as a weak hint. */
  templateId?: string | null;
}

/**
 * Runs one analysis, with at most one repair attempt.
 *
 * The retry exists for exactly one failure: a response that did not match the
 * schema. Provider outages and timeouts are not retried here — the user gets a
 * Try again button instead, so a struggling provider is never hammered on the
 * user's behalf.
 */
export async function analyzeIntent({
  input,
  categorySlug = null,
  templateId = null,
}: AnalyzeIntentInput): Promise<IntentAnalysis> {
  const category = findQuickCategory(categorySlug ?? undefined);
  const template = findTemplate(templateId ?? undefined);

  const userContent = buildIntentAnalysisRequest(input, {
    categoryLabel: category?.label ?? null,
    templateName: template?.name ?? null,
  });

  const first = await generateJson({
    systemInstruction: INTENT_ANALYSIS_SYSTEM_INSTRUCTION,
    userContent,
    responseSchema: intentAnalysisResponseSchema,
    schemaName: 'intent_analysis',
  });

  const firstParse = parseIntentAnalysis(extractJson(first));
  if (firstParse.ok) return firstParse.value;

  // Field names and reasons only — `issues` never carries a value, so this is
  // safe to write to a server log.
  console.warn(`[analyze] response failed validation, retrying once: ${firstParse.issues.join('; ')}`);

  const second = await generateJson({
    systemInstruction: `${INTENT_ANALYSIS_SYSTEM_INSTRUCTION}\n\n${REPAIR_INSTRUCTION}`,
    userContent,
    responseSchema: intentAnalysisResponseSchema,
    schemaName: 'intent_analysis',
    // Nudged down: the first attempt already drifted from the shape.
    temperature: 0,
  });

  const secondParse = parseIntentAnalysis(extractJson(second));
  if (secondParse.ok) return secondParse.value;

  console.error(`[analyze] response failed validation twice: ${secondParse.issues.join('; ')}`);

  throw new AIError(
    'INVALID_AI_RESPONSE',
    'The AI response did not match the required structure.'
  );
}
