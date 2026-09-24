import { ANALYZE_NETWORK_MESSAGE, analyzeErrorMessage, isAnalyzeErrorCode } from '@/lib/analyze-messages';
import type {
  AnalyzeErrorCode,
  ClarificationQuestion,
  ClarifyRequestBody,
} from '@/types';
import type { AnalyzeFailure } from '@/lib/analyze-client';

export const CLARIFY_CLIENT_TIMEOUT_MS = 30_000;

export type ClarifyResult =
  | { ok: true; clarifications: ClarificationQuestion[]; needsClarification: boolean }
  | { ok: false; error: AnalyzeFailure };

function fail(code: AnalyzeErrorCode, message?: string): ClarifyResult {
  return { ok: false, error: { code, message: message ?? analyzeErrorMessage(code) } };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function codeForStatus(status: number): AnalyzeErrorCode {
  if (status === 400) return 'INVALID_INPUT';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 429) return 'AI_RATE_LIMITED';
  if (status === 503) return 'AI_UNAVAILABLE';
  if (status === 504) return 'AI_TIMEOUT';
  return 'ANALYSIS_FAILED';
}

/**
 * Sends a clarification generation request to `/api/clarify`.
 */
export async function requestClarifications(
  body: ClarifyRequestBody,
  signal?: AbortSignal
): Promise<ClarifyResult> {
  const controller = new AbortController();
  const abortForCaller = () => controller.abort();

  if (signal?.aborted) return fail('ANALYSIS_FAILED');
  signal?.addEventListener('abort', abortForCaller, { once: true });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CLARIFY_CLIENT_TIMEOUT_MS);

  try {
    const response = await fetch('/api/clarify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    const payload = await readJson(response);

    if (!response.ok) {
      const reported = (payload as { error?: { code?: unknown } } | null)?.error?.code;
      return fail(isAnalyzeErrorCode(reported) ? reported : codeForStatus(response.status));
    }

    const resObj = payload as { clarifications?: unknown; needsClarification?: unknown } | null;
    const clarifications = Array.isArray(resObj?.clarifications)
      ? (resObj?.clarifications as ClarificationQuestion[])
      : [];
    const needsClarification = typeof resObj?.needsClarification === 'boolean' ? resObj.needsClarification : false;

    return {
      ok: true,
      clarifications,
      needsClarification,
    };
  } catch {
    if (timedOut) return fail('AI_TIMEOUT');
    return fail('ANALYSIS_FAILED', ANALYZE_NETWORK_MESSAGE);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortForCaller);
  }
}
