import type { SavedPrompt, PromptCategory, PromptContext } from '@/types';

export interface SavePromptPayload {
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

export async function requestSavePrompt(payload: SavePromptPayload): Promise<{ ok: true; prompt: SavedPrompt } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok || !data.prompt) {
      return { ok: false, error: data?.error?.message ?? 'Failed to save prompt' };
    }

    return { ok: true, prompt: data.prompt };
  } catch {
    return { ok: false, error: 'Network error while saving prompt' };
  }
}

export async function requestToggleFavorite(id: string, isFavorite: boolean): Promise<{ ok: true; prompt: SavedPrompt } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/prompts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isFavorite }),
    });

    const data = await res.json();
    if (!res.ok || !data.prompt) {
      return { ok: false, error: data?.error?.message ?? 'Failed to update favorite status' };
    }

    return { ok: true, prompt: data.prompt };
  } catch {
    return { ok: false, error: 'Network error while updating favorite status' };
  }
}

export async function requestUpdatePrompt(id: string, updates: Partial<SavePromptPayload>): Promise<{ ok: true; prompt: SavedPrompt } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/prompts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const data = await res.json();
    if (!res.ok || !data.prompt) {
      return { ok: false, error: data?.error?.message ?? 'Failed to update prompt' };
    }

    return { ok: true, prompt: data.prompt };
  } catch {
    return { ok: false, error: 'Network error while updating prompt' };
  }
}

export async function requestDeletePrompt(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch(`/api/prompts/${id}`, {
      method: 'DELETE',
    });

    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data?.error?.message ?? 'Failed to delete prompt' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error while deleting prompt' };
  }
}
