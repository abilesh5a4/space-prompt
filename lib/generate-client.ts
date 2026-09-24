import { ANALYZE_NETWORK_MESSAGE, analyzeErrorMessage, isAnalyzeErrorCode } from '@/lib/analyze-messages';
import type {
  AnalyzeErrorCode,
  GenerateRequestBody,
  PromptVariants,
} from '@/types';
import type { AnalyzeFailure } from '@/lib/analyze-client';

export const GENERATE_CLIENT_TIMEOUT_MS = 35_000;

export type GenerateResult =
  | { ok: true; title: string; variants: PromptVariants }
  | { ok: false; error: AnalyzeFailure };

function fail(code: AnalyzeErrorCode, message?: string): GenerateResult {
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
 * Sends a prompt generation request to `/api/generate`.
 */
export async function requestPromptGeneration(
  body: GenerateRequestBody,
  signal?: AbortSignal
): Promise<GenerateResult> {
  const controller = new AbortController();
  const abortForCaller = () => controller.abort();

  if (signal?.aborted) return fail('ANALYSIS_FAILED');
  signal?.addEventListener('abort', abortForCaller, { once: true });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, GENERATE_CLIENT_TIMEOUT_MS);

  try {
    const response = await fetch('/api/generate', {
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

    const resObj = payload as { title?: unknown; variants?: unknown } | null;
    const title = typeof resObj?.title === 'string' ? resObj.title : 'Prompt Session';
    const variants = resObj?.variants as PromptVariants;

    if (!variants || !variants.balanced || !variants.detailed || !expertCheck(variants)) {
      return fail('INVALID_AI_RESPONSE');
    }

    return {
      ok: true,
      title,
      variants,
    };
  } catch {
    if (timedOut) return fail('AI_TIMEOUT');
    return fail('ANALYSIS_FAILED', ANALYZE_NETWORK_MESSAGE);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortForCaller);
  }
}

function expertCheck(v: PromptVariants): boolean {
  return typeof v.expert === 'object' && v.expert !== null && typeof v.expert.prompt === 'string';
}
