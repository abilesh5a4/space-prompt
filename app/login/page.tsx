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
  return <Skeleton className="h-12 w-full rounded-2xl" />;
}

export default function LoginPage() {
  return (
    <AuthShell>
      <Suspense fallback={<LoginFormFallback />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
