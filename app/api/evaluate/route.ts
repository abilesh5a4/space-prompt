import { evaluatePrompt, AIError } from '@/lib/ai';
import { analyzeErrorMessage, analyzeErrorMessages } from '@/lib/analyze-messages';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase/server';
import type {
  AnalyzeErrorCode,
  EvaluateErrorResponse,
  EvaluateRequestBody,
  EvaluateSuccessResponse,
  PromptContext,
  PromptVariantType,
} from '@/types';

/**
 * POST /api/evaluate — Evaluates prompt quality across objective dimensions (Phase 15).
 *
 * Authenticated Supabase users only. Unauthenticated callers receive 401.
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
  const body: EvaluateErrorResponse = {
    error: { code, message: message ?? analyzeErrorMessage(code) },
  };

  return Response.json(body, { status: STATUS_BY_CODE[code] });
}

function parseEvaluateBody(body: unknown): { ok: true; value: EvaluateRequestBody } | { ok: false; message: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.prompt !== 'string' || !obj.prompt.trim()) {
    return { ok: false, message: 'Field "prompt" must be a non-empty string.' };
  }

  const validVariants = ['balanced', 'detailed', 'expert'];
  const variant = typeof obj.variant === 'string' && validVariants.includes(obj.variant)
    ? (obj.variant as PromptVariantType)
    : 'balanced';

  return {
    ok: true,
    value: {
      prompt: obj.prompt.trim(),
      variant,
      context: typeof obj.context === 'object' && obj.context !== null ? (obj.context as PromptContext) : undefined,
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authentication check
  if (!isSupabaseConfigured()) {
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

  const parsed = parseEvaluateBody(jsonBody);
  if (!parsed.ok) {
    return fail('INVALID_INPUT', parsed.message);
  }

  const { prompt, variant, context } = parsed.value;

  // 3. Execute prompt quality evaluation
  try {
    const evaluation = await evaluatePrompt({
      prompt,
      context,
      variant,
    });

    const body: EvaluateSuccessResponse = {
      evaluation,
    };

    return Response.json(body, { status: 200 });
  } catch (error) {
    if (error instanceof AIError) {
      return fail(error.code);
    }

    console.error(
      `[evaluate] unexpected failure: ${error instanceof Error ? error.name : typeof error}`
    );

    return fail('ANALYSIS_FAILED');
  }
}
