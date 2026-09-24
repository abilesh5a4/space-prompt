'use client';

import React from 'react';
import { Gauge } from 'lucide-react';
import type { PromptEvaluation } from '@/types';

interface PromptQualityCardProps {
  evaluation: PromptEvaluation | null;
  isEvaluating: boolean;
  isStale: boolean;
  error: string | null;
  onEvaluate: () => void;
  variantLabel: string;
}

const DIMENSION_LABELS: Record<keyof PromptEvaluation['dimensions'], string> = {
  clarity: 'Clarity',
  specificity: 'Specificity',
  context: 'Context',
  constraints: 'Constraints',
  outputDefinition: 'Output Definition',
  actionability: 'Actionability',
};

export function PromptQualityCard({
  evaluation,
  isEvaluating,
  isStale,
  onEvaluate,
  variantLabel,
}: PromptQualityCardProps) {
  if (!evaluation) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-[#262626] bg-[#141414] text-xs">
        <div className="flex items-center gap-2 text-[#8E8E93]">
          <Gauge className="h-4 w-4 text-[#38BDF8]" />
          <span>Quality Evaluation ({variantLabel})</span>
        </div>
        <button
          type="button"
          onClick={onEvaluate}
          disabled={isEvaluating}
          className="px-3 py-1 rounded-lg border border-[#262626] bg-[#1A1A1A] hover:bg-[#242424] text-[#F2F2F2] font-medium transition-colors"
        >
          {isEvaluating ? 'Evaluating...' : 'Evaluate Quality'}
        </button>
      </div>
    );
  }

  const { overallScore, dimensions, summary } = evaluation;

  return (
    <div className="p-4 rounded-xl border border-[#262626] bg-[#141414] space-y-3 text-xs text-[#F2F2F2]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-[#38BDF8]" />
          <span className="font-semibold">Quality Score ({variantLabel})</span>
          {isStale && <span className="text-[10px] text-amber-400 font-medium">(Edited)</span>}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-[#1A1A1A] border border-[#262626] font-semibold text-[#38BDF8]">
            {overallScore} / 100
          </span>
          <button
            type="button"
            onClick={onEvaluate}
            disabled={isEvaluating}
            className="text-[11px] text-[#8E8E93] hover:text-[#F2F2F2]"
          >
            Re-evaluate
          </button>
        </div>
      </div>

      <p className="text-[#8E8E93] italic border-l-2 border-[#262626] pl-2.5">
        &quot;{summary}&quot;
      </p>

      {/* Dimension Scores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
        {(Object.keys(dimensions) as (keyof typeof dimensions)[]).map((key) => {
          const score = dimensions[key];
          return (
            <div key={key} className="p-2 rounded-lg bg-[#0D0D0D] border border-[#262626] space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-[#8E8E93]">{DIMENSION_LABELS[key]}</span>
                <span className="font-mono font-medium">{score}</span>
              </div>
              <div className="h-1 w-full rounded-full bg-[#262626] overflow-hidden">
                <div
                  className="h-full bg-[#38BDF8] rounded-full"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
