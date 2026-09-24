import type { AnalyzeErrorCode } from '@/types';

/**
 * The only failure copy in the system.
 *
 * Shared by `/api/analyze` and the studio so the two can never drift, and
 * written for the person reading it: what happened, in one sentence, with no
 * provider name, status code, stack trace or environment variable in sight.
 */
export const analyzeErrorMessages: Record<AnalyzeErrorCode, string> = {
  INVALID_INPUT: 'Space Prompt could not read that idea.',
  UNAUTHENTICATED: 'Please sign in again to analyse your idea.',
  AI_UNAVAILABLE: 'AI analysis is currently unavailable. Please try again in a moment.',
  AI_RATE_LIMITED: 'Daily AI limit reached. Please try again later.',
  AI_TIMEOUT: 'The analysis took too long to come back.',
  INVALID_AI_RESPONSE: 'We could not understand your idea this time.',
  INVALID_PROVIDER_REQUEST: 'An internal AI configuration error occurred. Please contact support.',
  ANALYSIS_FAILED: 'We could not analyse your idea this time.',
};

/** Reassurance that belongs on every analysis failure: nothing was lost. */
export const ANALYZE_ERROR_REASSURANCE = 'Your work is safe — nothing was lost.';

/**
 * Used when the request never reached the server at all — offline, dropped
 * connection, blocked request. Classified as `ANALYSIS_FAILED` because the
 * failure codes describe what the server said, and here the server said nothing,
 * but the wording points at the connection so the advice is actionable.
 */
export const ANALYZE_NETWORK_MESSAGE =
  'Space Prompt could not reach the server. Check your connection and try again.';

export function isAnalyzeErrorCode(value: unknown): value is AnalyzeErrorCode {
  return typeof value === 'string' && value in analyzeErrorMessages;
}

/** Message for a code, falling back to the generic failure for anything unknown. */
export function analyzeErrorMessage(code: unknown): string {
  return isAnalyzeErrorCode(code) ? analyzeErrorMessages[code] : analyzeErrorMessages.ANALYSIS_FAILED;
}
