import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { SpaceOrbitAnimation } from '@/components/ui/space-orbit-animation';

export default async function Home() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/studio');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0D0D0D] text-[#F2F2F2] px-4 py-12 text-center relative overflow-hidden">
      <div className="w-full max-w-sm space-y-8 z-10">
        {/* Space Orbit Animated Graphic */}
        <div className="flex flex-col items-center gap-4">
          <SpaceOrbitAnimation size="xl" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight text-[#F2F2F2]">
              Space Prompt
            </h1>
            <p className="text-xs text-[#8E8E93]">
              Turn ideas into better prompts.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <Link href="/login" className="block w-full">
            <Button
              variant="primary"
              size="md"
              className="w-full gap-2 bg-[#38BDF8] hover:bg-[#0284C7] text-slate-950 font-medium rounded-xl py-2.5"
            >
              <span>Sign In to Space Prompt</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>

          <Link href="/signup" className="block w-full">
            <Button
              variant="outline"
              size="md"
              className="w-full border-[#262626] bg-[#141414] hover:bg-[#1A1A1A] text-[#F2F2F2] rounded-xl py-2.5"
            >
              <span>Create Account</span>
            </Button>
          </Link>
        </div>

        <p className="text-[11px] text-[#636366]">
          Multi-variant prompt clarification & optimization assistant.
        </p>
      </div>
    </div>
  );
}
