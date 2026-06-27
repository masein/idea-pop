'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchCourse } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';
import { useXpToast } from '@/lib/hooks/useXpToast';
import LessonRow from '@/components/library/LessonRow';
import LessonVideoPlayer from '@/components/library/LessonVideoPlayer';
import XpBurst from '@/components/explore/XpBurst';

type CourseDetailResponse = components['schemas']['CourseDetailResponse'];
type LessonResponse = components['schemas']['LessonResponse'];
type XpAwardResponse = components['schemas']['XpAwardResponse'];

const LS_KEY = (courseId: string) => `completedLessons_${courseId}`;

function loadCompleted(courseId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY(courseId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveCompleted(courseId: string, ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY(courseId), JSON.stringify(Array.from(ids)));
  } catch {
    // ignore storage errors
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
  const [loading, setLoading] = useState(true);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [xpLoading, setXpLoading] = useState(false);

  // Load course + restore progress from localStorage
  useEffect(() => {
    let cancelled = false;
    fetchCourse(id)
      .then((data) => {
        if (cancelled) return;
        setCourse(data as CourseDetailResponse);
        setCompletedLessons(loadCompleted(id));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  function handleWatchLesson(lesson: LessonResponse) {
    setActiveLessonId(lesson.id);
  }

  function handleLessonComplete(award: XpAwardResponse) {
    if (!activeLessonId) return;
    const updated = new Set(completedLessons).add(activeLessonId);
    setCompletedLessons(updated);
    saveCompleted(id, updated);
    setActiveLessonId(null);
    setXpLoading(false);
    xpToast.show(award);
  }

  const activeLesson = course?.lessons.find((l) => l.id === activeLessonId) ?? null;

  return (
    <div
      data-testid="course-page"
      className="p-6 md:p-8 max-w-3xl mx-auto flex flex-col gap-6"
    >
      {/* Back link */}
      <Link
        href="/library"
        className="inline-flex items-center gap-1 font-body text-sm text-ink/60 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 rounded-pill w-fit"
        aria-label="Back to Library"
      >
        <span aria-hidden="true">←</span> Library
      </Link>

      {loading && (
        <div className="flex flex-col gap-4" aria-label="Loading course" aria-busy="true">
          <div className="animate-pulse rounded-card h-12 bg-ink/10" />
          <div className="animate-pulse rounded-card h-8 bg-ink/10 w-2/3" />
          <div className="animate-pulse rounded-card h-24 bg-ink/10" />
          <div className="animate-pulse rounded-card h-24 bg-ink/10" />
        </div>
      )}

      {!loading && !course && (
        <p className="font-body text-sm text-ink/50">Course not found.</p>
      )}

      {!loading && course && (
        <>
          {/* Course header */}
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-2xl text-ink">{course.title}</h1>
            <p className="font-body text-sm text-ink/60 capitalize">{course.studio}</p>
            {course.summary && (
              <p className="font-body text-sm text-ink/70">{course.summary}</p>
            )}
            <p className="font-body text-xs text-ink/40">
              {completedLessons.size}/{course.lessons.length} lessons completed
            </p>
          </div>

          {/* Lesson list */}
          {course.lessons.length === 0 ? (
            <p className="font-body text-sm text-ink/50">No lessons yet — check back soon!</p>
          ) : (
            <div className="flex flex-col gap-3" role="list" aria-label="Lessons">
              {course.lessons.map((lesson) => (
                <div key={lesson.id} role="listitem">
                  <LessonRow
                    lesson={lesson}
                    completed={completedLessons.has(lesson.id)}
                    onComplete={handleWatchLesson}
                    loading={xpLoading && activeLessonId === lesson.id}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lesson video player overlay */}
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
        <XpBurst
          award={xpToast.award}
          stickerEmoji="🏆"
          onDismiss={xpToast.dismiss}
        />
      )}
    </div>
  );
}
