'use client';

import Image from 'next/image';

type KidProjectSummary = import('@/lib/api/schema').components['schemas']['KidProjectSummary'];

interface KidProjectCardProps {
  project: KidProjectSummary;
  onShare: (projectId: string) => void;
}

const VISIBILITY_LABELS: Record<string, string> = {
  private: '🔒 Private',
  class: '🏫 Class',
  public: '🌍 Public',
};

export default function KidProjectCard({ project, onShare }: KidProjectCardProps) {
  const visLabel = project.visibility_pending
    ? '⏳ Pending review'
    : (VISIBILITY_LABELS[project.visibility] ?? '🔒 Private');

  return (
    <div
      data-testid="project-card"
      className="bg-white rounded-card shadow-sm overflow-hidden flex flex-col border border-ink/10"
    >
      {/* Photo */}
      {project.project_photo_url ? (
        <div className="relative w-full h-36">
          <Image
            src={project.project_photo_url}
            alt={`${project.title} photo`}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-full h-36 bg-tint-blue flex items-center justify-center text-4xl" aria-hidden="true">
          🔨
        </div>
      )}

      {/* Info */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <p className="font-display text-sm text-ink leading-snug line-clamp-2">{project.title}</p>

        {project.challenge_title && (
          <p className="font-body text-xs text-ink/50">⚡ {project.challenge_title}</p>
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
