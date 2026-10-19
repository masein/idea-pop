'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { btnPrimary, btnSecondary } from '@/components/challenge/buttons';

const CONFETTI_COLORS = ['#2D9CDB', '#FFD93D', '#6BCB77', '#FF6B6B', '#C77DFF', '#FF9F45'];
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 0.37) % 2.8).toFixed(2),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

/** The S — Substitute practice is done: the kid made a new version of their idea and a
 *  prediction (nothing here says it works). Waits for a button before going anywhere. */
export default function SubstCelebration({ onKeepExploring, onEnough }: { onKeepExploring: () => void; onEnough: () => void }) {
  const t = useTranslations('story');
  const goRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    goRef.current?.focus();
  }, []);
  return createPortal(
    <div className="app-typography fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[rgba(15,40,70,0.45)] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="subst-celebration-title"
        data-testid="subst-celebration"
        className="celebrate-pop relative my-auto w-full max-w-[460px] overflow-hidden rounded-[32px] bg-white px-6 pb-6 pt-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.3)]"
      >
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="celebrate-fall absolute top-0 h-3 w-2 rounded-sm"
            style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s` }}
          />
        ))}
        <span aria-hidden="true" className="text-5xl">🔄</span>
        <h2 id="subst-celebration-title" className="mt-2 font-display text-3xl text-ink">
          {t('subst_cel_title')}
        </h2>
        <p className="mt-2 font-body text-base font-semibold leading-relaxed text-ink/80">{t('subst_cel_text')}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-[#FFF5D1] px-3 py-1.5 font-body text-sm font-extrabold text-[#6b4d00]">
          🧠 {t('subst_cel_badge')}
        </span>
        <div className="mt-5 flex flex-col gap-3">
          <button ref={goRef} type="button" data-testid="subst-keep-exploring" onClick={onKeepExploring} className={`${btnPrimary} w-full`}>
            {t('lab_keep_exploring')}
          </button>
          <button type="button" data-testid="subst-enough" onClick={onEnough} className={`${btnSecondary} w-full`}>
            {t('enough_today')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
