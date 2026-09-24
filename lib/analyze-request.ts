import { findQuickCategory } from '@/lib/categories';
import { STUDIO_EMPTY_INPUT_MESSAGE, STUDIO_INPUT_MAX_LENGTH } from '@/lib/studio';
import { findTemplate } from '@/lib/templates';

/**
 * Server-side validation for `POST /api/analyze`.
 *
 * The studio enforces the same rules in the browser, and that enforcement is
 * treated as a courtesy to the user rather than as a guarantee: anything can
 * post to this endpoint, so every rule is applied again here.
 *
 * Kept free of provider imports so it can be reasoned about — and tested — on
 * its own.
 */

/**
 * Ceiling on the raw request body, checked before parsing.
 *
 * The field itself is capped at 5000 characters; the rest of the allowance
 * covers JSON escaping and the two short hint fields. Anything larger is not a
 * user typing, and it is refused without being parsed.
 */
export const MAX_REQUEST_BODY_CHARS = 24_000;

/** Hints longer than this are not slugs, so they are dropped without a lookup. */
const MAX_HINT_CHARS = 64;

export interface AnalyzeRequestInput {
  input: string;
  /** Recognised chip slug, or null. Unknown values are dropped, not rejected. */
  categorySlug: string | null;
  /** Recognised template id, or null. Unknown values are dropped, not rejected. */
  templateId: string | null;
}

export type AnalyzeRequestResult =
  | { ok: true; value: AnalyzeRequestInput }
  | { ok: false; message: string };

/** A hint is context, not a requirement, so an unrecognised one is simply ignored. */
function readHint(raw: unknown, resolve: (value: string) => boolean): string | null {
  if (typeof raw !== 'string') return null;

  const value = raw.trim();
  if (!value || value.length > MAX_HINT_CHARS) return null;

  return resolve(value) ? value : null;
}

/**
 * Validates an already-parsed body.
 *
 * Unknown extra properties are ignored rather than rejected — only the three
 * fields below are ever read, so nothing else can influence the analysis.
 */
export function parseAnalyzeRequest(body: unknown): AnalyzeRequestResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, message: 'That request could not be read.' };
  }

  const source = body as Record<string, unknown>;

  if (typeof source.input !== 'string') {
    return { ok: false, message: STUDIO_EMPTY_INPUT_MESSAGE };
  }

  if (source.input.trim().length === 0) {
    return { ok: false, message: STUDIO_EMPTY_INPUT_MESSAGE };
  }

  if (source.input.length > STUDIO_INPUT_MAX_LENGTH) {
    return {
      ok: false,
      message: `That idea is longer than ${STUDIO_INPUT_MAX_LENGTH} characters. Please shorten it.`,
    };
  }

  return {
    ok: true,
    value: {
      // Sent to the provider exactly as written, minus surrounding whitespace.
      input: source.input.trim(),
      categorySlug: readHint(source.categoryHint, (value) => findQuickCategory(value) !== null),
      templateId: readHint(source.templateId, (value) => findTemplate(value) !== null),
    },
  };
}

/**
 * Reads and validates the request body.
 *
 * The body is measured as text before it is parsed, so an oversized payload is
 * refused without being turned into objects first.
 */
export async function readAnalyzeRequest(request: Request): Promise<AnalyzeRequestResult> {
  let raw: string;

  try {
    raw = await request.text();
  } catch {
    return { ok: false, message: 'That request could not be read.' };
  }

  if (raw.length > MAX_REQUEST_BODY_CHARS) {
    return { ok: false, message: 'That request was too large.' };
  }

  try {
    return parseAnalyzeRequest(JSON.parse(raw));
  } catch {
    return { ok: false, message: 'That request could not be read.' };
  }
}
