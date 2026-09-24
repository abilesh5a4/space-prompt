'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { OAuthButtons } from '@/components/auth/oauth-buttons';
import { AuthDivider } from '@/components/auth/auth-divider';
import { Eye, EyeOff, AlertCircle, Mail } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase';

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccessConfirmation, setIsSuccessConfirmation] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrorMessage('Supabase environment variables are missing. Please check SUPABASE_SETUP.md.');
      return;
    }

    try {
      setIsLoading(true);
      const supabase = createBrowserClient();
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
          },
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      // If user session is created immediately (email confirmation disabled in Supabase)
      if (data.session) {
        router.push(returnUrl);
        router.refresh();
      } else {
        // If email confirmation is required
        setIsSuccessConfirmation(true);
        setIsLoading(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during account creation.';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  if (isSuccessConfirmation) {
    return (
      <div className="space-y-5 text-center py-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Mail className="w-6 h-6 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Check your inbox</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
            We sent a confirmation link to <span className="text-emerald-400 font-semibold">{email}</span>.
            Please click the link to activate your Space Prompt account.
          </p>
        </div>

        <div className="pt-3 border-t border-slate-800">
          <Link href={returnUrl !== '/dashboard' ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login'}>
            <Button variant="outline" size="md" className="w-full text-xs">
              Return to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

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

      {/* Email/Password Signup Form */}
      <form onSubmit={handleSignup} className="space-y-3.5 text-left">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Full Name</label>
          <Input
            type="text"
            placeholder="Alex Rivera"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="name"
          />
        </div>

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
          <label className="text-xs font-semibold text-slate-300">Password (min 6 chars)</label>
          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              required
              autoComplete="new-password"
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

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
          <Input
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            required
            autoComplete="new-password"
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isLoading}
          className="w-full mt-2 font-bold"
        >
          <span>Create Account</span>
        </Button>
      </form>

      {/* Footer Link */}
      <div className="pt-2 text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link
          href={returnUrl !== '/dashboard' ? `/login?returnUrl=${encodeURIComponent(returnUrl)}` : '/login'}
          className="text-emerald-400 font-semibold hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

