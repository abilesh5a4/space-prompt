import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getUserDisplayData } from '@/lib/user';
import { SettingsView } from '@/components/settings/settings-view';

export const metadata: Metadata = {
  title: 'Space Prompt',
  description: 'Turn ideas into better prompts.',
};

export default async function SettingsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const displayUser = getUserDisplayData(user);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <SettingsView user={displayUser} />
    </div>
  );
}
