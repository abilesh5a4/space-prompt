import React from 'react';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getUserDisplayData } from '@/lib/user';
import { AppSidebar } from '@/components/app/app-sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const displayUser = getUserDisplayData(user);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#0D0D0D] text-[#F2F2F2]">
      <AppSidebar user={displayUser} />

      <main className="flex-1 min-w-0 h-full overflow-y-auto relative bg-[#0D0D0D]">
        {children}
      </main>
    </div>
  );
}
