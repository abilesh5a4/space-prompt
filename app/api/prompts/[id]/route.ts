import { deletePrompt, getPromptById, toggleFavorite, savePrompt } from '@/lib/supabase/prompts';
import { createServerClient } from '@/lib/supabase/server';
import type { PromptCategory, PromptContext } from '@/types';

/**
 * GET /api/prompts/[id] — Reads single prompt by ID.
 * PATCH /api/prompts/[id] — Updates prompt by ID (favorite state or variants).
 * DELETE /api/prompts/[id] — Deletes prompt by ID.
 */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, { status: 401 });
  }

  const prompt = await getPromptById(id);
  if (!prompt) {
    return Response.json({ error: { code: 'INVALID_INPUT', message: 'Prompt not found' } }, { status: 404 });
  }

  return Response.json({ prompt }, { status: 200 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
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

  // Check if this is a simple favorite toggle
  if (typeof obj.isFavorite === 'boolean' && Object.keys(obj).length === 1) {
    const updated = await toggleFavorite(id, obj.isFavorite);
    if (!updated) {
      return Response.json({ error: { code: 'INVALID_INPUT', message: 'Failed to update favorite status' } }, { status: 404 });
    }
    return Response.json({ prompt: updated }, { status: 200 });
  }

  // Otherwise full update
  const existing = await getPromptById(id);
  if (!existing) {
    return Response.json({ error: { code: 'INVALID_INPUT', message: 'Prompt not found' } }, { status: 404 });
  }

  try {
    const updated = await savePrompt({
      id,
      title: typeof obj.title === 'string' ? obj.title : existing.title,
      originalInput: existing.originalInput,
      category: (obj.category as PromptCategory) || existing.category,
      context: (obj.context as PromptContext) || existing.context,
      balancedPrompt: typeof obj.balancedPrompt === 'string' ? obj.balancedPrompt : existing.balancedPrompt,
      detailedPrompt: typeof obj.detailedPrompt === 'string' ? obj.detailedPrompt : existing.detailedPrompt,
      expertPrompt: typeof obj.expertPrompt === 'string' ? obj.expertPrompt : existing.expertPrompt,
      isFavorite: typeof obj.isFavorite === 'boolean' ? obj.isFavorite : existing.isFavorite,
    });

    return Response.json({ prompt: updated }, { status: 200 });
  } catch (error) {
    console.error('[prompts PATCH] error:', error);
    return Response.json({ error: { code: 'ANALYSIS_FAILED', message: 'Failed to update prompt' } }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } }, { status: 401 });
  }

  const success = await deletePrompt(id);
  if (!success) {
    return Response.json({ error: { code: 'INVALID_INPUT', message: 'Failed to delete prompt' } }, { status: 400 });
  }

  return Response.json({ success: true }, { status: 200 });
}
