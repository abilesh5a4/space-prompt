'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { FileSearch, Search, Copy, Trash2, ExternalLink, Check, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { requestDeletePrompt } from '@/lib/prompts-client';
import type { SavedPrompt } from '@/types';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date);
}

export function HistoryView({ initialPrompts }: { initialPrompts: SavedPrompt[] }) {
  const [prompts, setPrompts] = useState<SavedPrompt[]>(initialPrompts);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredPrompts = prompts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.originalInput.toLowerCase().includes(q)
    );
  });

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTargetId) return;
    setIsDeleting(true);
    const success = await requestDeletePrompt(deleteTargetId);
    if (success) {
      setPrompts((prev) => prev.filter((p) => p.id !== deleteTargetId));
    }
    setIsDeleting(false);
    setDeleteTargetId(null);
  };

  if (prompts.length === 0) {
    return (
      <EmptyState
        icon={FileSearch}
        title="No saved sessions yet."
        description="Saved prompts will appear here in your session history."
        action={
          <Link href="/studio">
            <Button
              variant="primary"
              size="md"
              className="bg-[#38BDF8] hover:bg-[#0284C7] text-slate-950 font-medium rounded-xl text-xs px-4"
            >
              New Prompt
            </Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page Title */}
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-[#F2F2F2]">History</h1>
        <p className="text-xs text-[#8E8E93]">Your previous prompt creation sessions.</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <label htmlFor="history-search" className="sr-only">
          Search prompt sessions
        </label>
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
          <Search className="h-4 w-4 text-[#8E8E93]" />
        </div>
        <input
          id="history-search"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search history by title or prompt details..."
          className="w-full rounded-2xl border border-[#262626] bg-[#141414] py-2.5 pl-10 pr-4 text-xs text-[#F2F2F2] placeholder-[#8E8E93] focus:border-[#38BDF8]/50 focus:outline-none transition-all shadow-sm"
        />
      </div>

      {/* History list */}
      {filteredPrompts.length === 0 ? (
        <div className="rounded-2xl border border-[#262626] p-8 text-center bg-[#141414]">
          <p className="text-xs text-[#8E8E93]">
            No prompt sessions found matching &quot;{searchQuery}&quot;.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className="p-3.5 sm:p-4 flex items-center justify-between gap-4 rounded-xl border border-[#262626] bg-[#141414] hover:bg-[#1A1A1A] transition-all shadow-xs"
            >
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-[#38BDF8] shrink-0" />
                  <Link href={`/history/${prompt.id}`} className="min-w-0">
                    <h3 className="text-xs font-semibold text-[#F2F2F2] hover:text-[#38BDF8] transition-colors truncate">
                      {prompt.title}
                    </h3>
                  </Link>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-[#8E8E93] pl-5">
                  <span className="truncate max-w-[280px] sm:max-w-[420px]">
                    {prompt.originalInput}
                  </span>
                  <span>•</span>
                  <span className="shrink-0">{formatDate(prompt.createdAt)}</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(prompt.id, prompt.balancedPrompt)}
                  className="p-1.5 text-[#8E8E93] hover:text-[#F2F2F2] rounded-lg transition-colors"
                  aria-label="Copy prompt"
                >
                  {copiedId === prompt.id ? (
                    <Check className="h-3.5 w-3.5 text-[#38BDF8]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>

                <Link href={`/history/${prompt.id}`}>
                  <button
                    type="button"
                    className="p-1.5 text-[#8E8E93] hover:text-[#F2F2F2] rounded-lg transition-colors"
                    aria-label="Open session"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </Link>

                <button
                  type="button"
                  onClick={() => setDeleteTargetId(prompt.id)}
                  className="p-1.5 text-[#8E8E93] hover:text-red-400 rounded-lg transition-colors"
                  aria-label={`Delete ${prompt.title}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-sm rounded-2xl border border-[#262626] bg-[#141414] p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-semibold text-[#F2F2F2]">Delete Prompt Session</h3>
            <p className="text-xs text-[#8E8E93]">
              Are you sure you want to delete this prompt session from your history?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-xl border border-[#262626] bg-[#1A1A1A] hover:bg-[#242424] text-xs font-medium text-[#F2F2F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
