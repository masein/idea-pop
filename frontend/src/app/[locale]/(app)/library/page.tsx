'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchStudios, fetchQuickMakes } from '@/lib/api/client';
import type { components } from '@/lib/api/schema';
import QuickMakeCard from '@/components/cards/QuickMakeCard';
import CourseCard from '@/components/library/CourseCard';

type StudioCountResponse = components['schemas']['StudioCountResponse'];
type QuickMakePageResponse = components['schemas']['QuickMakePageResponse'];
type CourseDetailResponse = components['schemas']['CourseDetailResponse'];

// ── Studio config ─────────────────────────────────────────────────────────────

const STUDIOS = [
  { slug: 'craft',   label: 'Craft & Build',    emoji: '🔨', bg: 'bg-tint-cream'    },
  { slug: 'art',     label: 'Art & Sketching',   emoji: '🎨', bg: 'bg-tint-lavender' },
  { slug: 'music',   label: 'Music & Sound',     emoji: '🎵', bg: 'bg-tint-blush'    },
  { slug: 'code',    label: 'Code & Games',      emoji: '💻', bg: 'bg-tint-blue'     },
  { slug: 'science', label: 'Science Lab',       emoji: '🔬', bg: 'bg-tint-lime'     },
  { slug: 'nature',  label: 'Nature Design',     emoji: '🌿', bg: 'bg-tint-cream'    },
];

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_CONTINUE_COURSE: CourseDetailResponse = {
  id: 'mock',
  title: 'Drawing Animals 101',
  slug: 'drawing-animals-101',
  studio: 'art',
  creator_id: 'mock',
  summary: 'Learn to draw your favourite animals step by step.',
  created_at: '2024-01-01T00:00:00Z',
  lessons: [],
};

interface MissionMake {
  title: string;
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

const MISSION_MAKES: MissionMake[] = [
  { title: 'Paper bridges',         duration: '20 min', difficulty: 'easy'   },
  { title: 'Strong shapes: triangles', duration: '15 min', difficulty: 'easy'   },
  { title: 'Rope & knots',          duration: '30 min', difficulty: 'medium' },
];

// ── Skeleton placeholder ──────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Loading library" aria-busy="true">
      <div className="animate-pulse rounded-card h-24 bg-ink/10" />
      <div className="animate-pulse rounded-card h-24 bg-ink/10" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [studioCounts, setStudioCounts] = useState<StudioCountResponse[]>([]);
  const [quickMakes, setQuickMakes] = useState<QuickMakePageResponse>({
    items: [],
    total: 0,
    page: 1,
    per_page: 6,
  });
  const [activeStudio, setActiveStudio] = useState<string | null>(null);
  const [studioLoading, setStudioLoading] = useState(false);

  // Initial parallel fetch
  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchStudios(), fetchQuickMakes({ per_page: 6 })])
      .then(([studios, makes]) => {
        if (cancelled) return;
        setStudioCounts(studios as StudioCountResponse[]);
        setQuickMakes(makes as QuickMakePageResponse);
      })
      .catch(() => {
        // Silently fail — show empty state
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Re-fetch quick makes when active studio changes
  useEffect(() => {
    if (loading) return; // don't run before initial load completes
    let cancelled = false;
    setStudioLoading(true);
    fetchQuickMakes({ per_page: 6, studio: activeStudio ?? undefined })
      .then((makes) => {
        if (cancelled) return;
        setQuickMakes(makes as QuickMakePageResponse);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setStudioLoading(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStudio]);

  const difficultyLabel = (d: number): 'easy' | 'medium' | 'hard' =>
    d === 1 ? 'easy' : d === 2 ? 'medium' : 'hard';

  return (
    <div
      data-testid="library-page"
      className="p-6 md:p-8 max-w-4xl mx-auto flex flex-col gap-8"
    >
      {/* ── Continue where you left off ──────────────────────────────────── */}
      <section aria-label="Continue where you left off">
        <h2 className="font-display text-xl text-ink mb-4">Continue where you left off</h2>
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className="max-w-xs">
            <CourseCard
              course={MOCK_CONTINUE_COURSE}
              progress={{ completed: 3, total: 6 }}
              onClick={() => router.push('/library/courses/mock')}
            />
          </div>
        )}
      </section>

      {/* ── From your mission ────────────────────────────────────────────── */}
      <section aria-label="From your mission">
        <h2 className="font-display text-xl text-ink mb-1">
          From your mission: <em>Help Max cross the river</em>
        </h2>
        <p className="font-body text-sm text-ink/50 mb-4">These quick makes help with your challenge</p>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {MISSION_MAKES.map((m) => (
            <div key={m.title} className="flex-shrink-0 w-56">
              <QuickMakeCard
                title={m.title}
                duration={m.duration}
                difficulty={m.difficulty}
              />
              <p className="font-body text-xs text-library mt-1 px-1">
                ★ helps your challenge
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Browse by studio ─────────────────────────────────────────────── */}
      <section aria-label="Browse by studio">
        <h2 className="font-display text-xl text-ink mb-4">Browse by studio</h2>
        {loading ? (
          <LoadingSkeleton />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STUDIOS.map((s) => {
              const count = studioCounts.find((c) => c.studio === s.slug)?.quick_make_count ?? 0;
              const isActive = activeStudio === s.slug;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setActiveStudio(isActive ? null : s.slug)}
                  aria-pressed={isActive}
                  aria-label={`${s.label}: ${count} quick makes`}
                  className={`${s.bg} rounded-card px-4 py-4 flex flex-col items-start gap-1 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-library focus-visible:ring-offset-2 ${
                    isActive ? 'ring-2 ring-library shadow-md' : ''
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">{s.emoji}</span>
                  <span className="font-display text-sm text-ink leading-snug">{s.label}</span>
                  <span className="font-body text-xs text-ink/50">{count} makes</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Quick makes ──────────────────────────────────────────────────── */}
      <section aria-label="Quick makes">
        <h2 className="font-display text-xl text-ink mb-4">
          Quick makes
          {activeStudio && (
            <span className="font-body text-base text-ink/50 ml-2">
              — {STUDIOS.find((s) => s.slug === activeStudio)?.label}
            </span>
          )}
        </h2>
        {loading || studioLoading ? (
          <LoadingSkeleton />
        ) : quickMakes.items.length === 0 ? (
          <p className="font-body text-sm text-ink/50">No quick makes yet — check back soon!</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickMakes.items.map((m) => (
              <QuickMakeCard
                key={m.id}
                title={m.title}
                duration={`${m.time_minutes} min`}
                difficulty={difficultyLabel(m.difficulty)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
