import type { Metadata } from 'next';
import { StudioComposer } from '@/components/studio/studio-composer';
import { findQuickCategory } from '@/lib/categories';
import { clampIdea } from '@/lib/studio';
import { findTemplate } from '@/lib/templates';

export const metadata: Metadata = {
  title: 'Space Prompt',
  description: 'Turn ideas into better prompts.',
};

/** Search params arrive as `string | string[]`; take the first value only. */
function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

interface StudioSearchParams {
  idea?: string | string[];
  category?: string | string[];
  template?: string | string[];
}

export default async function StudioPage({
  searchParams,
}: {
  searchParams: Promise<StudioSearchParams>;
}) {
  const params = await searchParams;

  const template = findTemplate(firstValue(params.template));
  const category = findQuickCategory(firstValue(params.category));

  const idea = clampIdea(firstValue(params.idea) ?? '');
  const initialIdea = idea || template?.starterText || '';

  const templateId = template?.id ?? null;
  const categorySlug = category?.slug ?? null;

  return (
    <div className="h-full">
      <StudioComposer
        key={`${templateId ?? ''}|${categorySlug ?? ''}|${initialIdea}`}
        initialIdea={initialIdea}
        templateId={templateId}
        categorySlug={categorySlug}
      />
    </div>
  );
}
