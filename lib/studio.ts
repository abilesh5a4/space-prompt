import type { PromptSession, PromptSessionStatus, StudioStep } from '@/types';

/**
 * Studio input rules and session helpers.
 *
 * The limit is generous on purpose: this field takes a rough, unpolished
 * thought, and people describing a real project often write several paragraphs
 * before they run out of things to say.
 */
export const STUDIO_INPUT_MAX_LENGTH = 5000;

/** Character count switches from muted to amber from here on. */
export const STUDIO_INPUT_WARN_AT = 4500;

/** Shown when Continue is pressed with nothing usable in the field. */
export const STUDIO_EMPTY_INPUT_MESSAGE = 'Tell Space Prompt what you want to work on first.';

/** Trims any input — typed, pasted, dictated or from a URL — to the limit. */
export function clampIdea(value: string): string {
  return value.length > STUDIO_INPUT_MAX_LENGTH ? value.slice(0, STUDIO_INPUT_MAX_LENGTH) : value;
}

/** Whitespace-only input counts as empty. */
export function isBlankIdea(value: string): boolean {
  return value.trim().length === 0;
}

/**
 * Adds a finalised speech phrase to whatever the user already has.
 *
 * Dictation must never replace typing, so this always appends. Spacing follows
 * what is already there: existing trailing whitespace is respected, punctuation
 * produced by the recogniser is not pushed away from the previous word, and
 * anything else gets a single separating space.
 */
export function appendTranscript(existing: string, chunk: string): string {
  const addition = chunk.trim();
  if (!addition) return existing;
  if (!existing) return clampIdea(addition);

  if (/\s$/.test(existing) || /^[,.!?;:]/.test(addition)) {
    return clampIdea(existing + addition);
  }

  return clampIdea(`${existing} ${addition}`);
}

/**
 * Identifier for the current in-memory session.
 *
 * `crypto.randomUUID` needs a secure context, which covers https and
 * localhost; the fallback exists so an insecure origin degrades instead of
 * throwing. Nothing depends on this value being globally unique yet — real ids
 * arrive with the database in Phase 12.
 */
function createSessionId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface CreatePromptSessionInput {
  originalInput: string;
  templateId?: string | null;
  categorySlug?: string | null;
  status?: PromptSessionStatus;
}

/**
 * Builds the local session object the studio works with.
 *
 * Only fields backed by something real are set. `analysis`, `clarifications`,
 * `context` and `variants` stay undefined until the phases that produce them
 * exist, so nothing downstream can mistake a placeholder for a result.
 */
export function createPromptSession({
  originalInput,
  templateId,
  categorySlug,
  status = 'draft',
}: CreatePromptSessionInput): PromptSession {
  return {
    id: createSessionId(),
    originalInput,
    status,
    createdAt: new Date().toISOString(),
    ...(templateId ? { templateId } : {}),
    ...(categorySlug ? { categorySlug } : {}),
  };
}

/**
 * Which studio surface belongs on screen, derived from the session rather than
 * tracked separately.
 *
 * One source of truth matters here: a second `step` state would be free to drift
 * out of step with the session and show a result screen for a session that has
 * no analysis attached. `analyzed` without an analysis is treated as still
 * composing for the same reason — the screen can only render what exists.
 */
export function studioStepFor(session: PromptSession | null): StudioStep {
  if (!session) return 'compose';

  switch (session.status) {
    case 'analyzing':
      return 'analyzing';
    case 'analyzed':
      return session.analysis ? 'result' : 'compose';
    case 'clarifying':
      if (session.clarifications && session.clarifications.length > 0) {
        return 'clarifying';
      }
      return 'generating-clarifications';
    case 'clarified':
      return session.clarificationAnswers ? 'review-clarifications' : 'result';
    case 'context-ready':
      return session.context ? 'context-review' : 'result';
    case 'generating':
      return 'generating-prompts';
    case 'complete':
      return session.variants ? 'prompt-result' : 'result';
    case 'error':
      return 'error';
    default:
      return 'compose';
  }
}
