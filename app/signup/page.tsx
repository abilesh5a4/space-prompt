import { Suspense } from 'react';
import { Metadata } from 'next';
import { AuthShell } from '@/components/auth/auth-shell';
import { SignupForm } from '@/components/auth/signup-form';
import { Skeleton } from '@/components/ui/loading';

export const metadata: Metadata = {
  title: 'Space Prompt',
  description: 'Turn ideas into better prompts.',
};

function SignupFormFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account."
      subtitle="Start turning rough ideas into powerful prompts."
    >
      <Suspense fallback={<SignupFormFallback />}>
        <SignupForm />
      </Suspense>
    </AuthShell>
  );
}

