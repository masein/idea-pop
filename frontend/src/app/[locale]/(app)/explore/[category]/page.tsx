'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
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
    slug: 'masters_of_disguise',
    label: 'Masters of Disguise',
    tagline: 'change to survive',
    color: 'bg-tint-blue',
    emoji: '🦎',
    catN: 'Category 1',
  },
  {
    slug: 'soft_engineers',
    label: 'Soft Engineers',
    tagline: 'bodies that think',
    color: 'bg-tint-cream',
    emoji: '🐙',
    catN: 'Category 2',
  },
  {
    slug: 'speed_champions',
    label: 'Speed Champions',
    tagline: 'ultimate movement',
    color: 'bg-tint-blush',
    emoji: '🦅',
    catN: 'Category 3',
  },
  {
    slug: 'master_builders',
    label: 'Master Builders',
    tagline: 'construct perfect structures',
    color: 'bg-tint-lavender',
    emoji: '🐝',
    catN: 'Category 4',
  },
];

export default function CategoryPage() {
  const params = useParams<{ locale: string; category: string }>();
  const category = params.category ?? '';

  const ageMode = useAgeMode();
  const { visible, award, show, dismiss } = useXpToast();

  const [videos, setVideos] = useState<ExploreVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<ExploreVideo | null>(null);

  const catMeta = CATEGORIES.find((c) => c.slug === category);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const data = await fetchExplore({ superpower_category: category, per_page: 100 });
      setVideos((data as { items: ExploreVideo[] }).items ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (category) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  function handleVideoComplete(xpAward: XpAwardResponse) {
    setSelectedVideo(null);
    show(xpAward);
  }

  return (
    <div data-testid="category-page" className="p-6 md:p-8">
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        {/* Back link */}
        <Link
          href="/explore"
          className="inline-flex items-center gap-1 font-body text-sm text-ink/60 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore rounded"
        >
          <span aria-hidden="true">←</span> Animal Superpowers
        </Link>

        {/* Category header */}
        {catMeta ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="text-4xl select-none" aria-hidden="true">
                {catMeta.emoji}
              </span>
              <div>
                <h1 className="font-display text-3xl text-ink">{catMeta.label}</h1>
                <p className="font-body text-ink/60 capitalize">{catMeta.tagline}</p>
              </div>
            </div>
          </div>
        ) : (
          <h1 className="font-display text-3xl text-ink capitalize">
            {category.replace(/_/g, ' ')}
          </h1>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-card h-48 bg-ink/10"
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
        ) : videos.length === 0 ? (
          <p className="font-body text-ink/50">No videos in this category yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                ageMode={ageMode}
                onSelect={setSelectedVideo}
              />
            ))}
          </div>
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
