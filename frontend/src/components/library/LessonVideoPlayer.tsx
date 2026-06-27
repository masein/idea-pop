'use client';

import { useRef, useState } from 'react';
import { recordLessonComplete } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';

type LessonResponse = components['schemas']['LessonResponse'];
type XpAwardResponse = components['schemas']['XpAwardResponse'];

export interface LessonVideoPlayerProps {
  lesson: LessonResponse;
  courseTitle: string;
  onComplete: (award: XpAwardResponse) => void;
  onClose: () => void;
}

const FALLBACK_AWARD: XpAwardResponse = {
  xp_earned: 10,
  xp_total: 0,
  level: 1,
  rank: 'Explorer',
  is_new: false,
  cycle_bonus_earned: false,
};

export default function LessonVideoPlayer({
  lesson,
  courseTitle,
  onComplete,
  onClose,
}: LessonVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [posting, setPosting] = useState(false);
  const [completed, setCompleted] = useState(false);

  async function handleEnded() {
    if (completed) return;
    setCompleted(true);
    setPosting(true);
    try {
      const award = await recordLessonComplete(lesson.id);
      setPosting(false);
      onComplete(award as XpAwardResponse);
    } catch {
      setPosting(false);
      onComplete(FALLBACK_AWARD);
    }
  }

  return (
    <div
      data-testid="lesson-player"
      role="dialog"
      aria-modal="true"
      aria-label={`${courseTitle} — Lesson ${lesson.ordinal}: ${lesson.title}`}
      className="fixed inset-0 z-40 bg-ink/90 flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close lesson player"
          className="flex items-center gap-1 text-white/80 hover:text-white font-body text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 rounded-pill px-2 py-1"
        >
          <span aria-hidden="true">←</span> Back
        </button>

        <h2 className="flex-1 font-display text-base text-white line-clamp-1">
          {courseTitle} — Lesson {lesson.ordinal}: {lesson.title}
        </h2>
      </div>

      {/* Video */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-4">
        <div className="relative">
          <video
            ref={videoRef}
            src={lesson.video_url}
            controls
            className="w-full max-h-[70vh] bg-black"
            onEnded={handleEnded}
          >
            <track kind="captions" src="/captions/empty.vtt" srcLang="en" label="English" default />
          </video>
          {posting && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/40"
              aria-live="polite"
              aria-label="Saving progress"
            >
              <span
                className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {/* Post-completion CTAs */}
        {completed && !posting && (
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-pill bg-library text-white font-body font-semibold text-sm px-5 py-2.5 hover:brightness-110 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library focus-visible:ring-offset-2"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
