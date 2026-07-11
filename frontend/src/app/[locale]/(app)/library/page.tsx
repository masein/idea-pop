'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from '@/i18n/routing';
import { fetchStudios, fetchQuickMakes, fetchCourses } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';

type StudioCountResponse = components['schemas']['StudioCountResponse'];
type QuickMakePageResponse = components['schemas']['QuickMakePageResponse'];
type QuickMakeResponse = components['schemas']['QuickMakeResponse'];
type CourseSummaryResponse = components['schemas']['CourseSummaryResponse'];

// Library brand section color (WCAG AA-safe with white text — 5.3:1).
const ORANGE = '#a85500';
// Tool-card accent — the pricing/AI purple (AA-safe with white text — 5.79:1).
const PURPLE = '#7c3cc9';

// ── Studio config (labels + emoji + taglines for empty studios) ────────────────

const STUDIOS: Array<{ slug: string; label: string; emoji: string; tagline: string }> = [
  { slug: 'craft', label: 'Craft & Build', emoji: '🔨', tagline: 'make it with your hands' },
  { slug: 'art', label: 'Art & Sketching', emoji: '🎨', tagline: 'draw anything you imagine' },
  { slug: 'music', label: 'Music & Sound', emoji: '🎵', tagline: 'build beats & sounds' },
  { slug: 'code', label: 'Code & Games', emoji: '💻', tagline: 'code your own games' },
  { slug: 'science', label: 'Science Lab', emoji: '🧪', tagline: 'try safe experiments' },
  { slug: 'nature', label: 'Nature Design', emoji: '🌿', tagline: 'design like nature!' },
];

const STUDIO_EMOJI: Record<string, string> = Object.fromEntries(
  STUDIOS.map((s) => [s.slug, s.emoji]),
);

// Contextual makes tied to the active mission (no per-mission endpoint yet).
const MISSION_MAKES = [
  'Paper bridges that hold weight',
  'Strong shapes: triangles!',
  'Rope & knots basics',
];

