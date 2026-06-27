'use client';

import type { components } from '@/lib/api/schema';
import { Button } from '@/components/ui/Button';

type LessonResponse = components['schemas']['LessonResponse'];

export interface LessonRowProps {
  lesson: LessonResponse;
  completed?: boolean;
  onComplete: (lesson: LessonResponse) => void;
  loading?: boolean;
}

export default function LessonRow({ lesson, completed = false, onComplete, loading = false }: LessonRowProps) {
  const durationMin = Math.round(lesson.duration_s / 60);

  return (
    <div
      data-testid={`lesson-row-${lesson.id}`}
      className="flex items-center gap-4 rounded-card bg-white px-4 py-3 shadow-sm"
    >
      {/* Ordinal circle */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-display flex-shrink-0 ${
          completed ? 'bg-explore text-white' : 'bg-tint-lime text-ink'
        }`}
        aria-label={completed ? `Lesson ${lesson.ordinal} completed` : `Lesson ${lesson.ordinal}`}
      >
        {completed ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          lesson.ordinal
        )}
      </div>

      {/* Middle: title + duration */}
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm text-ink leading-snug line-clamp-1">{lesson.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-body text-xs text-ink/50">{durationMin} min</span>
          <span
            className="rounded-pill bg-tint-lime px-2 py-0.5 text-xs font-body text-ink/70"
            aria-label={`${lesson.xp_reward} XP reward`}
          >
            +{lesson.xp_reward} XP
          </span>
        </div>
      </div>

      {/* Right: action */}
      {completed ? (
        <span
          className="w-7 h-7 rounded-full bg-explore/10 flex items-center justify-center flex-shrink-0"
          aria-label="Completed"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2 7l4 4 6-6" stroke="#27ae60" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : (
        <Button
          variant="primary"
          size="sm"
          onClick={() => onComplete(lesson)}
          disabled={loading}
          aria-label={`Watch lesson ${lesson.ordinal}: ${lesson.title}`}
        >
          Watch
        </Button>
      )}
    </div>
  );
}
