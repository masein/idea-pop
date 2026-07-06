'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { fetchExplore } from '@/lib/api/client';
import { useAgeMode } from '@/lib/hooks/useAgeMode';
import { useXpToast } from '@/lib/hooks/useXpToast';
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
    card: '#C0F0FF',
    ink: '#0E3742',
    avatar: '/explore/reptile-avatar.png',
    icon: '/explore/reptile-icon.png',
  },
  {
    slug: 'soft_engineers' as const,
    label: 'Soft Engineers',
    tagline: 'bodies that think',
    card: '#F1D8FB',
    ink: '#46204F',
    avatar: '/explore/mollusca-avatar.png',
    icon: null,
  },
  {
    slug: 'speed_champions' as const,
    label: 'Speed Champions',
    tagline: 'ultimate movement',
    card: '#F9DED7',
    ink: '#63281B',
    avatar: '/explore/bird-avatar.png',
    icon: '/explore/bird-icon.png',
  },
  {
    slug: 'master_builders' as const,
    label: 'Master Builders',
    tagline: 'construct perfect structures',
    card: '#FBF7D5',
    ink: '#494015',
    avatar: '/explore/arthropoda-avatar.png',
    icon: '/explore/arthropoda-icon.png',
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
  const activeMeta = CATEGORIES.find((c) => c.slug === selectedCategory);

  return (
    <div data-testid="explore-page" className="p-6 md:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold text-ink">Animal Superpowers</h1>
          <p className="max-w-lg font-body font-semibold text-ink/70">
            Grouped by superpower, not species — because that&apos;s how real engineers think.
          </p>
        </div>

        {/* Category cards */}
        {loading ? (
          <div className="grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-52 animate-pulse rounded-[1.75rem] bg-ink/10"
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
              className="rounded font-semibold text-explore underline hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore"
            >
              Try again
            </button>
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2">
            {CATEGORIES.map((cat) => {
              const count = videos.filter((v) => v.superpower_category === cat.slug).length;
              const isActive = selectedCategory === cat.slug;
              return (
                <button
                  key={cat.slug}
                  type="button"
                  data-testid="explore-category-card"
                  aria-pressed={isActive}
                  aria-label={`${cat.label} — ${count} animals`}
                  onClick={() => setSelectedCategory(isActive ? null : cat.slug)}
                  className="group relative block rounded-[1.75rem] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2"
                >
                  <div
                    className={[
                      'relative h-52 rounded-[1.75rem] px-6 pt-5 transition-transform duration-150 group-hover:-translate-y-0.5',
                      isActive ? 'ring-4 ring-explore' : 'ring-1 ring-black/5',
                    ].join(' ')}
                    style={{ backgroundColor: cat.card }}
                  >
                    <h2
                      className="relative z-20 font-display text-2xl font-bold leading-tight"
                      style={{ color: cat.ink }}
                    >
                      {cat.label}
                    </h2>
                    <p
                      className="relative z-20 mt-0.5 font-body text-sm font-semibold capitalize"
                      style={{ color: cat.ink }}
                    >
                      {cat.tagline}
                    </p>
                    <span
                      className="relative z-20 mt-3 inline-flex items-center rounded-pill bg-white/70 px-3 py-1 font-body text-xs font-bold text-ink/70 backdrop-blur-sm"
                    >
                      {count} {count === 1 ? 'animal' : 'animals'}
                    </span>

                    {/* soft circle behind the animal */}
                    <div
                      aria-hidden="true"
                      className="absolute bottom-3 right-4 h-32 w-32 rounded-full bg-white/25"
                    />

                    {/* hero avatar — overflows below the card */}
                    <Image
                      src={cat.avatar}
                      alt=""
                      aria-hidden="true"
                      width={240}
                      height={288}
                      className="pointer-events-none absolute -bottom-6 right-0 z-10 h-60 w-auto object-contain drop-shadow-sm"
                      sizes="240px"
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Video grid */}
        {!loading && !error && selectedCategory && (
          <section aria-label={`${activeMeta?.label} videos`} className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              {activeMeta?.icon && (
                <Image
                  src={activeMeta.icon}
                  alt=""
                  aria-hidden="true"
                  width={48}
                  height={48}
                  className="h-10 w-10 object-contain"
                />
              )}
              <h2 className="font-display text-2xl font-bold text-ink">{activeMeta?.label}</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryVideos.length === 0 ? (
                <p className="col-span-full font-body text-ink/50">
                  No videos in this superpower yet.
                </p>
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
      {visible && award && <XpBurst award={award} stickerEmoji="⭐" onDismiss={dismiss} />}
    </div>
  );
}
