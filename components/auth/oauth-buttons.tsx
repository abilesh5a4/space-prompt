'use client';

import React, { useState } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured } from '@/lib/supabase';

interface OAuthButtonsProps {
  onError?: (msg: string) => void;
}

export function OAuthButtons({ onError }: OAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    try {
      setLoadingProvider(provider);

      if (!isSupabaseConfigured()) {
        onError?.('Supabase environment variables are missing or unconfigured. Please check SUPABASE_SETUP.md.');
        setLoadingProvider(null);
        return;
      }

      const supabase = createBrowserClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        onError?.(error.message);
        setLoadingProvider(null);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected OAuth error occurred.';
      onError?.(message);
      setLoadingProvider(null);
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Google Button */}
      <Button
        type="button"
        variant="secondary"
        size="md"
        disabled={loadingProvider !== null}
        isLoading={loadingProvider === 'google'}
        onClick={() => handleOAuthLogin('google')}
        className="w-full gap-2 text-xs font-semibold"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.9C6.2 7.2 8.8 5 12 5z"
          />
          <path
            fill="#4285F4"
            d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
          />
          <path
            fill="#FBBC05"
            d="M5.3 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.6 6.3C.6 8.3 0 10.1 0 12s.6 3.7 1.6 5.7l3.7-2.9z"
          />
          <path
            fill="#34A853"
            d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.2 0-5.8-2.2-6.7-5.3L1.6 16c1.9 3.8 5.8 7 10.4 7z"
          />
        </svg>
        <span>Google</span>
      </Button>

      {/* GitHub Button */}
      <Button
        type="button"
        variant="secondary"
        size="md"
        disabled={loadingProvider !== null}
        isLoading={loadingProvider === 'github'}
        onClick={() => handleOAuthLogin('github')}
        className="w-full gap-2 text-xs font-semibold"
      >
        <svg className="w-4 h-4 shrink-0 fill-current text-slate-100" viewBox="0 0 24 24">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
        <span>GitHub</span>
      </Button>
    </div>
  );
}
