import { AIError, generatePrompt } from '@/lib/ai';
import { analyzeErrorMessage, analyzeErrorMessages } from '@/lib/analyze-messages';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase/server';
import type {
  AnalyzeErrorCode,
  GenerateErrorResponse,
  GenerateSuccessResponse,
  PromptContext,
} from '@/types';

/**
 * POST /api/generate — Generates multi-variant meta-prompts (Balanced, Detailed, Expert) from a PromptContext.
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
  const body: GenerateErrorResponse = {
    error: { code, message: message ?? analyzeErrorMessage(code) },
  };

  return Response.json(body, { status: STATUS_BY_CODE[code] });
}

function parseGenerateBody(body: unknown): { ok: true; context: PromptContext } | { ok: false; message: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.context !== 'object' || obj.context === null) {
    return { ok: false, message: 'Field "context" must be a valid PromptContext object.' };
  }

  const ctx = obj.context as Record<string, unknown>;
  if (
    typeof ctx.originalInput !== 'string' ||
    typeof ctx.goal !== 'string' ||
    typeof ctx.summary !== 'string' ||
    !Array.isArray(ctx.knownRequirements) ||
    !Array.isArray(ctx.clarifiedRequirements) ||
    !Array.isArray(ctx.constraints)
  ) {
    return { ok: false, message: 'Field "context" does not match required PromptContext schema.' };
  }

  return { ok: true, context: obj.context as PromptContext };
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authentication check
  if (!isSupabaseConfigured()) {
    console.error('[generate] refused: authentication is not configured');
    return fail('UNAUTHENTICATED', analyzeErrorMessages.UNAUTHENTICATED);
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return fail('UNAUTHENTICATED');
  }

  // 2. Validate request body
  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    return fail('INVALID_INPUT', 'Invalid JSON body');
  }

  const parsed = parseGenerateBody(jsonBody);
  if (!parsed.ok) {
    return fail('INVALID_INPUT', parsed.message);
  }

  // 3. Generate prompts
  try {
    const { title, variants } = await generatePrompt(parsed.context);

    const body: GenerateSuccessResponse = {
      title,
      variants,
    };

    return Response.json(body, { status: 200 });
  } catch (error) {
    if (error instanceof AIError) {
      return fail(error.code);
    }

    console.error(
      `[generate] unexpected failure: ${error instanceof Error ? error.name : typeof error}`
    );

    return fail('ANALYSIS_FAILED');
  }
}
