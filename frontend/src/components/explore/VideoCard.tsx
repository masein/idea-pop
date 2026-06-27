'use client';

import type { components } from '@/lib/api/schema';

type ExploreVideo = components['schemas']['ExploreVideo'];

export interface VideoCardProps {
  video: ExploreVideo;
  ageMode: 'young' | 'older';
  onSelect: (v: ExploreVideo) => void;
}

const TAXONOMY_EMOJI: Record<string, string> = {
  Cephalopoda: '🐙',
  Reptilia: '🦎',
  Aves: '🦅',
  Insecta: '🐝',
  Mammalia: '🦁',
  Amphibia: '🐸',
  Arachnida: '🕷️',
  Pisces: '🐟',
};

function getEmoji(taxonomy: string): string {
  return TAXONOMY_EMOJI[taxonomy] ?? '🎬';
}

export default function VideoCard({ video, ageMode, onSelect }: VideoCardProps) {
  return (
    <button
      type="button"
      data-testid="video-card"
      aria-label={video.title}
      onClick={() => onSelect(video)}
      className="rounded-card bg-white shadow-sm overflow-hidden w-full max-w-sm cursor-pointer text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2 relative"
    >
      {/* Thumbnail area */}
      <div className="h-36 bg-tint-lime flex items-center justify-center relative">
        <span className="text-5xl select-none" aria-hidden="true">
          {getEmoji(video.taxonomy)}
        </span>

        {video.ai_generated && (
          <span className="absolute top-2 left-2 bg-pricing/80 text-white text-xs px-2 py-0.5 rounded-pill font-body">
            AI
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="p-3 flex flex-col gap-1">
        <p className="font-display text-base text-ink leading-snug line-clamp-2">
          {video.title}
        </p>
        <p className="font-body text-xs text-ink/50">{video.taxonomy}</p>

        {ageMode === 'older' && video.design_secret && (
          <p className="font-body text-xs text-ink/60 italic line-clamp-1 mt-0.5">
            {video.design_secret}
          </p>
        )}
      </div>
    </button>
  );
}
