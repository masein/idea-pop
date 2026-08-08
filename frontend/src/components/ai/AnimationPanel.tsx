'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

// Client-only + code-split: the studio (and its lazy GIF encoder) stays out of
// the mission bundle until the panel content actually renders.
const AnimationStudio = dynamic(() => import('./AnimationStudio'), {
  ssr: false,
  loading: () => <div className="h-24 animate-pulse rounded-card bg-ink/5" aria-hidden="true" />,
});

interface AnimationPanelProps {
  /** Start expanded so the studio is visible without hunting (mission step). */
  defaultOpen?: boolean;
}

/**
 * Panel wrapper used inside the Build & test step of the animation mission —
 * same anatomy as the Machine Trainer's ClassifierPanel: a prominent header
 * that stays a toggle, open by default on the mission step so kids see the
 * studio (and its single "Start animating →" button) straight away.
 */
export default function AnimationPanel({ defaultOpen = false }: AnimationPanelProps) {
  const t = useTranslations('animator');
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div data-testid="animation-panel" className="overflow-hidden rounded-card border-2 border-challenge/30">
      <button
        type="button"
        data-testid="animation-panel-toggle"
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
          <AnimationStudio />
        </div>
      )}
    </div>
  );
}
