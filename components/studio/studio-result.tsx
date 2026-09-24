'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bookmark,
  Check,
  Copy,
  Edit2,
  Eye,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { PromptQualityCard } from '@/components/studio/prompt-quality-card';
import { requestSavePrompt } from '@/lib/prompts-client';
import { requestPromptRefinement } from '@/lib/refine-client';
import { fadeUp } from '@/lib/motion';

import type {
  PromptSession,
  PromptVariants,
  PromptVariantType,
  RefineMode,
} from '@/types';

export interface StudioResultProps {
  session: PromptSession;
  variants: PromptVariants;
  onRegenerate: () => void;
  onBackToContext: () => void;
  onStartOver: () => void;
}

const TAB_INFO: Record<
  PromptVariantType,
  { label: string; tag: string; description: string }
> = {
  balanced: {
    label: 'Balanced',
    tag: 'Recommended Default',
    description: 'Optimal balance of role, objective, requirements, and constraints.',
  },
  detailed: {
    label: 'Detailed',
    tag: 'Deep Context & Guidance',
    description: 'Includes background context, step-by-step instructions, and deliverables.',
  },
  expert: {
    label: 'Expert',
    tag: 'Advanced AI Optimization',
    description: 'Includes strict constraints, validation criteria, assumptions, and edge cases.',
  },
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

export function StudioResult({
  session,
  variants,
}: StudioResultProps) {
  const [activeTab, setActiveTab] = useState<PromptVariantType>('balanced');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Persistence state
  const [savedId, setSavedId] = useState<string | undefined>(session.savedPromptId);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Local editable copies per variant
  const [localPrompts, setLocalPrompts] = useState<Record<PromptVariantType, string>>({
    balanced: variants.balanced.prompt,
    detailed: variants.detailed.prompt,
    expert: variants.expert.prompt,
  });

  const [isEditing, setIsEditing] = useState(false);

  // Evaluation state
  const [evaluations, setEvaluations] = useState<Record<PromptVariantType, import('@/types').PromptEvaluation | null>>({
    balanced: null,
    detailed: null,
    expert: null,
  });
  const [evalStale, setEvalStale] = useState<Record<PromptVariantType, boolean>>({
    balanced: false,
    detailed: false,
    expert: false,
  });
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Refinement state
  const [selectedRefineMode, setSelectedRefineMode] = useState<RefineMode>('shorter');
  const [customInstruction, setCustomInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [previewRefinement, setPreviewRefinement] = useState<{
    prompt: string;
    summary: string;
    previousPrompt: string;
  } | null>(null);

  const activePromptText = localPrompts[activeTab];
  const sessionTitle = session.title || variants.balanced.title || 'Generated Prompt';

  const handleRunEvaluation = async () => {
    if (isEvaluating) return;
    setIsEvaluating(true);
    setEvalError(null);

    const { requestPromptEvaluation } = await import('@/lib/evaluate-client');
    const res = await requestPromptEvaluation({
      prompt: activePromptText,
      context: session.context,
      variant: activeTab,
    });

    setIsEvaluating(false);

    if (res.ok) {
      setEvaluations((prev) => ({ ...prev, [activeTab]: res.evaluation }));
      setEvalStale((prev) => ({ ...prev, [activeTab]: false }));
    } else {
      setEvalError(res.error.message || 'Failed to evaluate prompt quality.');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activePromptText);
      setCopied(true);
      setCopyError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError('Failed to copy to clipboard.');
      setTimeout(() => setCopyError(null), 3000);
    }
  };

  const handleSave = async () => {
    if (!session.context || isSaving) return;
    setIsSaving(true);
    setSaveError(null);

    const res = await requestSavePrompt({
      id: savedId,
      title: sessionTitle,
      originalInput: session.originalInput,
      category: session.context.category,
      context: session.context,
      balancedPrompt: localPrompts.balanced,
      detailedPrompt: localPrompts.detailed,
      expertPrompt: localPrompts.expert,
    });

    setIsSaving(false);

    if (res.ok) {
      setSavedId(res.prompt.id);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError("Couldn't save prompt.");
    }
  };

  const handlePromptTextChange = (text: string) => {
    setLocalPrompts((prev) => ({
      ...prev,
      [activeTab]: text,
    }));
    if (evaluations[activeTab]) {
      setEvalStale((prev) => ({ ...prev, [activeTab]: true }));
    }
  };

  const handleRunRefinement = async () => {
    if (isRefining) return;
    setIsRefining(true);
    setRefineError(null);

    const res = await requestPromptRefinement({
      prompt: activePromptText,
      context: session.context,
      mode: selectedRefineMode,
      instruction: selectedRefineMode === 'custom' ? customInstruction : undefined,
    });

    setIsRefining(false);

    if (res.ok) {
      setPreviewRefinement({
        prompt: res.refinedPrompt,
        summary: res.summaryOfChanges,
        previousPrompt: activePromptText,
      });
    } else {
      setRefineError(res.error.message || 'Failed to refine prompt.');
    }
  };

  const handleApplyRefinement = () => {
    if (!previewRefinement) return;
    handlePromptTextChange(previewRefinement.prompt);
    setPreviewRefinement(null);
  };

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-4">
      {/* Primary Result Container */}
      <div className="rounded-2xl border border-[#262626] bg-[#141414] p-4 sm:p-5 space-y-4 shadow-sm">
        {/* Header & Segmented Variant Control */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#38BDF8]" />
            <h3 className="text-sm font-semibold text-[#F2F2F2]">{sessionTitle}</h3>
          </div>

          {/* Segmented Control */}
          <div className="flex items-center bg-[#1A1A1A] p-1 rounded-xl border border-[#262626]">
            {(['balanced', 'detailed', 'expert'] as const).map((tabKey) => {
              const isActive = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => {
                    setActiveTab(tabKey);
                    setPreviewRefinement(null);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#242424] text-[#F2F2F2] shadow-xs'
                      : 'text-[#8E8E93] hover:text-[#F2F2F2]'
                  }`}
                >
                  {TAB_INFO[tabKey].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#8E8E93]">
          <span>{TAB_INFO[activeTab].description}</span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="px-2.5 py-1.5 rounded-lg border border-[#262626] bg-[#1A1A1A] hover:bg-[#242424] text-[#F2F2F2] flex items-center gap-1.5 transition-colors"
            >
              {isEditing ? <Eye className="h-3.5 w-3.5" /> : <Edit2 className="h-3.5 w-3.5" />}
              <span>{isEditing ? 'Done' : 'Edit'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-2.5 py-1.5 rounded-lg border border-[#262626] bg-[#1A1A1A] hover:bg-[#242424] text-[#F2F2F2] flex items-center gap-1.5 transition-colors"
            >
              <Bookmark className="h-3.5 w-3.5 text-[#38BDF8]" />
              <span>{isSaving ? 'Saving...' : savedId ? 'Saved' : 'Save'}</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-[#38BDF8] text-slate-950 font-medium hover:bg-[#0284C7] flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {saveSuccess && (
          <p className="text-xs text-[#38BDF8]">Prompt saved to history!</p>
        )}
        {saveError && <p className="text-xs text-red-400">{saveError}</p>}
        {copyError && <p className="text-xs text-red-400">{copyError}</p>}

        {/* Prompt Content */}
        <div className="rounded-xl border border-[#262626] bg-[#0D0D0D] p-4 text-xs font-mono text-[#F2F2F2] leading-relaxed overflow-x-auto">
          {isEditing ? (
            <textarea
              value={activePromptText}
              onChange={(e) => handlePromptTextChange(e.target.value)}
              rows={12}
              className="w-full bg-transparent outline-none font-mono text-xs text-[#F2F2F2] leading-relaxed resize-y"
            />
          ) : (
            <pre className="whitespace-pre-wrap font-mono">{activePromptText}</pre>
          )}
        </div>

        {/* Quality Evaluation Section */}
        <PromptQualityCard
          evaluation={evaluations[activeTab]}
          isEvaluating={isEvaluating}
          isStale={evalStale[activeTab]}
          error={evalError}
          onEvaluate={handleRunEvaluation}
          variantLabel={TAB_INFO[activeTab].label}
        />

        {/* Refinement Section */}
        <div className="pt-3 border-t border-[#262626] space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#F2F2F2]">
            <Wand2 className="h-3.5 w-3.5 text-[#38BDF8]" />
            <span>Refine Prompt</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {REFINE_MODES.map((item) => (
              <button
                key={item.mode}
                type="button"
                onClick={() => setSelectedRefineMode(item.mode)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedRefineMode === item.mode
                    ? 'bg-[#242424] text-[#F2F2F2] border border-[#38BDF8]/40'
                    : 'bg-[#1A1A1A] text-[#8E8E93] hover:text-[#F2F2F2] border border-[#262626]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {selectedRefineMode === 'custom' && (
            <input
              type="text"
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              placeholder="e.g., 'Make instructions strictly step-by-step'..."
              className="w-full rounded-xl border border-[#262626] bg-[#0D0D0D] px-3 py-2 text-xs text-[#F2F2F2] placeholder-[#636366] outline-none focus:border-[#38BDF8]/50"
            />
          )}

          <div className="flex items-center justify-between pt-1">
            {refineError && <p className="text-xs text-red-400">{refineError}</p>}
            <button
              type="button"
              onClick={handleRunRefinement}
              disabled={isRefining}
              className="px-3 py-1.5 rounded-lg border border-[#262626] bg-[#1A1A1A] hover:bg-[#242424] text-xs font-medium text-[#F2F2F2] flex items-center gap-1.5 ml-auto"
            >
              <Wand2 className="h-3.5 w-3.5 text-[#38BDF8]" />
              <span>{isRefining ? 'Refining...' : 'Apply Refinement'}</span>
            </button>
          </div>

          {/* Refinement Preview Dialog */}
          {previewRefinement && (
            <div className="rounded-xl border border-[#38BDF8]/30 bg-[#1A1A1A] p-4 space-y-3">
              <p className="text-xs font-semibold text-[#38BDF8]">{previewRefinement.summary}</p>
              <pre className="text-xs font-mono text-[#F2F2F2] whitespace-pre-wrap bg-[#0D0D0D] p-3 rounded-lg border border-[#262626] max-h-60 overflow-y-auto">
                {previewRefinement.prompt}
              </pre>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewRefinement(null)}
                  className="px-3 py-1 rounded-lg text-xs text-[#8E8E93] hover:text-[#F2F2F2]"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleApplyRefinement}
                  className="px-3 py-1 rounded-lg bg-[#38BDF8] text-slate-950 font-semibold text-xs"
                >
                  Accept Refinement
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
