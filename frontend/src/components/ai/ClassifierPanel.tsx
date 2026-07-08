'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

// Client-only + code-split: TF.js and the classifier UI stay out of the
// mission bundle until the kid actually opens the panel.
const ImageClassifier = dynamic(() => import('./ImageClassifier'), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded-card bg-ink/5" aria-hidden="true" />,
});

/**
 * Accordion wrapper used inside the Build & test step of the AI missions —
 * same anatomy as the thinking-tools accordion (ToolSelector).
 */
export default function ClassifierPanel() {
  const t = useTranslations('classifier');
  const [open, setOpen] = useState(false);

  return (
    <div data-testid="classifier-panel" className="overflow-hidden rounded-card border border-ink/20">
      <button
        type="button"
        data-testid="classifier-panel-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between bg-tint-lavender px-4 py-3 font-display text-sm text-ink transition-colors hover:bg-tint-lavender/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/40"
      >
        <span>{t('panel_title')}</span>
        <span
          className="text-ink/50 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          aria-hidden="true"
        >
          ▾
        </span>
      </button>

      {open && (
        <div className="bg-white px-4 py-4">
          <p className="mb-3 font-body text-sm text-ink/60">{t('panel_hint')}</p>
          <ImageClassifier />
        </div>
      )}
    </div>
  );
}
