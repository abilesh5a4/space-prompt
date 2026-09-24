import { ANALYZE_NETWORK_MESSAGE, analyzeErrorMessage, isAnalyzeErrorCode } from '@/lib/analyze-messages';
import { isPromptCategory } from '@/lib/categories';
import type { AnalyzeErrorCode, AnalyzeRequestBody, IntentAnalysis } from '@/types';

/**
 * Browser side of the analysis call.
 *
 * Nothing in here knows which AI provider is behind `/api/analyze`, and that is
 * the point: the browser talks to this app's own server, the server talks to the
 * provider, and the key never crosses that line. No provider SDK is imported
 * into the client bundle.
 *
 * Every outcome comes back as a value rather than a thrown error, so the studio
 * has one code path for "it worked" and one for "show the retry screen".
 */

/**
 * Client-side ceiling, deliberately longer than the server's provider timeout
 * (20s) so a slow-but-working request is reported by the server as
 * `AI_TIMEOUT` rather than guessed at here. This only catches the case where the
 * server itself never answers.
 */
export const ANALYZE_CLIENT_TIMEOUT_MS = 30_000;

export interface AnalyzeFailure {
  code: AnalyzeErrorCode;
  message: string;
}

export type AnalyzeResult =
  | { ok: true; analysis: IntentAnalysis }
  | { ok: false; error: AnalyzeFailure };

function fail(code: AnalyzeErrorCode, message?: string): AnalyzeResult {
  return { ok: false, error: { code, message: message ?? analyzeErrorMessage(code) } };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

/**
 * Narrows an untyped response body to `IntentAnalysis`.
 *
 * The server has already normalised the model's output; this is the separate,
 * smaller job of not trusting a network boundary. It checks shape only — no
 * trimming, capping or correcting, because that work belongs on the server and
 * doing it twice is how two versions of the same rule start disagreeing.
 */
function toIntentAnalysis(value: unknown): IntentAnalysis | null {
  if (typeof value !== 'object' || value === null) return null;

  const candidate = value as Record<string, unknown>;

  if (typeof candidate.intent !== 'string') return null;
  if (typeof candidate.goal !== 'string') return null;
  if (typeof candidate.summary !== 'string') return null;
  if (!isPromptCategory(candidate.category)) return null;
  if (!isStringArray(candidate.knownRequirements)) return null;
  if (!isStringArray(candidate.missingRequirements)) return null;
  if (!isStringArray(candidate.constraints)) return null;
  if (!isStringArray(candidate.ambiguities)) return null;
  if (!isNullableString(candidate.expectedOutput)) return null;
  if (!isNullableString(candidate.targetModel)) return null;
  if (typeof candidate.needsClarification !== 'boolean') return null;

  return {
    intent: candidate.intent,
    category: candidate.category,
    goal: candidate.goal,
    summary: candidate.summary,
    knownRequirements: candidate.knownRequirements,
    missingRequirements: candidate.missingRequirements,
    constraints: candidate.constraints,
    ambiguities: candidate.ambiguities,
    expectedOutput: candidate.expectedOutput,
    targetModel: candidate.targetModel,
    needsClarification: candidate.needsClarification,
  };
}

/** Reads a JSON body, tolerating an empty or non-JSON response. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/** Falls back on the HTTP status when the body carries no usable code. */
function codeForStatus(status: number): AnalyzeErrorCode {
  if (status === 400) return 'INVALID_INPUT';
  if (status === 401) return 'UNAUTHENTICATED';
  if (status === 429) return 'AI_RATE_LIMITED';
  if (status === 503) return 'AI_UNAVAILABLE';
  if (status === 504) return 'AI_TIMEOUT';
  return 'ANALYSIS_FAILED';
}

/**
 * Sends one idea to `/api/analyze`.
 *
 * `signal` belongs to the caller and means "stop caring about this response"
 * (unmount, or a fresh attempt replacing this one). The internal timeout is
 * separate so the caller can tell the two apart: its own signal aborting is
 * silence, a timeout is something the user should see.
 */
export async function requestIntentAnalysis(
  body: AnalyzeRequestBody,
  signal?: AbortSignal,
): Promise<AnalyzeResult> {
  const controller = new AbortController();
  const abortForCaller = () => controller.abort();

  if (signal?.aborted) return fail('ANALYSIS_FAILED');
  signal?.addEventListener('abort', abortForCaller, { once: true });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ANALYZE_CLIENT_TIMEOUT_MS);

  try {
    const response = await fetch('/api/analyze', {
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

    const analysis = toIntentAnalysis((payload as { analysis?: unknown } | null)?.analysis);

    // A 200 whose body is not an analysis is a broken response, not a broken
    // idea — same screen either way, so it reuses the closest existing code.
    return analysis ? { ok: true, analysis } : fail('INVALID_AI_RESPONSE');
  } catch {
    if (timedOut) return fail('AI_TIMEOUT');

    // Either the caller aborted (the studio checks its own signal and stays
    // quiet) or the request never left the machine.
    return fail('ANALYSIS_FAILED', ANALYZE_NETWORK_MESSAGE);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortForCaller);
  }
}
