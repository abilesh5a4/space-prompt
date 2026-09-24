'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2, Check, X } from 'lucide-react';
import { requestFetchPrompts, requestUpdatePrompt, requestDeletePrompt } from '@/lib/prompts-client';
import type { SavedPrompt } from '@/types';

export function SidebarRecents({ onNavigate }: { onNavigate?: () => void }) {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const activePromptId = searchParams.get('promptId');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRecents = async () => {
      const res = await requestFetchPrompts();
      if (res.ok && isMounted) {
        setPrompts(res.prompts.slice(0, 20));
      }
      if (isMounted) setLoading(false);
    };

    void fetchRecents();

    const handleUpdate = () => {
      void fetchRecents();
    };

    window.addEventListener('spaceprompt:recents-updated', handleUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('spaceprompt:recents-updated', handleUpdate);
    };
  }, []);

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartRename = (prompt: SavedPrompt, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setEditingId(prompt.id);
    setEditTitle(prompt.title);
  };

  const handleSaveRename = async (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingId(null);
      return;
    }

    setPrompts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, title: trimmed } : p)),
    );
    setEditingId(null);

    const res = await requestUpdatePrompt(id, { title: trimmed });
    if (res.ok) {
      window.dispatchEvent(new CustomEvent('spaceprompt:recents-updated'));
    } else {
      window.dispatchEvent(new CustomEvent('spaceprompt:recents-updated'));
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveMenuId(null);
    setDeletingId(id);
  };

  const confirmDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setPrompts((prev) => prev.filter((p) => p.id !== id));
    setDeletingId(null);

    const res = await requestDeletePrompt(id);
    if (res.ok) {
      window.dispatchEvent(new CustomEvent('spaceprompt:recents-updated'));
    } else {
      window.dispatchEvent(new CustomEvent('spaceprompt:recents-updated'));
    }
  };

  const handlePromptClick = (id: string) => {
    if (editingId || deletingId) return;
    router.push(`/studio?promptId=${id}`);
    if (onNavigate) onNavigate();
  };

  if (loading) {
    return (
      <div className="space-y-2 px-3 py-2">
        <div className="h-3 w-16 bg-[#1C1C1D] rounded-md animate-pulse" />
        <div className="h-7 w-full bg-[#1C1C1D] rounded-lg animate-pulse" />
        <div className="h-7 w-full bg-[#1C1C1D] rounded-lg animate-pulse" />
      </div>
    );
  }

  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1 py-2">
      <h3 className="px-3 text-[11px] font-semibold text-[#71717A] tracking-wider uppercase">
        Recents
      </h3>

      <div className="space-y-0.5">
        {prompts.map((p) => {
          const isActive = activePromptId === p.id;
          const isEditing = editingId === p.id;
          const isDeleting = deletingId === p.id;
          const isMenuOpen = activeMenuId === p.id;

          if (isEditing) {
            return (
              <form
                key={p.id}
                onSubmit={(e) => handleSaveRename(p.id, e)}
                className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#1C1C1D] border border-[#38BDF8]/50"
              >
                <input
                  type="text"
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  className="flex-1 bg-transparent text-xs text-[#F4F4F5] outline-none px-1"
                  maxLength={80}
                />
                <button
                  type="submit"
                  className="p-1 text-[#38BDF8] hover:text-white"
                  title="Save"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="p-1 text-[#71717A] hover:text-white"
                  title="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </form>
            );
          }

          if (isDeleting) {
            return (
              <div
                key={p.id}
                className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-300"
              >
                <span className="truncate text-[12px]">Delete chat?</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => confirmDelete(p.id, e)}
                    className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[11px] font-medium hover:bg-red-500"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingId(null);
                    }}
                    className="px-2 py-0.5 rounded-md bg-[#29292B] text-[#F4F4F5] text-[11px] hover:bg-[#333336]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={p.id}
              onClick={() => handlePromptClick(p.id)}
              className={`group relative flex items-center justify-between min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[#1C1C1D] text-[#F4F4F5]'
                  : 'text-[#A1A1AA] hover:bg-[#181819] hover:text-[#F4F4F5]'
              }`}
            >
              <span className="truncate pr-5 text-[13px]">{p.title}</span>

              {/* 3-Dot Action Button */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(isMenuOpen ? null : p.id);
                  }}
                  className={`p-1 rounded-lg text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#29292B] transition-opacity ${
                    isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 lg:opacity-0 focus:opacity-100'
                  }`}
                  aria-label="Options"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>

                {/* Context Menu Dropdown */}
                {isMenuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-6 z-50 w-32 rounded-xl border border-[#29292B] bg-[#181819] p-1 shadow-xl space-y-0.5"
                  >
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(p, e)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-[#F4F4F5] hover:bg-[#29292B] text-left"
                    >
                      <Pencil className="h-3.5 w-3.5 text-[#A1A1AA]" />
                      <span>Rename</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(p.id, e)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-950/40 text-left"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
