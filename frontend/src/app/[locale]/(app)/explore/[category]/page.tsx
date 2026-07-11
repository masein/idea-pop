'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
    color: 'bg-tint-blue',
    emoji: '🦎',
  },
  {
    slug: 'soft_engineers' as const,
    color: 'bg-tint-cream',
    emoji: '🐙',
  },
  {
    slug: 'speed_champions' as const,
    color: 'bg-tint-blush',
    emoji: '🦅',
  },
  {
    slug: 'master_builders' as const,
    color: 'bg-tint-lavender',
    emoji: '🐝',
  },
];

export default function CategoryPage() {
  const t = useTranslations('explore');
  const tErrors = useTranslations('errors');
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
          <span aria-hidden="true">←</span> {t('heading')}
        </Link>

        {/* Category header */}
        {catMeta ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <span className="text-4xl select-none" aria-hidden="true">
                {catMeta.emoji}
              </span>
              <div>
                <h1 className="font-display text-3xl text-ink">
                  {t(`categories.${catMeta.slug}`)}
                </h1>
                <p className="font-body text-ink/60 capitalize">
                  {t(`taglines.${catMeta.slug}`)}
                </p>
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
            {tErrors('something_went_wrong')}{' '}
            <button
              type="button"
              onClick={load}
              className="underline text-explore font-semibold hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore rounded"
            >
              {tErrors('try_again')}
            </button>
          </p>
        ) : videos.length === 0 ? (
          <p className="font-body text-ink/50">{t('no_videos_category')}</p>
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
