import { AIError, generateClarifications } from '@/lib/ai';
import { analyzeErrorMessage, analyzeErrorMessages } from '@/lib/analyze-messages';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase/server';
import type {
  AnalyzeErrorCode,
  ClarifyErrorResponse,
  ClarifyRequestBody,
  ClarifySuccessResponse,
  IntentAnalysis,
} from '@/types';

/**
 * POST /api/clarify — Generates targeted clarification questions for a session.
 *
 * Authenticated Supabase users only. Unauthenticated callers are refused (401).
 */

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

function fail(code: AnalyzeErrorCode, message?: string): Response {
  const body: ClarifyErrorResponse = {
    error: { code, message: message ?? analyzeErrorMessage(code) },
  };

  return Response.json(body, { status: STATUS_BY_CODE[code] });
}

function parseClarifyBody(body: unknown): { ok: true; value: ClarifyRequestBody } | { ok: false; message: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.input !== 'string' || !obj.input.trim()) {
    return { ok: false, message: 'Field "input" must be a non-empty string.' };
  }

  if (typeof obj.analysis !== 'object' || obj.analysis === null) {
    return { ok: false, message: 'Field "analysis" must be a valid IntentAnalysis object.' };
  }

  const analysis = obj.analysis as Record<string, unknown>;
  if (
    typeof analysis.intent !== 'string' ||
    typeof analysis.goal !== 'string' ||
    !Array.isArray(analysis.missingRequirements) ||
    typeof analysis.needsClarification !== 'boolean'
  ) {
    return { ok: false, message: 'Field "analysis" does not match required IntentAnalysis schema.' };
  }

  return {
    ok: true,
    value: {
      input: obj.input.trim(),
      analysis: obj.analysis as IntentAnalysis,
      categoryHint: typeof obj.categoryHint === 'string' ? obj.categoryHint : null,
      templateId: typeof obj.templateId === 'string' ? obj.templateId : null,
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authentication check
  if (!isSupabaseConfigured()) {
    console.error('[clarify] refused: authentication is not configured');
    return fail('UNAUTHENTICATED', analyzeErrorMessages.UNAUTHENTICATED);
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return fail('UNAUTHENTICATED');
  }

  // 2. Validate input
  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    return fail('INVALID_INPUT', 'Invalid JSON body');
  }

  const parsed = parseClarifyBody(jsonBody);
  if (!parsed.ok) {
    return fail('INVALID_INPUT', parsed.message);
  }

  const { input, analysis, categoryHint, templateId } = parsed.value;

  // 3. Short circuit if needsClarification === false
  if (!analysis.needsClarification || analysis.missingRequirements.length === 0) {
    const body: ClarifySuccessResponse = {
      clarifications: [],
      needsClarification: false,
    };
    return Response.json(body, { status: 200 });
  }

  // 4. Generate clarification questions
  try {
    const clarifications = await generateClarifications({
      input,
      analysis,
      categoryHint,
      templateId,
    });

    const body: ClarifySuccessResponse = {
      clarifications,
      needsClarification: clarifications.length > 0,
    };

    return Response.json(body, { status: 200 });
  } catch (error) {
    if (error instanceof AIError) {
      return fail(error.code);
    }

    console.error(
      `[clarify] unexpected failure: ${error instanceof Error ? error.name : typeof error}`
    );

    return fail('ANALYSIS_FAILED');
  }
}
