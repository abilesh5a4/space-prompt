'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Bookmark,
  Check,
  Copy,
  Edit2,
  Eye,
  Save,
  Sliders,
  Star,
  Trash2,
  Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { promptCategoryLabel } from '@/lib/categories';
import { requestDeletePrompt, requestSavePrompt, requestToggleFavorite } from '@/lib/prompts-client';
import { requestPromptRefinement } from '@/lib/refine-client';
import { fadeUp } from '@/lib/motion';
import type {
  PromptVariantType,
  RefineMode,
  SavedPrompt,
} from '@/types';

export interface PromptDetailProps {
  prompt: SavedPrompt;
}

const TAB_INFO: Record<
  PromptVariantType,
  { label: string; tag: string }
> = {
  balanced: { label: 'Balanced', tag: 'Recommended Default' },
  detailed: { label: 'Detailed', tag: 'Deep Context & Guidance' },
  expert: { label: 'Expert', tag: 'Advanced AI Optimization' },
};

const REFINE_MODES: { mode: RefineMode; label: string }[] = [
  { mode: 'shorter', label: 'Make Shorter' },
  { mode: 'detailed', label: 'Make More Detailed' },
  { mode: 'technical', label: 'Make Technical' },
  { mode: 'beginner', label: 'Beginner Friendly' },
  { mode: 'creative', label: 'Make Creative' },
  { mode: 'constraints', label: 'Add Constraints' },
  { mode: 'structure', label: 'Improve Structure' },
  { mode: 'custom', label: 'Custom Instruction' },
];

