import { Suspense } from 'react';
import { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { LoginForm } from '@/components/auth/login-form';
import { Skeleton } from '@/components/ui/loading';

export const metadata: Metadata = {
  title: 'Space Prompt',
  description: 'Turn ideas into better prompts.',
};

function LoginFormFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthShell
      title="Welcome back."
      subtitle="Sign in to continue building better prompts."
    >
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
