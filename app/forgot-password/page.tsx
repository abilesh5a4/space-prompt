'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/auth-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
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

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/callback?next=/settings`,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      setIsLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred sending reset instructions.';
      setErrorMessage(msg);
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset Password"
      subtitle="Enter your email to receive password recovery instructions."
    >
      {isSuccess ? (
        <div className="space-y-4 text-center py-2">
          <div className="mx-auto w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            If an account exists for <span className="text-emerald-400 font-semibold">{email}</span>, password reset instructions have been sent.
          </p>
          <Link href="/login">
            <Button variant="outline" size="md" className="w-full text-xs mt-2">
              Back to Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4 text-left">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300">Email Address</label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <Button type="submit" variant="primary" size="md" isLoading={isLoading} className="w-full font-bold">
            Send Reset Link
          </Button>

          <div className="pt-2 text-center text-xs text-slate-400">
            Remembered your password?{' '}
            <Link href="/login" className="text-emerald-400 font-semibold hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