const DIFFICULTY: Record<number, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const MESS: Record<number, string> = { 1: 'tidy', 2: 'some mess', 3: 'messy' };

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [studioCounts, setStudioCounts] = useState<StudioCountResponse[]>([]);
  const [courses, setCourses] = useState<CourseSummaryResponse[]>([]);
  const [quickMakes, setQuickMakes] = useState<QuickMakeResponse[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchStudios().catch(() => [] as StudioCountResponse[]),
      fetchCourses().catch(() => [] as CourseSummaryResponse[]),
      fetchQuickMakes({ per_page: 4 }).catch(
        () => ({ items: [] }) as unknown as QuickMakePageResponse,
      ),
    ]).then(([studios, cs, makes]) => {
      if (cancelled) return;
      setStudioCounts(studios as StudioCountResponse[]);
      setCourses(cs as CourseSummaryResponse[]);
      setQuickMakes((makes as QuickMakePageResponse).items ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Featured "continue" course: first course, progress from localStorage.
  const featured = courses[0] ?? null;
  const completedCount = (() => {
    if (!featured || typeof window === 'undefined') return 0;
    try {
      const raw = localStorage.getItem(`completedLessons_${featured.id}`);
      return raw ? (JSON.parse(raw) as string[]).length : 0;
    } catch {
      return 0;
    }
  })();

  return (
    <div
      data-testid="library-page"
      className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-6 md:px-8"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="text-center">
        <h1 className="font-display text-4xl font-bold text-ink md:text-5xl">
          Bored? Let&apos;s make something!
        </h1>
        <p className="mx-auto mt-2 max-w-xl font-body text-lg font-semibold text-ink/70">
          Pick a studio, grab simple materials, and make something uniquely yours.
        </p>
      </header>

      {/* ── Continue ───────────────────────────────────────────────────────── */}
      <section aria-label="Continue where you left off" className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold text-ink">Continue</h2>
        {loading ? (
          <div className="h-24 animate-pulse rounded-card bg-white" />
        ) : featured ? (
          <button
            type="button"
            data-testid="continue-course"
            onClick={() => router.push(`/library/courses/${featured.id}`)}
            className="flex items-center gap-4 rounded-[1.5rem] bg-white p-3 text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library focus-visible:ring-offset-2"
          >
            <span
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-tint-cream text-3xl"
              aria-hidden="true"
            >
              {STUDIO_EMOJI[featured.studio] ?? '📚'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-bold text-ink">{featured.title}</p>
              <p className="font-body text-sm text-ink/60">
                with {featured.creator_name} · {studioLabel(featured.studio)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-black/10">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(completedCount / Math.max(featured.lesson_count, 1)) * 100}%`,
                      backgroundColor: ORANGE,
                    }}
                  />
                </div>
                <span className="font-body text-xs font-semibold text-ink/50">
                  {completedCount}/{featured.lesson_count}
                </span>
              </div>
            </div>
            <span
              className="hidden shrink-0 items-center gap-1 rounded-pill px-5 py-2.5 font-display text-sm font-bold text-white sm:inline-flex"
              style={{ backgroundColor: ORANGE }}
            >
              Continue ▶
            </span>
          </button>
        ) : (
          <p className="font-body text-sm text-ink/50">
            No courses yet — start a quick make below!
          </p>
        )}
      </section>

      {/* ── From your mission ──────────────────────────────────────────────── */}
      <section aria-label="From your mission" className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold text-ink">
          From your mission: <span className="text-challenge">Help Max cross the river</span>
        </h2>
        <div className="rounded-[1.5rem] bg-tint-blue p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MISSION_MAKES.map((title) => (
              <div key={title} className="flex flex-col gap-2 rounded-card bg-white p-3 shadow-sm">
                <div
                  className="h-20 rounded-xl bg-tint-cream"
                  aria-hidden="true"
                />
                <p className="font-display text-sm font-bold leading-snug text-ink">{title}</p>
                <span className="inline-flex w-fit items-center gap-1 rounded-pill bg-white px-2.5 py-0.5 font-body text-xs font-semibold text-[#135A85]">
                  ⭐ helps your challenge
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Studios ────────────────────────────────────────────────────────── */}
      <section aria-label="Studios" className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold text-ink">Studios</h2>
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-stretch">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STUDIOS.map((s) => {
              const counts = studioCounts.find((c) => c.studio === s.slug);
              const makes = counts?.quick_make_count ?? 0;
              const courseN = counts?.course_count ?? 0;
              return (
                <button
                  key={s.slug}
                  type="button"
                  data-testid="studio-card"
                  onClick={() => router.push(`/library?studio=${s.slug}`)}
                  aria-label={`${s.label}: ${makes} makes, ${courseN} courses`}
                  className="flex min-h-[6.5rem] flex-col justify-center gap-1 rounded-[1.25rem] px-5 py-4 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ backgroundColor: ORANGE, ['--tw-ring-color' as string]: ORANGE }}
                >
                  <span className="font-display text-xl font-bold leading-tight">{s.label}</span>
                  <span className="flex items-center gap-1.5 font-body text-sm font-semibold text-white">
                    <span aria-hidden="true">{s.emoji}</span>
                    {makes > 0 || courseN > 0 ? (
                      <span>
                        {makes} makes{courseN > 0 ? ` · ${courseN} ${courseN === 1 ? 'course' : 'courses'}` : ''}
                      </span>
                    ) : (
                      <span>{s.tagline}</span>
                    )}
                  </span>
                </button>
              );
            })}
            {/* Machine Trainer — an on-device AI TOOL, not a content studio:
                purple (vs studio orange) and a direct route instead of a
                ?studio= filter. This is the classifier's standalone entry
                point now that it's out of the main nav. */}
            <button
              type="button"
              data-testid="tool-card-classifier"
              onClick={() => router.push('/studio/classify')}
              aria-label="Machine Trainer: AI tool — teach the computer to see"
              className="flex min-h-[6.5rem] flex-col justify-center gap-1 rounded-[1.25rem] px-5 py-4 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ backgroundColor: PURPLE, ['--tw-ring-color' as string]: PURPLE }}
            >
              <span className="font-display text-xl font-bold leading-tight">Machine Trainer</span>
              <span className="flex items-center gap-1.5 font-body text-sm font-semibold text-white">
                <span aria-hidden="true">🤖</span>
                <span>AI tool · teach the computer to see</span>
              </span>
            </button>
          </div>
          <Image
            src="/kid/pointing-girl.png"
            alt=""
            aria-hidden="true"
            width={280}
            height={340}
            className="hidden h-64 w-auto shrink-0 select-none self-end object-contain lg:block"
          />
        </div>
      </section>

      {/* ── Quick makes ────────────────────────────────────────────────────── */}
      <section aria-label="Quick makes" className="flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold text-ink">Quick makes</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 animate-pulse rounded-[1.25rem] bg-white" />
            ))}
          </div>
        ) : quickMakes.length === 0 ? (
          <p className="font-body text-sm text-ink/50">No quick makes yet — check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {quickMakes.map((m) => (
              <QuickMakeTile key={m.id} make={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ── Quick make tile ────────────────────────────────────────────────────────────

function QuickMakeTile({ make }: { make: QuickMakeResponse }) {
  const emoji = STUDIO_EMOJI[make.studio] ?? '📚';
  return (
    <div
      data-testid="quick-make-tile"
      className="flex flex-col items-center gap-2 rounded-[1.25rem] px-3 pb-4 pt-14 text-center text-white"
      style={{ backgroundColor: ORANGE, position: 'relative' }}
    >
      {/* Circular photo placeholder (overlaps top) */}
      <span
        className="absolute -top-8 flex h-24 w-24 items-center justify-center rounded-full bg-tint-cream text-4xl shadow-md ring-4 ring-white"
        aria-hidden="true"
      >
        {emoji}
      </span>

      <span className="inline-flex items-center gap-1 rounded-pill bg-black/20 px-2.5 py-0.5 font-body text-xs font-bold">
        {emoji} {studioLabel(make.studio)} +{make.xp_reward} XP
      </span>
      <p className="font-display text-base font-bold leading-tight">{make.title}</p>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <span className="rounded-pill bg-black/20 px-2 py-0.5 font-body text-[11px] font-semibold">
          {DIFFICULTY[make.difficulty] ?? 'Easy'}
        </span>
        <span className="rounded-pill bg-black/20 px-2 py-0.5 font-body text-[11px] font-semibold">
          {make.time_minutes} min
        </span>
        <span className="rounded-pill bg-black/20 px-2 py-0.5 font-body text-[11px] font-semibold">
          {MESS[make.mess_level] ?? 'tidy'}
        </span>
      </div>
      {make.materials.length > 0 && (
        <p className="font-body text-xs text-white">{make.materials.join(' + ')}</p>
      )}

      <span className="mt-1 inline-flex items-center gap-1 rounded-pill bg-white px-4 py-1.5 font-display text-sm font-bold text-library">
        ▶ Watch
      </span>
      {make.ai_generated && (
        <span className="font-body text-[10px] font-semibold text-white">AI-assisted</span>
      )}
    </div>
  );
}

function studioLabel(slug: string): string {
  return STUDIOS.find((s) => s.slug === slug)?.label ?? slug;
}
