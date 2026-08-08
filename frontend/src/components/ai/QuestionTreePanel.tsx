'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

// Client-only + code-split: the game stays out of the mission bundle until
// the panel content renders.
const QuestionTree = dynamic(() => import('./QuestionTree'), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded-card bg-ink/5" aria-hidden="true" />,
});

interface QuestionTreePanelProps {
  /** Start expanded so the game is visible without hunting (mission steps). */
  defaultOpen?: boolean;
}

/**
 * Panel wrapper for the Question Tree game inside the guess-who-tree mission
 * steps — same anatomy as ClassifierPanel/AnimationPanel: a prominent header
 * that stays a toggle, open by default so kids see the game straight away.
 */
export default function QuestionTreePanel({ defaultOpen = false }: QuestionTreePanelProps) {
  const t = useTranslations('qtree');
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div data-testid="qtree-panel" className="overflow-hidden rounded-card border-2 border-challenge/30">
      <button
        type="button"
        data-testid="qtree-panel-toggle"
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
          <QuestionTree />
        </div>
      )}
    </div>
  );
}
