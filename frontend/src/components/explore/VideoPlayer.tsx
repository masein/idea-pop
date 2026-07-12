'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { recordVideoView } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';

type ExploreVideo = components['schemas']['ExploreVideo'];
type XpAwardResponse = components['schemas']['XpAwardResponse'];

export interface VideoPlayerProps {
  video: ExploreVideo;
  ageMode: 'young' | 'older';
  onComplete: (award: XpAwardResponse) => void;
  onClose: () => void;
}

const FALLBACK_AWARD: XpAwardResponse = {
  xp_earned: 5,
  xp_total: 0,
  level: 1,
  rank: 'Explorer',
  is_new: false,
  cycle_bonus_earned: false,
};

export default function VideoPlayer({ video, ageMode, onComplete, onClose }: VideoPlayerProps) {
  const t = useTranslations('player');
  const te = useTranslations('explore');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [posting, setPosting] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function handleEnded() {
    if (completed) return;
    setCompleted(true);
    setPosting(true);
    try {
      const award = await recordVideoView(video.id);
      setPosting(false);
      onComplete(award as XpAwardResponse);
    } catch {
      setPosting(false);
      onComplete(FALLBACK_AWARD);
    }
  }

  return (
    <div
      data-testid="video-player"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      className="fixed inset-0 z-40 bg-ink/90 flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 text-white/80 hover:text-white font-body text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-pill px-2 py-1"
        >
          <span aria-hidden="true">←</span> {t('back')}
        </button>

        <h2 className="flex-1 font-display text-base text-white line-clamp-1">{video.title}</h2>

        {video.ai_generated && (
          <span
            title={te('ai_label')}
            className="bg-pricing/80 text-white text-xs px-2 py-0.5 rounded-pill font-body flex-shrink-0"
          >
            AI
          </span>
        )}

        <button
          type="button"
          data-testid="close-player"
          onClick={onClose}
          aria-label={t('close')}
          className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      {/* Video element */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
        <div className="relative">
          <video
            ref={videoRef}
            src={video.video_url}
            controls
            className="w-full max-h-[60vh] bg-black rounded-card"
            onEnded={handleEnded}
          >
            <track kind="captions" src="/captions/empty.vtt" srcLang="en" label="English" default />
          </video>
          {posting && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-card"
              aria-live="polite"
              aria-label={t('saving')}
            >
              <span className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Design secret — older mode only */}
        {ageMode === 'older' && video.design_secret && (
          <div className="bg-tint-lime rounded-card p-4">
            <p className="font-display text-sm text-ink mb-1">{te('design_secret')} 🔬</p>
            <p className="font-body text-sm text-ink/80">{video.design_secret}</p>
          </div>
        )}

        {/* Post-completion CTAs */}
        {completed && !posting && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-pill bg-explore text-white font-body font-semibold text-sm px-5 py-2.5 hover:brightness-110 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2"
            >
              {t('continue')}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-pill border-2 border-ink/20 text-ink font-body font-semibold text-sm px-5 py-2.5 bg-transparent hover:bg-ink/5 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2"
            >
              {te('paint_this')} 🎨
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
