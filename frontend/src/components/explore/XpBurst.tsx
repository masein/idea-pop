'use client';

import type { components } from '@/lib/api/schema';

type XpAwardResponse = components['schemas']['XpAwardResponse'];

export interface XpBurstProps {
  award: XpAwardResponse;
  stickerEmoji?: string;
  onDismiss?: () => void;
}

export default function XpBurst({ award, stickerEmoji = '⭐', onDismiss }: XpBurstProps) {
  return (
    <div
      data-testid="xp-burst"
      className="fixed bottom-24 right-6 z-50 bg-white rounded-card shadow-lg p-4 flex flex-col items-center gap-2 max-w-xs"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 rounded-full text-ink/40 hover:text-ink hover:bg-ink/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      <span className="text-5xl select-none" aria-hidden="true">
        {stickerEmoji}
      </span>

      <p className="font-display text-2xl text-explore">+{award.xp_earned} XP</p>

      {award.cycle_bonus_earned && (
        <p className="font-body text-sm text-amber-600 font-semibold text-center">
          +15 XP Creative Cycle bonus!
        </p>
      )}
    </div>
  );
}
