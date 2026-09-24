import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getPrompts } from '@/lib/supabase/prompts';
import { HistoryView } from '@/components/prompt/history-view';

export const metadata: Metadata = {
  title: 'Space Prompt',
  description: 'Turn ideas into better prompts.',
};

export default async function HistoryPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const prompts = await getPrompts();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <HistoryView initialPrompts={prompts} />
    </div>
  );
}
