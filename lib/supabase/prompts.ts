import { createServerClient } from '@/lib/supabase/server';
import type { PromptCategory, PromptContext, SavedPrompt } from '@/types';

/**
 * Server-side database access layer for the `prompts` table in Supabase.
 * Enforces authenticated user ownership on all operations.
 */

interface DbPromptRow {
  id: string;
  user_id: string;
  title: string;
  original_input: string;
  category: string;
  context: unknown;
  balanced_prompt: string;
  detailed_prompt: string;
  expert_prompt: string;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

function mapRowToSavedPrompt(row: DbPromptRow): SavedPrompt {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    originalInput: row.original_input,
    category: (row.category as PromptCategory) || 'general',
    context: row.context as PromptContext,
    balancedPrompt: row.balanced_prompt,
    detailedPrompt: row.detailed_prompt,
    expertPrompt: row.expert_prompt,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface SavePromptInput {
  id?: string;
  title: string;
  originalInput: string;
  category: PromptCategory;
  context: PromptContext;
  balancedPrompt: string;
  detailedPrompt: string;
  expertPrompt: string;
  isFavorite?: boolean;
}

/**
 * Creates or updates a saved prompt for the current authenticated user.
 */
export async function savePrompt(input: SavePromptInput): Promise<SavedPrompt> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthenticated user cannot save prompts.');
  }

  const payload = {
    user_id: user.id,
    title: input.title,
    original_input: input.originalInput,
    category: input.category,
    context: input.context,
    balanced_prompt: input.balancedPrompt,
    detailed_prompt: input.detailedPrompt,
    expert_prompt: input.expertPrompt,
    is_favorite: input.isFavorite ?? false,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await supabase
      .from('prompts')
      .update(payload)
      .eq('id', input.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to update prompt: ${error?.message ?? 'Unknown error'}`);
    }

    return mapRowToSavedPrompt(data as DbPromptRow);
  }

  const { data, error } = await supabase
    .from('prompts')
    .insert([payload])
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert prompt: ${error?.message ?? 'Unknown error'}`);
  }

  return mapRowToSavedPrompt(data as DbPromptRow);
}

/**
 * Gets all saved prompts for the current user (newest first).
 */
export async function getPrompts(limit?: number): Promise<SavedPrompt[]> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from('prompts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error || !data) return [];

  return (data as DbPromptRow[]).map(mapRowToSavedPrompt);
}

/**
 * Gets favorite prompts for the current user.
 */
export async function getFavoritePrompts(): Promise<SavedPrompt[]> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_favorite', true)
    .order('updated_at', { ascending: false });

  if (error || !data) return [];

  return (data as DbPromptRow[]).map(mapRowToSavedPrompt);
}

/**
 * Gets a single prompt by ID for the current user.
 */
export async function getPromptById(id: string): Promise<SavedPrompt | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;

  return mapRowToSavedPrompt(data as DbPromptRow);
}

/**
 * Deletes a prompt by ID for the current user.
 */
export async function deletePrompt(id: string): Promise<boolean> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase
    .from('prompts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  return !error;
}

/**
 * Toggles or sets the is_favorite flag for a prompt.
 */
export async function toggleFavorite(id: string, isFavorite: boolean): Promise<SavedPrompt | null> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('prompts')
    .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error || !data) return null;

  return mapRowToSavedPrompt(data as DbPromptRow);
}

/**
 * Deletes ALL prompts for the current user.
 */
export async function clearAllPrompts(): Promise<boolean> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { error } = await supabase
    .from('prompts')
    .delete()
    .eq('user_id', user.id);

  return !error;
}


