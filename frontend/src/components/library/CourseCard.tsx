import type { components } from '@/lib/api/schema';

type CourseDetailResponse = components['schemas']['CourseDetailResponse'];

const STUDIO_EMOJI: Record<string, string> = {
  craft: '🔨',
  art: '🎨',
  music: '🎵',
  code: '💻',
  science: '🔬',
  nature: '🌿',
};

export interface CourseCardProps {
  course: CourseDetailResponse;
  progress?: { completed: number; total: number };
  onClick?: () => void;
}

export default function CourseCard({ course, progress, onClick }: CourseCardProps) {
  const emoji = STUDIO_EMOJI[course.studio] ?? '📚';

  return (
    <button
      type="button"
      data-testid="course-card"
      onClick={onClick}
      className="rounded-card bg-white shadow-sm overflow-hidden w-full flex flex-col cursor-pointer hover:shadow-md transition-shadow text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library focus-visible:ring-offset-2"
      aria-label={`Course: ${course.title}`}
    >
      {/* Top area */}
      <div className="h-28 bg-tint-cream flex items-center justify-center flex-shrink-0">
        <span className="text-5xl select-none" aria-hidden="true">{emoji}</span>
      </div>

      {/* Bottom content */}
      <div className="px-4 py-3 flex flex-col gap-2 flex-1">
        <p className="font-display text-sm text-ink leading-snug line-clamp-2">{course.title}</p>
        <p className="font-body text-xs text-ink/60 capitalize">{course.studio}</p>

        {progress && (
          <div className="mt-1">
            <div className="h-1.5 rounded-full bg-ink/10 overflow-hidden" aria-hidden="true">
              <div
                className="h-full rounded-full bg-explore transition-all"
                style={{ width: `${(progress.completed / Math.max(progress.total, 1)) * 100}%` }}
              />
            </div>
            <p className="font-body text-xs text-ink/50 mt-1">
              {progress.completed}/{progress.total} lessons
            </p>
          </div>
        )}
      </div>
    </button>
  );
}
