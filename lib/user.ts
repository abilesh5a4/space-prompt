import type { User } from '@supabase/supabase-js';
import type { UserDisplayData } from '@/types';

/**
 * Supabase types `user_metadata` values as `any`, so every read is narrowed
 * to a non-empty string before it is trusted.
 */
function readString(source: Record<string, unknown> | undefined, key: string): string | null {
  const value = source?.[key];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Only accept absolute https avatar URLs. Guards against a hostile provider
 * value being interpolated into markup or a CSS `url()`.
 */
function safeAvatarUrl(source: Record<string, unknown> | undefined): string | null {
  const candidate = readString(source, 'avatar_url') ?? readString(source, 'picture');
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** Up to two uppercase letters, e.g. "Ada Lovelace" -> "AL", "ada" -> "A". */
function initialsFrom(name: string): string {
  const letters = name
    .split(/[\s._-]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .filter((char) => /\p{L}/u.test(char));

  if (letters.length === 0) return 'U';
  return letters.slice(0, 2).join('').toUpperCase();
}

/**
 * Resolves the user-facing display data for an authenticated Supabase user.
 *
 * Name priority: `full_name` -> `name` -> email prefix -> `"User"`.
 *
 * The returned object is intentionally the only user data handed to client
 * components: no Supabase id, no tokens, no provider metadata.
 */
export function getUserDisplayData(user: User): UserDisplayData {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const email = readString({ email: user.email }, 'email') ?? '';
  const emailPrefix = email.includes('@') ? email.split('@')[0] : null;

  const name =
    readString(metadata, 'full_name') ??
    readString(metadata, 'name') ??
    (emailPrefix && emailPrefix.length > 0 ? emailPrefix : null) ??
    'User';

  return {
    name,
    email,
    initials: initialsFrom(name),
    avatarUrl: safeAvatarUrl(metadata),
  };
}