export function PromptDetail({ prompt: initialPrompt }: PromptDetailProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState<SavedPrompt>(initialPrompt);
  const [activeTab, setActiveTab] = useState<PromptVariantType>('balanced');
  const [copied, setCopied] = useState(false);

  // Favorite state
  const [isFavorite, setIsFavorite] = useState(initialPrompt.isFavorite);
  const [isTogglingFav, setIsTogglingFav] = useState(false);

  // Local prompts editable copy
  const [localPrompts, setLocalPrompts] = useState<Record<PromptVariantType, string>>({
    balanced: initialPrompt.balancedPrompt,
    detailed: initialPrompt.detailedPrompt,
    expert: initialPrompt.expertPrompt,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Delete modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refinement state
  const [selectedRefineMode, setSelectedRefineMode] = useState<RefineMode>('shorter');
  const [customInstruction, setCustomInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [previewRefinement, setPreviewRefinement] = useState<{
    prompt: string;
    summary: string;
  } | null>(null);

  const activePromptText = localPrompts[activeTab];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activePromptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback silent
    }
  };

  const handleToggleFav = async () => {
    if (isTogglingFav) return;
    setIsTogglingFav(true);
    const nextFav = !isFavorite;
    setIsFavorite(nextFav);

    const res = await requestToggleFavorite(prompt.id, nextFav);
    setIsTogglingFav(false);

    if (!res.ok) {
      setIsFavorite(!nextFav);
    }
  };

  const handleSaveDb = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    const res = await requestSavePrompt({
      id: prompt.id,
      title: prompt.title,
      originalInput: prompt.originalInput,
      category: prompt.category,
      context: prompt.context,
      balancedPrompt: localPrompts.balanced,
      detailedPrompt: localPrompts.detailed,
      expertPrompt: localPrompts.expert,
      isFavorite,
    });

    setIsSaving(false);

    if (res.ok) {
      setPrompt(res.prompt);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError("Couldn't save changes.");
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    const res = await requestDeletePrompt(prompt.id);
    setIsDeleting(false);

    if (res.ok) {
      router.push('/history');
    }
  };

  const handleRunRefinement = async () => {
    if (isRefining) return;
    if (selectedRefineMode === 'custom' && !customInstruction.trim()) {
      setRefineError('Please enter custom instruction.');
      return;
    }

    setIsRefining(true);
    setRefineError(null);

    const res = await requestPromptRefinement({
      prompt: activePromptText,
      mode: selectedRefineMode,
      instruction: selectedRefineMode === 'custom' ? customInstruction.trim() : undefined,
      context: prompt.context,
    });

    setIsRefining(false);

    if (res.ok) {
      setPreviewRefinement({
        prompt: res.refinedPrompt,
        summary: res.summaryOfChanges,
      });
    } else {
      setRefineError(res.error.message || 'Failed to refine.');
    }
  };

  const handleApplyRefinement = () => {
    if (!previewRefinement) return;
    setLocalPrompts((prev) => ({
      ...prev,
      [activeTab]: previewRefinement.prompt,
    }));
    setPreviewRefinement(null);
  };

  const formattedDate = new Date(prompt.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/history">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to History</span>
          </Button>
        </Link>
      </div>

      {/* Main Details Header Card */}
      <Card variant="elevated" className="space-y-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <Bookmark className="h-5 w-5 text-emerald-400" aria-hidden="true" />
              <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl break-words">
                {prompt.title}
              </h1>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
              <Badge variant="outline">{promptCategoryLabel(prompt.category)}</Badge>
              <span>Saved on {formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggleFav}
              aria-label={isFavorite ? 'Unfavorite prompt' : 'Favorite prompt'}
              className="gap-1.5"
            >
              <Star
                className={`h-4 w-4 ${
                  isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                }`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">{isFavorite ? 'Favorited' : 'Favorite'}</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveDb}
              disabled={isSaving}
              className="gap-1.5"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Delete prompt"
              className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {saveSuccess && (
          <p className="text-xs font-medium text-emerald-400">
            Changes saved to database successfully!
          </p>
        )}
        {saveError && <p className="text-xs font-medium text-rose-400">{saveError}</p>}

        {/* Original Idea Summary */}
        <details className="rounded-xl border border-slate-800 bg-[#0E1420] px-4 py-3 text-xs text-slate-300">
          <summary className="cursor-pointer font-medium text-slate-400 hover:text-slate-200">
            Original User Input
          </summary>
          <p className="mt-2 text-slate-300 whitespace-pre-wrap leading-relaxed">
            {prompt.originalInput}
          </p>
        </details>

        {/* Variant Tabs */}
        <div className="border-b border-slate-800 pb-2">
          <div role="tablist" aria-label="Saved Prompt Variant Tabs" className="flex flex-wrap gap-2">
            {(['balanced', 'detailed', 'expert'] as const).map((tabKey) => {
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  id={`tab-saved-${tabKey}`}
                  onClick={() => {
                    setActiveTab(tabKey);
                    setPreviewRefinement(null);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 ${
                    isActive
                      ? 'border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 shadow-sm'
                      : 'border border-transparent bg-slate-800/40 text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                  }`}
                >
                  <span>{TAB_INFO[tabKey].label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            <span className="font-medium text-slate-300">{TAB_INFO[activeTab].tag}</span>
          </p>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
              className="gap-1.5 text-xs"
            >
              {isEditing ? <Eye className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
              <span>{isEditing ? 'Done Editing' : 'Edit Prompt'}</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Prompt Content Workspace */}
      <Card variant="default" className="p-4 sm:p-6 bg-[#0B0F19] border-slate-800">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={activePromptText}
              onChange={(e) =>
                setLocalPrompts((prev) => ({ ...prev, [activeTab]: e.target.value }))
              }
              rows={16}
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-4 font-mono text-sm text-slate-200 outline-none focus:border-emerald-500/80 focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
        ) : (
          <div className="group relative rounded-xl border border-slate-800/80 bg-[#080C14] p-4 sm:p-5">
            <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-200">
              {activePromptText}
            </pre>
          </div>
        )}
      </Card>

      {/* Phase 14 Refinement Section */}
      <Card variant="default" className="space-y-4 p-5 sm:p-6 border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-cyan-400" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-200">
            Refine {TAB_INFO[activeTab].label} Variant
          </h3>
        </div>

        <div className="flex flex-wrap gap-2">
          {REFINE_MODES.map((item) => (
            <button
              key={item.mode}
              type="button"
              onClick={() => {
                setSelectedRefineMode(item.mode);
                setRefineError(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                selectedRefineMode === item.mode
                  ? 'border border-cyan-500/60 bg-cyan-500/20 text-cyan-300'
                  : 'border border-slate-800 bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {selectedRefineMode === 'custom' && (
          <div className="space-y-2 pt-1">
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="e.g. Replace Firebase with Supabase..."
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3.5 py-2.5 text-sm text-slate-200 placeholder-slate-500 outline-none focus:border-cyan-500/80 focus:ring-2 focus:ring-cyan-500/30"
            />
          </div>
        )}

        {refineError && <p className="text-xs text-rose-400 font-medium">{refineError}</p>}

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleRunRefinement}
            disabled={isRefining}
            className="gap-2 text-xs"
          >
            <Sliders className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{isRefining ? 'Refining...' : 'Apply Refinement'}</span>
          </Button>
        </div>

        {previewRefinement && (
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-3 rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-cyan-400">Refinement Preview</span>
              <span className="text-xs text-slate-400">{previewRefinement.summary}</span>
            </div>

            <pre className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200 rounded-lg bg-slate-900/90 p-3 border border-slate-800">
              {previewRefinement.prompt}
            </pre>

            <div className="flex items-center gap-2 pt-1">
              <Button type="button" variant="primary" size="sm" onClick={handleApplyRefinement} className="gap-1.5 text-xs">
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Use this version (Requires Save Changes)</span>
              </Button>
            </div>
          </motion.div>
        )}
      </Card>

      {/* Destructive Delete Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <Card variant="elevated" className="w-full max-w-md p-6 space-y-4 border-rose-500/30 bg-slate-900">
            <h3 className="text-lg font-semibold text-slate-100">Delete Saved Prompt?</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Are you sure you want to delete &quot;{prompt.title}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleDelete} disabled={isDeleting} className="bg-rose-600 hover:bg-rose-500 text-white">
                {isDeleting ? 'Deleting...' : 'Delete Prompt'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </motion.div>
  );
}
