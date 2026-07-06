'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/routing';
import { fetchCourse, fetchCreator } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';
import { useXpToast } from '@/lib/hooks/useXpToast';
import LessonVideoPlayer from '@/components/library/LessonVideoPlayer';
import XpBurst from '@/components/explore/XpBurst';

type CourseDetailResponse = components['schemas']['CourseDetailResponse'];
type LessonResponse = components['schemas']['LessonResponse'];
type CreatorResponse = components['schemas']['CreatorResponse'];
type XpAwardResponse = components['schemas']['XpAwardResponse'];

// Library brand section color (WCAG AA-safe with white text — 5.3:1).
const ORANGE = '#a85500';

const STUDIO: Record<string, { label: string; emoji: string }> = {
  craft: { label: 'Craft & Build', emoji: '🔨' },
  art: { label: 'Art & Sketching', emoji: '🎨' },
  music: { label: 'Music & Sound', emoji: '🎵' },
  code: { label: 'Code & Games', emoji: '💻' },
  science: { label: 'Science Lab', emoji: '🧪' },
  nature: { label: 'Nature Design', emoji: '🌿' },
};

const DIFFICULTY: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };

const LS_KEY = (courseId: string) => `completedLessons_${courseId}`;

function loadCompleted(courseId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY(courseId));
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveCompleted(courseId: string, ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY(courseId), JSON.stringify(Array.from(ids)));
  } catch {
    /* ignore */
  }
}

interface PageParams {
  locale: string;
  id: string;
}

