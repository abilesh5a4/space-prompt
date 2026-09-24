'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { AuthDivider } from '@/components/auth/auth-divider';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMessage('Supabase environment variables are missing. Please check SUPABASE_SETUP.md.');
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createBrowserClient();

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setErrorMessage('Invalid email or password. Please try again.');
        } else {
          setErrorMessage(error.message);
        }
        setIsLoading(false);
        return;
      }

      router.push(returnUrl);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during login.';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* OAuth Buttons */}
      <OAuthButtons onError={(msg) => setErrorMessage(msg)} />

      {/* Divider */}
      <AuthDivider />

      {/* Email/Password Form */}
      <form onSubmit={handleLogin} className="space-y-4 text-left">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Email Address</label>
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <Link 
              href="/forgot-password" 
              className="text-[11px] font-medium text-emerald-400 hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          className="w-full mt-2 font-bold"
        >
          <span>Sign In</span>
        </Button>
      </form>

      {/* Footer Link */}
      <div className="pt-2 text-center text-xs text-slate-400">
        Don&apos;t have an account?{' '}
        <Link
          href={returnUrl !== '/dashboard' ? `/signup?returnUrl=${encodeURIComponent(returnUrl)}` : '/signup'}
          className="text-emerald-400 font-semibold hover:underline"
        >
          Create one
        </Link>
      </div>
    </div>
  );
}

