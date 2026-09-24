import { analyzeErrorMessages } from '@/lib/analyze-messages';
import { isSupabaseConfigured } from '@/lib/supabase';
import { clearAllPrompts, getPrompts, savePrompt } from '@/lib/supabase/prompts';
import { createServerClient } from '@/lib/supabase/server';
import type { SavedPrompt } from '@/types';

/**
 * GET /api/prompts — Returns saved prompts for current user.
 * POST /api/prompts — Creates or updates a saved prompt for current user.
 * DELETE /api/prompts — Deletes all saved prompts for current user.
 */

export async function GET(): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: { code: 'UNAUTHENTICATED', message: analyzeErrorMessages.UNAUTHENTICATED } }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, { status: 401 });
  }

  const prompts = await getPrompts();
  return Response.json({ prompts }, { status: 200 });
}

export async function POST(request: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: { code: 'UNAUTHENTICATED', message: analyzeErrorMessages.UNAUTHENTICATED } }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: { code: 'INVALID_INPUT', message: 'Invalid JSON body' } }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return Response.json({ error: { code: 'INVALID_INPUT', message: 'Body must be an object' } }, { status: 400 });
  }

  const obj = body as Record<string, unknown>;

  if (
    typeof obj.title !== 'string' ||
    typeof obj.originalInput !== 'string' ||
    typeof obj.balancedPrompt !== 'string' ||
    typeof obj.detailedPrompt !== 'string' ||
    typeof obj.expertPrompt !== 'string' ||
    typeof obj.context !== 'object' ||
    obj.context === null
  ) {
    return Response.json({ error: { code: 'INVALID_INPUT', message: 'Missing required prompt fields' } }, { status: 400 });
  }

  try {
    const saved: SavedPrompt = await savePrompt({
      id: typeof obj.id === 'string' && obj.id ? obj.id : undefined,
      title: obj.title,
      originalInput: obj.originalInput,
      category: (obj.category as import('@/types').PromptCategory) || 'general',
      context: obj.context as import('@/types').PromptContext,
      balancedPrompt: obj.balancedPrompt,
      detailedPrompt: obj.detailedPrompt,
      expertPrompt: obj.expertPrompt,
      isFavorite: typeof obj.isFavorite === 'boolean' ? obj.isFavorite : false,
    });

    return Response.json({ prompt: saved }, { status: 200 });
  } catch (error) {
    console.error('[prompts] save error:', error);
    return Response.json({ error: { code: 'ANALYSIS_FAILED', message: 'Failed to save prompt' } }, { status: 500 });
  }
}

export async function DELETE(): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: { code: 'UNAUTHENTICATED', message: analyzeErrorMessages.UNAUTHENTICATED } }, { status: 401 });
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, { status: 401 });
  }

  const success = await clearAllPrompts();
  if (!success) {
    return Response.json({ error: { code: 'ANALYSIS_FAILED', message: 'Failed to clear prompts' } }, { status: 500 });
  }

  return Response.json({ success: true }, { status: 200 });
}

