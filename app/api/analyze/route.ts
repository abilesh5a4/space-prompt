import { AIError, analyzeIntent } from '@/lib/ai';
import { analyzeErrorMessage, analyzeErrorMessages } from '@/lib/analyze-messages';
import { readAnalyzeRequest } from '@/lib/analyze-request';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase/server';
import type { AnalyzeErrorCode, AnalyzeErrorResponse, AnalyzeSuccessResponse } from '@/types';

/**
 * POST /api/analyze — the only way into the intent analyzer.
 *
 * The route is deliberately thin: authenticate, validate, delegate, translate
 * failures. All provider knowledge lives in `lib/ai`, so a rate limiter or a
 * usage record can be added here later without touching the AI layer.
 *
 * Every response body is one of two shapes:
 *   { analysis }                  on success
 *   { error: { code, message } }  on failure
 */

/** HTTP status per failure. The body carries the code the client actually uses. */
const STATUS_BY_CODE: Record<AnalyzeErrorCode, number> = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  AI_UNAVAILABLE: 503,
  AI_RATE_LIMITED: 429,
  AI_TIMEOUT: 504,
  INVALID_AI_RESPONSE: 502,
  INVALID_PROVIDER_REQUEST: 500,
  ANALYSIS_FAILED: 502,
};

/**
 * Builds a failure response.
 *
 * `message` defaults to the shared copy for the code, so a provider's own words
 * can never reach the browser by accident — only text written for this purpose
 * is ever sent.
 */
function fail(code: AnalyzeErrorCode, message?: string): Response {
  const body: AnalyzeErrorResponse = {
    error: { code, message: message ?? analyzeErrorMessage(code) },
  };

  return Response.json(body, { status: STATUS_BY_CODE[code] });
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authentication. The analyzer costs money to run, so it is never open:
  //    an unauthenticated caller is refused before the body is even read.
  if (!isSupabaseConfigured()) {
    // Without Supabase there is no way to establish who is calling, and an
    // endpoint that cannot tell must not answer.
    console.error('[analyze] refused: authentication is not configured');
    return fail('UNAUTHENTICATED', analyzeErrorMessages.UNAUTHENTICATED);
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return fail('UNAUTHENTICATED');
  }

  // Seam for a future per-user rate limit: everything needed for one is in
  // scope here (the authenticated user, before any provider call is made), and
  // nothing below depends on how that limit would be stored.

  // 2. Input validation, independent of whatever the browser checked.
  const parsed = await readAnalyzeRequest(request);

  if (!parsed.ok) {
    return fail('INVALID_INPUT', parsed.message);
  }

  // 3. Analysis. The user's text is untrusted content from here on, and the
  //    result is validated inside `analyzeIntent` before it is returned.
  try {
    const analysis = await analyzeIntent(parsed.value);
    const body: AnalyzeSuccessResponse = { analysis };

    return Response.json(body, { status: 200 });
  } catch (error) {
    if (error instanceof AIError) {
      // Already classified, and already logged where it happened. The internal
      // message is dropped in favour of the shared user-facing copy.
      return fail(error.code);
    }

    // Anything else is a bug in this app. The name is logged for debugging; the
    // stack and message stay on the server.
    console.error(
      `[analyze] unexpected failure: ${error instanceof Error ? error.name : typeof error}`
    );

    return fail('ANALYSIS_FAILED');
  }
}