export default function CourseDetailPage({ params }: { params: PageParams }) {
  const { id } = params;
  const xpToast = useXpToast();

  const [course, setCourse] = useState<CourseDetailResponse | null>(null);
  const [creator, setCreator] = useState<CreatorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCourse(id)
      .then(async (data) => {
        if (cancelled) return;
        const c = data as CourseDetailResponse;
        setCourse(c);
        setCompleted(loadCompleted(id));
        if (c.creator_id) {
          const cr = await fetchCreator(c.creator_id).catch(() => null);
          if (!cancelled) setCreator(cr as CreatorResponse | null);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function handleLessonComplete(award: XpAwardResponse) {
    if (!activeLessonId) return;
    const updated = new Set(completed).add(activeLessonId);
    setCompleted(updated);
    saveCompleted(id, updated);
    setActiveLessonId(null);
    xpToast.show(award);
  }

  const activeLesson = course?.lessons.find((l) => l.id === activeLessonId) ?? null;

  const lessons = course?.lessons ?? [];
  const doneCount = lessons.filter((l) => completed.has(l.id)).length;
  // First not-yet-completed lesson = the "now" lesson (the current frontier).
  const currentIdx = lessons.findIndex((l) => !completed.has(l.id));
  const studioMeta = course ? (STUDIO[course.studio] ?? { label: course.studio, emoji: '📚' }) : null;

  return (
    <div
      data-testid="course-page"
      className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6 md:px-8"
    >
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="font-body text-sm text-ink/60">
        <Link href="/library" className="rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library">
          Library
        </Link>
        {studioMeta && (
          <span>
            {' '}
            → <span aria-hidden="true">{studioMeta.emoji}</span> {studioMeta.label}
          </span>
        )}
      </nav>

      {loading && (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading course">
          <div className="h-24 animate-pulse rounded-card bg-white" />
          <div className="h-16 animate-pulse rounded-card bg-white" />
          <div className="h-16 animate-pulse rounded-card bg-white" />
        </div>
      )}

      {!loading && !course && (
        <p className="font-body text-sm text-ink/50">Course not found.</p>
      )}

      {!loading && course && studioMeta && (
        <>
          {/* Header */}
          <header className="flex flex-col gap-4 sm:flex-row">
            <span
              className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-tint-cream text-5xl"
              aria-hidden="true"
            >
              {studioMeta.emoji}
            </span>
            <div className="flex flex-1 flex-col gap-2">
              <h1 className="font-display text-3xl font-bold text-ink">{course.title}</h1>
              {creator && (
                <p className="w-fit rounded-pill bg-tint-lavender px-3 py-1 font-body text-sm font-semibold text-[#7A3D8A]">
                  With {creator.display_name}
                  {creator.bio ? ` · ${creator.bio.split('.')[0]}` : ''}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <MetaPill>{lessons.length} lessons</MetaPill>
                <MetaPill>⭐ {DIFFICULTY[course.difficulty] ?? 'Easy'}</MetaPill>
                <MetaPill>{course.age_min}+</MetaPill>
                <MetaPill>+{lessons[0]?.xp_reward ?? 10} XP / lesson</MetaPill>
                {course.materials.length > 0 && (
                  <MetaPill>🏠 {course.materials.join(' + ')}</MetaPill>
                )}
              </div>
              {currentIdx >= 0 && (
                <button
                  type="button"
                  data-testid="continue-lesson-btn"
                  onClick={() => setActiveLessonId(lessons[currentIdx].id)}
                  className="mt-1 w-fit rounded-pill px-6 py-2.5 font-display text-sm font-bold text-white transition-all hover:brightness-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ backgroundColor: ORANGE, ['--tw-ring-color' as string]: ORANGE }}
                >
                  Continue · Lesson {lessons[currentIdx].ordinal} ▶
                </button>
              )}
            </div>
          </header>

          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/10">
              <div
                data-testid="course-progress"
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(doneCount / Math.max(lessons.length, 1)) * 100}%`,
                  backgroundColor: ORANGE,
                }}
              />
            </div>
            <span className="font-display text-sm font-bold text-ink/70">
              {doneCount} of {lessons.length} done
            </span>
          </div>

          {/* Lessons */}
          <ul className="flex flex-col gap-2.5" aria-label="Lessons">
            {lessons.map((lesson, i) => {
              const isDone = completed.has(lesson.id);
              const isNow = !isDone && i === currentIdx;
              const isProject = i === lessons.length - 1;
              const isLocked = !isDone && !isNow && !isProject;
              return (
                <LessonItem
                  key={lesson.id}
                  lesson={lesson}
                  state={isDone ? 'done' : isProject ? 'project' : isNow ? 'now' : isLocked ? 'locked' : 'open'}
                  onWatch={() => setActiveLessonId(lesson.id)}
                />
              );
            })}
          </ul>

          {/* Instructor */}
          {creator && (
            <div className="flex items-start gap-3 rounded-[1.25rem] bg-black/[0.03] p-4">
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tint-lavender text-xl"
                aria-hidden="true"
              >
                🧑‍🏫
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="font-display text-sm font-bold text-ink">{creator.display_name}</p>
                <p className="font-body text-sm text-ink/60">{creator.bio}</p>
              </div>
            </div>
          )}

          {/* Cross-links */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href="/explore"
              className="rounded-[1.25rem] bg-tint-lime p-4 font-display text-sm font-bold text-explore transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
            >
              🌿 Pairs with Exploring:
              <br />
              <span className="text-base">Masters of Disguise →</span>
            </Link>
            <Link
              href="/challenges"
              className="rounded-[1.25rem] bg-tint-blue p-4 font-display text-sm font-bold text-[#135A85] transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge"
            >
              🧱 Helps the challenge:
              <br />
              <span className="text-base">Hide Max&apos;s cabin →</span>
            </Link>
          </div>
        </>
      )}

      {/* Lesson video overlay */}
      {activeLesson && course && (
        <LessonVideoPlayer
          lesson={activeLesson}
          courseTitle={course.title}
          onComplete={handleLessonComplete}
          onClose={() => setActiveLessonId(null)}
        />
      )}

      {/* XP burst toast */}
      {xpToast.visible && xpToast.award && (
        <XpBurst award={xpToast.award} stickerEmoji="🏆" onDismiss={xpToast.dismiss} />
      )}
    </div>
  );
}

// ── Meta pill ──────────────────────────────────────────────────────────────────

function MetaPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-pill bg-black/[0.05] px-3 py-1 font-body text-xs font-semibold text-ink/70">
      {children}
    </span>
  );
}

// ── Lesson item ────────────────────────────────────────────────────────────────

type LessonState = 'done' | 'now' | 'locked' | 'project' | 'open';

function LessonItem({
  lesson,
  state,
  onWatch,
}: {
  lesson: LessonResponse;
  state: LessonState;
  onWatch: () => void;
}) {
  const durationMin = Math.round(lesson.duration_s / 60);
  const clickable = state !== 'locked';

  if (state === 'project') {
    return (
      <li>
        <button
          type="button"
          data-testid={`lesson-row-${lesson.id}`}
          onClick={onWatch}
          className="flex w-full items-center gap-3 rounded-[1rem] border-2 border-explore bg-tint-lime px-4 py-3 text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
        >
          <span className="text-xl" aria-hidden="true">🎉</span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold text-ink">
              {lesson.ordinal} · {lesson.title}
            </p>
            <p className="font-body text-xs text-ink/60">
              → saves to your portfolio · share it if you like · +{lesson.xp_reward} XP
            </p>
          </div>
          <span className="shrink-0 font-body text-xs font-bold text-explore">
            your turn!
          </span>
        </button>
      </li>
    );
  }

  const content = (
    <>
      {/* Status marker */}
      <span
        className={[
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs',
          state === 'done'
            ? 'bg-explore text-white'
            : state === 'now'
              ? 'text-white'
              : 'bg-black/10 text-ink/40',
        ].join(' ')}
        style={state === 'now' ? { backgroundColor: ORANGE } : undefined}
        aria-hidden="true"
      >
        {state === 'done' ? '✓' : state === 'locked' ? '🔒' : '▶'}
      </span>
      <p
        className={[
          'min-w-0 flex-1 font-display text-sm font-bold',
          state === 'locked' ? 'text-ink/70' : 'text-ink',
        ].join(' ')}
      >
        {lesson.ordinal} · {lesson.title}
      </p>
      {state === 'now' && (
        <span
          className="shrink-0 rounded-pill px-2 py-0.5 font-body text-[11px] font-bold text-white"
          style={{ backgroundColor: ORANGE }}
        >
          now
        </span>
      )}
      <span className="shrink-0 font-body text-xs text-ink/70">{durationMin} min</span>
      <span
        className={[
          'shrink-0 font-body text-xs font-semibold',
          state === 'done' ? 'text-explore' : 'text-ink/70',
        ].join(' ')}
      >
        +{lesson.xp_reward}
        {state === 'done' ? ' ✓' : ''}
      </span>
    </>
  );

  return (
    <li>
      {clickable ? (
        <button
          type="button"
          data-testid={`lesson-row-${lesson.id}`}
          onClick={onWatch}
          aria-label={`Lesson ${lesson.ordinal}: ${lesson.title}`}
          className={[
            'flex w-full items-center gap-3 rounded-[1rem] bg-white px-4 py-3 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library',
            state === 'now' ? 'ring-2 ring-[color:var(--now)]' : '',
          ].join(' ')}
          style={state === 'now' ? ({ ['--now' as string]: ORANGE }) : undefined}
        >
          {content}
        </button>
      ) : (
        <div
          data-testid={`lesson-row-${lesson.id}`}
          className="flex items-center gap-3 rounded-[1rem] bg-black/[0.03] px-4 py-3"
          aria-label={`Lesson ${lesson.ordinal}: ${lesson.title} (locked)`}
        >
          {content}
        </div>
      )}
    </li>
  );
}
