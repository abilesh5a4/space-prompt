import { findQuickCategory } from '@/lib/categories';
import { findTemplate } from '@/lib/templates';
import { generateJson } from '@/lib/ai/provider';
import {
  clarificationQuestionsResponseSchema,
  extractJson,
  parseClarificationQuestions,
} from '@/lib/ai/schemas';
import {
  buildClarificationRequest,
  CLARIFICATION_SYSTEM_INSTRUCTION,
  REPAIR_INSTRUCTION,
} from '@/lib/ai/system-instruction';
import type { ClarificationQuestion, IntentAnalysis } from '@/types';
import { AIError } from '@/lib/ai/provider';

export interface GenerateClarificationsOptions {
  input: string;
  analysis: IntentAnalysis;
  categoryHint?: string | null;
  templateId?: string | null;
}

/**
 * Generates targeted clarification questions based on user input and IntentAnalysis.
 * Uses the existing server-side Gemini provider integration.
 */
export async function generateClarifications({
  input,
  analysis,
  categoryHint = null,
  templateId = null,
}: GenerateClarificationsOptions): Promise<ClarificationQuestion[]> {
  // Shortcut: if the idea is already clear or has no missing requirements, ask 0 questions.
  if (!analysis.needsClarification || analysis.missingRequirements.length === 0) {
    return [];
  }

  const categoryLabel = findQuickCategory(categoryHint ?? undefined)?.label ?? null;
  const templateName = findTemplate(templateId ?? undefined)?.name ?? null;

  const userContent = buildClarificationRequest({
    input,
    analysis,
    categoryLabel,
    templateName,
  });

  const text = await generateJson({
    systemInstruction: CLARIFICATION_SYSTEM_INSTRUCTION,
    userContent,
    responseSchema: clarificationQuestionsResponseSchema,
    schemaName: 'clarification_questions',
    temperature: 0.2,
  });

  const parsed = parseClarificationQuestions(extractJson(text));
  if (parsed.ok) {
    return parsed.value;
  }

  // Single repair attempt if schema parse failed
  const repairText = await generateJson({
    systemInstruction: `${CLARIFICATION_SYSTEM_INSTRUCTION}\n\n${REPAIR_INSTRUCTION}`,
    userContent,
    responseSchema: clarificationQuestionsResponseSchema,
    schemaName: 'clarification_questions',
    temperature: 0.1,
  });

  const repairedParsed = parseClarificationQuestions(extractJson(repairText));
  if (repairedParsed.ok) {
    return repairedParsed.value;
  }

  throw new AIError(
    'INVALID_AI_RESPONSE',
    'The AI provider returned an unparseable clarification structure.'
  );
}
