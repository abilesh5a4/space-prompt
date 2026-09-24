/**
 * Server-side AI layer for Space Prompt.
 *
 * Space Prompt talks to exactly one provider, and only ever from the server:
 *
 *   Browser -> POST /api/analyze -> lib/ai -> AI provider
 *
 * The browser never holds a provider credential and never calls a provider
 * directly. Import from this module only in server code (route handlers, server
 * components, server actions).
 *
 *   config.ts             environment + timeout
 *   provider.ts           the one REST adapter, and AIError
 *   system-instruction.ts analyzer instructions and untrusted-content wrapper
 *   schemas.ts            response schema + validator for model output
 *   analyze-intent.ts     orchestration, including the single repair retry
 */

export { AI_REQUEST_TIMEOUT_MS, isAIConfigured } from '@/lib/ai/config';
export { AIError } from '@/lib/ai/provider';
export { analyzeIntent } from '@/lib/ai/analyze-intent';
export type { AnalyzeIntentInput } from '@/lib/ai/analyze-intent';
export { generateClarifications } from '@/lib/ai/generate-clarifications';
export type { GenerateClarificationsOptions } from '@/lib/ai/generate-clarifications';
export { generatePrompt } from '@/lib/ai/generate-prompt';
export type { GeneratePromptResult } from '@/lib/ai/generate-prompt';
export { refinePrompt } from '@/lib/ai/refine-prompt';
export type { RefinePromptOptions, RefinePromptResult } from '@/lib/ai/refine-prompt';
export { evaluatePrompt } from '@/lib/ai/evaluate-prompt';
export type { EvaluatePromptOptions } from '@/lib/ai/evaluate-prompt';
export {
  parseIntentAnalysis,
  parseClarificationQuestions,
  parsePromptVariants,
  parsePromptRefinement,
  parsePromptEvaluation,
} from '@/lib/ai/schemas';




