'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Check, Copy } from 'lucide-react';

export interface StudioResultProps {
  promptText: string;
  title: string;
  savedPromptId?: string;
  isLatestPrompt: boolean;
  onSave: (promptText: string) => Promise<string | undefined>;
  onRefine: (mode: 'shorter' | 'detailed' | 'creative') => void;
}

export function StudioResult({
  promptText,
  savedPromptId,
  isLatestPrompt,
  onSave,
  onRefine,
}: StudioResultProps) {
  const [copied, setCopied] = useState(false);
  const [currentSavedId, setCurrentSavedId] = useState<string | undefined>(savedPromptId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [displayedText, setDisplayedText] = useState(() => (isLatestPrompt ? '' : promptText));

  // Progressive text reveal for latest newly generated prompts
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isLatestPrompt || prefersReducedMotion || promptText.length < 20) {
      Promise.resolve().then(() => setDisplayedText(promptText));
      return;
    }

    let currentIndex = 0;
    const step = Math.max(1, Math.floor(promptText.length / 35));

    const interval = setInterval(() => {
      currentIndex += step;
      if (currentIndex >= promptText.length) {
        setDisplayedText(promptText);
        clearInterval(interval);
      } else {
        setDisplayedText(promptText.slice(0, currentIndex));
      }
    }, 16);

    return () => clearInterval(interval);
  }, [promptText, isLatestPrompt]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const handleSaveClick = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const id = await onSave(promptText);
      if (id) {
        setCurrentSavedId(id);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      } else {
        setSaveError("Couldn't save prompt.");
      }
    } catch {
      setSaveError("Couldn't save prompt.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3 max-w-2xl">
      <p className="text-[13px] font-medium text-[#A1A1AA]">Here&apos;s a prompt tailored to your request:</p>

      <div className="rounded-2xl border border-[#29292B] bg-[#181819] p-4 text-[15px] text-[#F4F4F5] leading-relaxed whitespace-pre-wrap font-sans shadow-xs">
        {displayedText}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#29292B] bg-[#181819] hover:bg-[#29292B] text-[#F4F4F5] transition-colors cursor-pointer"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-[#A1A1AA]" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>

        <button
          type="button"
          onClick={handleSaveClick}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#29292B] bg-[#181819] hover:bg-[#29292B] text-[#F4F4F5] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Bookmark className="h-3.5 w-3.5 text-[#38BDF8]" />
          <span>{isSaving ? 'Saving...' : currentSavedId ? 'Saved' : 'Save'}</span>
        </button>

        {saveSuccess && <span className="text-xs text-[#38BDF8]">Saved to history</span>}
        {saveError && <span className="text-xs text-red-400">{saveError}</span>}
      </div>

      {isLatestPrompt && (
        <div className="pt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onRefine('shorter')}
            className="px-3.5 py-1.5 rounded-xl text-[13px] font-medium border border-[#29292B] bg-[#181819] text-[#F4F4F5] hover:border-[#38BDF8]/60 hover:bg-[#242424] transition-all cursor-pointer"
          >
            Make it short
          </button>
          <button
            type="button"
            onClick={() => onRefine('detailed')}
            className="px-3.5 py-1.5 rounded-xl text-[13px] font-medium border border-[#29292B] bg-[#181819] text-[#F4F4F5] hover:border-[#38BDF8]/60 hover:bg-[#242424] transition-all cursor-pointer"
          >
            Make it more detailed
          </button>
          <button
            type="button"
            onClick={() => onRefine('creative')}
            className="px-3.5 py-1.5 rounded-xl text-[13px] font-medium border border-[#29292B] bg-[#181819] text-[#F4F4F5] hover:border-[#38BDF8]/60 hover:bg-[#242424] transition-all cursor-pointer"
          >
            Creative
          </button>
        </div>
      )}
    </div>
  );
}
