'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

// Client-only + code-split: the game never touches the SSR/main bundle.
const QuestionTree = dynamic(() => import('@/components/ai/QuestionTree'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-card bg-white/60" aria-hidden="true" />,
});

export default function QuestionTreePage() {
  const t = useTranslations('qtree');

  return (
    <div data-testid="studio-qtree-page" className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-6 md:px-8">
      {/* The AppShell logo sits at the physical top-right; keep the heading clear of it (matters in RTL). */}
      <header className="md:pr-36">
        <h1 className="font-display text-3xl font-bold text-ink">{t('title')}</h1>
        <p className="mt-1 font-body font-semibold text-ink/60">{t('subtitle')}</p>
      </header>
      <QuestionTree />
    </div>
  );
}
