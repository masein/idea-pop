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

interface ClassifierPanelProps {
  /** Start expanded so the trainer is visible without hunting (mission step). */
  defaultOpen?: boolean;
}

/**
 * Accordion wrapper used inside the Build & test step of the AI missions. On
 * the mission step it opens by default (`defaultOpen`) so kids see the trainer
 * straight away; the header stays a prominent toggle they can collapse.
 */
export default function ClassifierPanel({ defaultOpen = false }: ClassifierPanelProps) {
  const t = useTranslations('classifier');
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div data-testid="classifier-panel" className="overflow-hidden rounded-card border-2 border-challenge/30">
      <button
        type="button"
        data-testid="classifier-panel-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center justify-between bg-challenge/10 px-4 py-3 font-display text-base font-bold text-challenge transition-colors hover:bg-challenge/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-challenge"
      >
        <span>{t('panel_title')}</span>
        <span
          className="text-challenge/60 transition-transform duration-200"
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
