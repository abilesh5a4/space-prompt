import {
  BrainCircuit,
  Briefcase,
  Building2,
  Code,
  GraduationCap,
  Microscope,
  Palette,
  PenLine,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PromptCategory } from '@/types';

export interface QuickCategory {
  /** URL-safe identifier passed to the studio as `?category=`. */
  slug: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Quick-start entry points shown on the dashboard. Selecting one only carries a
 * hint into the studio — it does not pre-decide anything about the prompt.
 */
export const quickCategories: QuickCategory[] = [
  { slug: 'coding', label: 'Coding', icon: Code },
  { slug: 'ai-projects', label: 'AI Projects', icon: BrainCircuit },
  { slug: 'research', label: 'Research', icon: Microscope },
  { slug: 'study', label: 'Study', icon: GraduationCap },
  { slug: 'writing', label: 'Writing', icon: PenLine },
  { slug: 'design', label: 'Design', icon: Palette },
  { slug: 'career', label: 'Career', icon: Briefcase },
  { slug: 'business', label: 'Business', icon: Building2 },
];

/** Resolves a `?category=` value to a known category, or null if unrecognised. */
export function findQuickCategory(slug: string | undefined): QuickCategory | null {
  if (!slug) return null;
  return quickCategories.find((category) => category.slug === slug) ?? null;
}

/**
 * Display labels for the canonical `PromptCategory` union. Used whenever an
 * analyzer or database slug is rendered, so a value like `data-analysis` never
 * reaches the UI verbatim.
 */
export const promptCategoryLabels: Record<PromptCategory, string> = {
  coding: 'Coding',
  'software-development': 'Software Development',
  'ai-projects': 'AI Projects',
  research: 'Research',
  study: 'Study',
  writing: 'Writing',
  design: 'Design',
  career: 'Career',
  business: 'Business',
  marketing: 'Marketing',
  'data-analysis': 'Data Analysis',
  automation: 'Automation',
  general: 'General',
};

/**
 * The canonical slugs as a runtime list — the intent analyzer constrains the
 * model to exactly these, and validates whatever comes back against them.
 */
export const promptCategories = Object.keys(promptCategoryLabels) as PromptCategory[];

/** Narrows an untrusted string (query param, model output) to a known slug. */
export function isPromptCategory(value: unknown): value is PromptCategory {
  return typeof value === 'string' && value in promptCategoryLabels;
}

/** Label for any slug, falling back to General rather than rendering nothing. */
export function promptCategoryLabel(value: unknown): string {
  return isPromptCategory(value) ? promptCategoryLabels[value] : promptCategoryLabels.general;
}
