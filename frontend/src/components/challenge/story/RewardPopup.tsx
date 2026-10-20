'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { btnPrimary, btnSecondary } from '@/components/challenge/buttons';

const CONFETTI_COLORS = ['#2D9CDB', '#FFD93D', '#6BCB77', '#FF6B6B', '#C77DFF', '#FF9F45'];
// Fixed positions and delays (no randomness), so every render looks the same.
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 0.37) % 2.8).toFixed(2),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

export interface RewardBadge {
  /** Badge artwork: an image path, or an emoji until the artwork exists. */
  art: string;
  name: string;
}

/**
 * The one reward popup for Max's challenge: the same layout for every achievement —
 * badge artwork, badge name, a short explanation, the XP, then the buttons. Only the
 * artwork and words change. Nothing navigates until the kid presses a button.
 */
export default function RewardPopup({
  badge = null,
  title,
  text,
  xp,
  xpAlready = false,
  lead,
  children,
  primary,
  secondary,
  testId = 'reward-popup',
}: {
  badge?: RewardBadge | null;
  title: string;
  text: ReactNode;
  /** XP earned now; null while the server answers. */
  xp: number | null;
  /** This reward was already collected before (never given twice). */
  xpAlready?: boolean;
  /** An optional line above the badge (e.g. "You've earned all the points…"). */
  lead?: ReactNode;
  /** Extra content under the explanation (a photo, PopAI's tip…). */
  children?: ReactNode;
  primary: { label: string; onClick: () => void; disabled?: boolean };
  secondary?: { label: string; onClick: () => void; disabled?: boolean };
  testId?: string;
}) {
  const t = useTranslations('story');
  const goRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    goRef.current?.focus();
  }, []);
  const isImage = !!badge && /^\/|\.(png|webp|jpe?g|svg)$/i.test(badge.art);

  return createPortal(
    <div className="app-typography fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[rgba(15,40,70,0.45)] p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        data-testid={testId}
        className="celebrate-pop relative my-auto flex w-full max-w-[460px] flex-col items-center gap-3 overflow-hidden rounded-[32px] bg-white px-6 pb-6 pt-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.3)]"
      >
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="celebrate-fall absolute top-0 h-3 w-2 rounded-sm"
            style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s` }}
          />
        ))}

        {lead && (
          <div data-testid={`${testId}-lead`} className="relative w-full rounded-[18px] bg-gradient-to-br from-[#FFF7D6] to-[#FFE9A8] px-4 py-3 font-body text-base font-bold leading-relaxed text-ink">
            {lead}
          </div>
        )}

        {/* Badge artwork: always the same size and place. */}
        <span
          aria-hidden="true"
          className="relative flex h-28 w-28 items-center justify-center rounded-full border-[6px] border-white bg-[radial-gradient(circle_at_35%_30%,#fff,#ffe38a_40%,#f2b705)] text-5xl shadow-[0_6px_18px_rgba(0,0,0,0.18)]"
        >
          {badge ? (
            isImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- badge artwork
              <img src={badge.art} alt="" className="h-20 w-20 object-contain" />
            ) : (
              badge.art
            )
          ) : (
            '🎉'
          )}
        </span>
        {badge && (
          <p data-testid={`${testId}-badge`} className="relative rounded-pill bg-[#FFF5D1] px-4 py-1 font-body text-sm font-extrabold uppercase tracking-wide text-[#6b4d00]">
            🏅 {badge.name}
          </p>
        )}

        <h2 id={`${testId}-title`} className="relative font-display text-3xl text-ink">
          {title}
        </h2>
        <p className="relative font-body text-base font-semibold leading-relaxed text-ink/80">{text}</p>

        {(xp !== null || xpAlready) && (
          <p data-testid={`${testId}-xp`} className="relative rounded-pill bg-[#EAF5FC] px-4 py-1.5 font-body text-base font-extrabold text-[#1A6FA6]">
            {xpAlready || xp === 0 ? `✅ ${t('xp_already')}` : <span dir="ltr">⭐ +{xp} XP</span>}
          </p>
        )}

        {children && <div className="relative w-full">{children}</div>}

        <div className="relative mt-2 flex w-full flex-col gap-3">
          <button ref={goRef} type="button" data-testid={`${testId}-primary`} onClick={primary.onClick} disabled={primary.disabled} className={`${btnPrimary} w-full`}>
            {primary.label}
          </button>
          {secondary && (
            <button type="button" data-testid={`${testId}-secondary`} onClick={secondary.onClick} disabled={secondary.disabled} className={`${btnSecondary} w-full`}>
              {secondary.label}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
