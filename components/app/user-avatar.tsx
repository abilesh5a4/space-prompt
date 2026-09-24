import type { UserDisplayData } from '@/types';

const sizes = {
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-14 w-14 text-lg',
} as const;

export interface UserAvatarProps {
  user: UserDisplayData;
  size?: keyof typeof sizes;
  className?: string;
}

/**
 * Avatar for the signed-in user, falling back to initials.
 *
 * Rendered as a background image rather than an `<img>`: the URL comes from an
 * OAuth provider, so it cannot be enumerated ahead of time in
 * `images.remotePatterns`, and `next/image` would fail at runtime on an
 * unconfigured host. `avatarUrl` is already validated as an absolute https URL
 * in `lib/user.ts`, so it is safe to interpolate here.
 *
 * Decorative by design — the display name is always rendered alongside it.
 */
export function UserAvatar({ user, size = 'md', className = '' }: UserAvatarProps) {
  const base = `shrink-0 rounded-full border overflow-hidden ${sizes[size]} ${className}`;

  if (user.avatarUrl) {
    return (
      <span
        aria-hidden="true"
        role="presentation"
        className={`${base} border-slate-700/70 bg-[#182338] bg-cover bg-center`}
        style={{ backgroundImage: `url("${user.avatarUrl}")` }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${base} flex items-center justify-center border-emerald-500/30 bg-emerald-500/10 font-semibold text-emerald-400`}
    >
      {user.initials}
    </span>
  );
}
