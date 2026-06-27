'use client';

import { useEffect, useState } from 'react';
import { fetchExplore } from '@/lib/api/client';
import { useAgeMode } from '@/lib/hooks/useAgeMode';
import { useXpToast } from '@/lib/hooks/useXpToast';
import ExploreCategoryCard from '@/components/cards/ExploreCategoryCard';
import VideoCard from '@/components/explore/VideoCard';
import VideoPlayer from '@/components/explore/VideoPlayer';
import XpBurst from '@/components/explore/XpBurst';
import type { components } from '@/lib/api/schema';

type ExploreVideo = components['schemas']['ExploreVideo'];
type XpAwardResponse = components['schemas']['XpAwardResponse'];

const CATEGORIES = [
  {
    slug: 'masters_of_disguise' as const,
    label: 'Masters of Disguise',
    tagline: 'change to survive',
    color: 'bg-tint-blue',
    emoji: '🦎',
    catN: 'Category 1',
  },
  {
    slug: 'soft_engineers' as const,
    label: 'Soft Engineers',
    tagline: 'bodies that think',
    color: 'bg-tint-cream',
    emoji: '🐙',
    catN: 'Category 2',
  },
  {
    slug: 'speed_champions' as const,
    label: 'Speed Champions',
    tagline: 'ultimate movement',
    color: 'bg-tint-blush',
    emoji: '🦅',
    catN: 'Category 3',
  },
  {
    slug: 'master_builders' as const,
    label: 'Master Builders',
    tagline: 'construct perfect structures',
    color: 'bg-tint-lavender',
    emoji: '🐝',
    catN: 'Category 4',
  },
];

type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export default function ExplorePage() {
  const ageMode = useAgeMode();
  const { visible, award, show, dismiss } = useXpToast();

  const [videos, setVideos] = useState<ExploreVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategorySlug | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<ExploreVideo | null>(null);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchExplore({ per_page: 100 });
      setVideos((data as { items: ExploreVideo[] }).items ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleVideoComplete(xpAward: XpAwardResponse) {
    setSelectedVideo(null);
    show(xpAward);
  }

  const categoryVideos = selectedCategory
    ? videos.filter((v) => v.superpower_category === selectedCategory)
    : [];

  return (
    <div data-testid="explore-page" className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl text-ink">Animal Superpowers</h1>
          <p className="font-body text-ink/70 max-w-lg">
            Organised by superpower, not species — because that&apos;s how real engineers think.
          </p>
        </div>

        {/* Category cards */}
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-card h-48 bg-ink/10 w-44 flex-shrink-0"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : error ? (
          <p className="font-body text-ink/70">
            Something went wrong.{' '}
            <button
              type="button"
              onClick={load}
              className="underline text-explore font-semibold hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore rounded"
            >
              Try again
            </button>
          </p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {CATEGORIES.map((cat) => {
              const count = videos.filter((v) => v.superpower_category === cat.slug).length;
              const isActive = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  data-testid="explore-category-card"
                  aria-pressed={isActive}
                  aria-label={`${cat.label} — ${count} videos`}
                  onClick={() =>
                    setSelectedCategory(isActive ? null : cat.slug)
                  }
                  className={[
                    'flex-shrink-0 rounded-card transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2',
                    isActive ? 'ring-2 ring-explore ring-offset-2' : '',
                  ].join(' ')}
                >
                  <ExploreCategoryCard
                    category={cat.label}
                    count={count}
                    color={cat.color}
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Video grid */}
        {!loading && !error && selectedCategory && (
          <section aria-label={`${CATEGORIES.find((c) => c.slug === selectedCategory)?.label} videos`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryVideos.length === 0 ? (
                <p className="font-body text-ink/50 col-span-full">No videos in this category yet.</p>
              ) : (
                categoryVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    ageMode={ageMode}
                    onSelect={setSelectedVideo}
                  />
                ))
              )}
            </div>
          </section>
        )}
      </div>

      {/* Video player overlay */}
      {selectedVideo && (
        <VideoPlayer
          video={selectedVideo}
          ageMode={ageMode}
          onComplete={handleVideoComplete}
          onClose={() => setSelectedVideo(null)}
        />
      )}

      {/* XP burst toast */}
      {visible && award && (
        <XpBurst
          award={award}
          stickerEmoji="⭐"
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}
