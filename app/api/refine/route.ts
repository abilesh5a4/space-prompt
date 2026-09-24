import { AIError, refinePrompt } from '@/lib/ai';
import { analyzeErrorMessage, analyzeErrorMessages } from '@/lib/analyze-messages';
import { isSupabaseConfigured } from '@/lib/supabase';
import { createServerClient } from '@/lib/supabase/server';
import type {
  AnalyzeErrorCode,
  PromptContext,
  RefineErrorResponse,
  RefineMode,
  RefineRequestBody,
  RefineSuccessResponse,
} from '@/types';

/**
 * POST /api/refine — Refines a meta-prompt variant (Phase 14).
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
  const body: RefineErrorResponse = {
    error: { code, message: message ?? analyzeErrorMessage(code) },
  };

  return Response.json(body, { status: STATUS_BY_CODE[code] });
}

function parseRefineBody(body: unknown): { ok: true; value: RefineRequestBody } | { ok: false; message: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, message: 'Request body must be a JSON object.' };
  }

  const obj = body as Record<string, unknown>;

  if (typeof obj.prompt !== 'string' || !obj.prompt.trim()) {
    return { ok: false, message: 'Field "prompt" must be a non-empty string.' };
  }

  const validModes = ['shorter', 'detailed', 'technical', 'beginner', 'creative', 'constraints', 'structure', 'custom'];
  if (typeof obj.mode !== 'string' || !validModes.includes(obj.mode)) {
    return { ok: false, message: 'Field "mode" must be a valid RefineMode string.' };
  }

  return {
    ok: true,
    value: {
      prompt: obj.prompt.trim(),
      mode: obj.mode as RefineMode,
      instruction: typeof obj.instruction === 'string' ? obj.instruction.trim() : undefined,
      context: typeof obj.context === 'object' && obj.context !== null ? (obj.context as PromptContext) : undefined,
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  // 1. Authentication check
  if (!isSupabaseConfigured()) {
    console.error('[refine] refused: authentication is not configured');
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

  const parsed = parseRefineBody(jsonBody);
  if (!parsed.ok) {
    return fail('INVALID_INPUT', parsed.message);
  }

  const { prompt, mode, instruction, context } = parsed.value;

  // 3. Execute refinement
  try {
    const { refinedPrompt, summaryOfChanges } = await refinePrompt({
      prompt,
      mode,
      instruction,
      context,
    });

    const body: RefineSuccessResponse = {
      refinedPrompt,
      summaryOfChanges,
    };

    return Response.json(body, { status: 200 });
  } catch (error) {
    if (error instanceof AIError) {
      return fail(error.code);
    }

    console.error(
      `[refine] unexpected failure: ${error instanceof Error ? error.name : typeof error}`
    );

    return fail('ANALYSIS_FAILED');
  }
}
