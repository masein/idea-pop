'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useFormatter, useTranslations } from 'next-intl';
import { btnPrimary, btnSecondary } from '@/components/challenge/buttons';
import AssetSlot from '@/components/AssetSlot';
import ModalClose from '@/components/ModalClose';
import StarRow from '@/components/challenge/StarRow';
import { flyToSlot, releaseAllSoon } from '@/lib/achievementBar';
import { markPopupOpen } from '@/lib/characters';

const CONFETTI_COLORS = ['#2D9CDB', '#FFD93D', '#6BCB77', '#FF6B6B', '#C77DFF', '#FF9F45'];
// Fixed positions and delays (no randomness), so every render looks the same.
const CONFETTI = Array.from({ length: 22 }, (_, i) => ({
  left: (i * 37) % 100,
  delay: ((i * 0.37) % 2.8).toFixed(2),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

export interface RewardBadge {
  /** Badge artwork: an image path, or "asset:<ID>" until the artwork exists. */
  art: string;
  /** A character standing beside the popup, whole. */
  character?: string;
  name: string;
  /** The badge's id: its slot on the achievement bar. */
  key?: string;
}

/** What changed on the mission's achievement bar with this reward. */
export interface RewardSummary {
  /** The mission XP before this reward. */
  xpBefore: number;
  /** XP given now; null while the server answers. */
  xpGained: number | null;
  /** The stars before this reward. */
  starsBefore: number[];
  /** A star earned now (1–3), if any. */
  starNew?: number | null;
}

/**
 * The one reward popup for Max's challenge: the same layout for every achievement. The main
 * reward first (the badge, or the star), then what changed (XP before → after, stars x/3 →
 * y/3), then the encouragement, then the next step. When the kid moves on, each reward flies
 * into its place on the achievement bar. Nothing navigates until the kid presses a button.
 */
export default function RewardPopup({
  badge = null,
  title,
  text,
  xp,
  xpAlready = false,
  lead,
  summary = null,
  children,
  primary,
  secondary,
  onClose,
  testId = 'reward-popup',
}: {
  badge?: RewardBadge | null;
  title: string;
  text: ReactNode;
  /** XP earned now; null while the server answers. (Unused when there is a summary.) */
  xp: number | null;
  /** This reward was already collected before (never given twice). */
  xpAlready?: boolean;
  /** Encouragement under the reward details (e.g. "One problem can have many solutions!"). */
  lead?: ReactNode;
  /** XP and star progress for the achievement bar. */
  summary?: RewardSummary | null;
  /** Extra content under the explanation (a photo, PopAI's tip…). */
  children?: ReactNode;
  primary: { label: string; onClick: () => void; disabled?: boolean };
  secondary?: { label: string; onClick: () => void; disabled?: boolean };
  /** The X: hides the popup and leaves the kid where they were. Whatever was earned stays. */
  onClose: () => void;
  testId?: string;
}) {
  const t = useTranslations('story');
  const f = useFormatter();
  const n = (v: number) => f.number(v);
  const goRef = useRef<HTMLButtonElement>(null);
  const medalRef = useRef<HTMLElement | null>(null);
  const starRef = useRef<HTMLSpanElement>(null);
  const xpRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    goRef.current?.focus();
  }, []);
  // While it is open, no character introduction pops up over it.
  useEffect(() => {
    markPopupOpen(true);
    return () => markPopupOpen(false);
  }, []);
  const isImage = !!badge && !badge.art.startsWith('asset:') && /^\/|\.(png|webp|jpe?g|svg)$/i.test(badge.art);
  const starNew = summary?.starNew ?? null;
  const starsAfter = summary
    ? starNew && !summary.starsBefore.includes(starNew)
      ? [...summary.starsBefore, starNew]
      : summary.starsBefore
    : [];
  const gained = summary ? summary.xpGained : xp;

  // Moving on: each reward flies into the bar (the popup closes at once; the copies travel).
  const finish = (go: () => void) => () => {
    if (summary) {
      if (badge?.key) void flyToSlot(medalRef.current, `badge-${badge.key}`);
      if (starNew) void flyToSlot(starRef.current?.querySelector(`[data-testid="star-${starNew}"]`) ?? null, `star-${starNew}`);
      void flyToSlot(xpRef.current, 'xp');
      releaseAllSoon();
    }
    go();
  };

  const medalClass =
    'relative flex h-28 w-28 items-center justify-center rounded-full border-[6px] border-white bg-[radial-gradient(circle_at_35%_30%,#fff,#ffe38a_40%,#f2b705)] text-5xl shadow-[0_6px_18px_rgba(0,0,0,0.18)]';

  return createPortal(
    <div className="app-typography fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[rgba(15,40,70,0.45)] p-4">
      {/* The character (when there is one) and the popup, side by side; stacked on phones. */}
      <div className="my-auto flex w-full max-w-[460px] flex-col items-center sm:w-auto sm:max-w-none sm:flex-row">
      {badge?.character && (
        // eslint-disable-next-line @next/next/no-img-element -- the character, whole
        <img
          src={badge.character}
          alt=""
          aria-hidden="true"
          data-testid={`${testId}-character`}
          className="quizzy-idle pointer-events-none relative z-[91] -mb-6 h-40 w-auto shrink-0 object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.25)] sm:-me-8 sm:mb-0 sm:h-80 sm:self-center"
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${testId}-title`}
        data-testid={testId}
        className="celebrate-pop relative my-auto flex w-full max-w-[460px] sm:w-[460px] flex-col items-center gap-3 overflow-hidden rounded-[32px] bg-white px-6 pb-6 pt-16 text-center shadow-[0_24px_60px_rgba(0,0,0,0.3)]"
      >
        {CONFETTI.map((c, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="celebrate-fall absolute top-0 h-3 w-2 rounded-sm"
            style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s` }}
          />
        ))}

        <ModalClose onClose={finish(onClose)} testId={`${testId}-close`} />

        {/* 1. The main reward: the badge (always the same size and place), or the star. */}
        {badge && isImage && (
          // eslint-disable-next-line @next/next/no-img-element -- the badge's own medal
          <img
            ref={(el) => {
              medalRef.current = el;
            }}
            src={badge.art}
            alt=""
            aria-hidden="true"
            data-testid={`${testId}-medal`}
            className="relative h-28 w-28 object-contain sm:h-32 sm:w-32"
          />
        )}
        {badge && !isImage && (
          <span
            ref={(el) => {
              medalRef.current = el;
            }}
            aria-hidden="true"
            className={medalClass}
          >
            <AssetSlot id={badge.art.startsWith('asset:') ? badge.art.slice(6) : 'CHALLENGE-UI-001'} className="!rounded-full" />
          </span>
        )}
        {!badge && starNew && (
          <span ref={starRef} data-testid={`${testId}-star-hero`} className="relative">
            <StarRow stars={starsAfter} size={52} pop={[starNew]} />
          </span>
        )}
        {!badge && !starNew && (
          <span aria-hidden="true" className={medalClass}>
            <AssetSlot id="CHALLENGE-UI-001" className="!rounded-full" />
          </span>
        )}
        {/* The badge's name, unless its artwork already says it (Quizi's medal). */}
        {badge && !isImage && (
          <p data-testid={`${testId}-badge`} className="relative rounded-pill bg-[#FFF5D1] px-4 py-1 font-body text-sm font-extrabold uppercase tracking-wide text-[#6b4d00]">
            {badge.name}
          </p>
        )}

        <h2 id={`${testId}-title`} className="relative font-display text-3xl text-ink">
          {title}
        </h2>

        {/* 2. What was earned, simply: the star filling in among the three, and +XP. The running
            total lives in the achievement bar. */}
        {starNew && badge && (
          <span ref={starRef} data-testid={`${testId}-stars`} className="relative">
            <StarRow stars={starsAfter} size={36} pop={[starNew]} />
          </span>
        )}
        {gained !== null && gained > 0 && (
          <p ref={xpRef} data-testid={`${testId}-xp`} dir="ltr" className="relative rounded-pill bg-[#EAF5FC] px-5 py-1.5 font-display text-2xl text-[#1A6FA6]">
            +{n(gained)} XP
          </p>
        )}
        {/* A badge given before shows it was already collected; a section without XP shows none. */}
        {((gained === 0 && !!badge) || (!summary && xpAlready)) && (
          <p data-testid={`${testId}-xp`} className="relative rounded-pill bg-[#EAF5FC] px-4 py-1.5 font-body text-base font-extrabold text-[#1A6FA6]">
            {t('xp_already')}
          </p>
        )}

        {/* 3. The encouragement. */}
        <p className="relative font-body text-base font-semibold leading-relaxed text-ink/80">{text}</p>
        {lead && (
          <div data-testid={`${testId}-lead`} className="relative w-full rounded-[18px] bg-gradient-to-br from-[#FFF7D6] to-[#FFE9A8] px-4 py-3 font-body text-base font-bold leading-relaxed text-ink">
            {lead}
          </div>
        )}

        {children && <div className="relative w-full">{children}</div>}

        {/* 4. What next. */}
        <div className="relative mt-2 flex w-full flex-col gap-3">
          <button ref={goRef} type="button" data-testid={`${testId}-primary`} onClick={finish(primary.onClick)} disabled={primary.disabled} className={`${btnPrimary} w-full`}>
            {primary.label}
          </button>
          {secondary && (
            <button type="button" data-testid={`${testId}-secondary`} onClick={finish(secondary.onClick)} disabled={secondary.disabled} className={`${btnSecondary} w-full`}>
              {secondary.label}
            </button>
          )}
        </div>
      </div>
      </div>
    </div>,
    document.body,
  );
}
