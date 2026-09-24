import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getPromptById } from '@/lib/supabase/prompts';
import { PageShell } from '@/components/app/page-header';
import { PromptDetail } from '@/components/prompt/prompt-detail';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Space Prompt',
    description: 'Turn ideas into better prompts.',
  };
}

export default async function SavedPromptDetailPage({ params }: Props) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { id } = await params;
  const prompt = await getPromptById(id);

  if (!prompt) {
    notFound();
  }

  return (
    <PageShell width="default" className="py-6">
      <PromptDetail prompt={prompt} />
    </PageShell>
  );
}
