'use client';

import { useEffect, useState } from 'react';
import AssetSlot from '@/components/AssetSlot';
import { fetchProjectPhoto } from '@/lib/api/client';

type KidProjectSummary = import('@/lib/api/schema').components['schemas']['KidProjectSummary'];

interface KidProjectCardProps {
  project: KidProjectSummary;
  onShare: (projectId: string) => void;
}

const VISIBILITY_LABELS: Record<string, string> = {
  private: 'Private',
  class: 'Class',
  public: 'Public',
};

export default function KidProjectCard({ project, onShare }: KidProjectCardProps) {
  // The list carries the photo's storage key, not a link: the photo comes with the kid's own token.
  const hasPhoto = ((project as { photo_keys?: string[] }).photo_keys?.length ?? 0) > 0;
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!hasPhoto) return;
    let url: string | null = null;
    let alive = true;
    fetchProjectPhoto(project.id)
      .then((blob) => {
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setPhotoUrl(url);
      })
      .catch(() => {});
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [hasPhoto, project.id]);

  const visLabel = project.visibility_pending
    ? 'Pending review'
    : (VISIBILITY_LABELS[project.visibility] ?? 'Private');

  return (
    <div
      data-testid="project-card"
      className="bg-white rounded-card shadow-sm overflow-hidden flex flex-col border border-ink/10"
    >
      {/* Photo */}
      {photoUrl ? (
        <div className="relative h-36 w-full">
          {/* A blob from the kid's own photo: next/image can't load these. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" data-testid="project-photo" className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="h-36 w-full bg-tint-blue">
          <AssetSlot id="PROFILE-PROJECT-001" />
        </div>
      )}

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="font-display text-sm text-ink leading-snug line-clamp-2">{project.title}</p>

        {project.challenge_title && (
          <p className="font-body text-xs text-ink/50">{project.challenge_title}</p>
        )}

        <div className="flex items-center justify-between mt-auto pt-1">
          <span
            data-testid="project-visibility"
            className="font-body text-xs text-ink/60"
          >
            {visLabel}
          </span>
          <button
            type="button"
            data-testid="project-share-btn"
            onClick={() => onShare(project.id)}
            className="font-body text-xs text-challenge underline hover:text-challenge/80 transition-colors"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}
