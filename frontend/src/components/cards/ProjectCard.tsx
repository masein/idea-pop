import React from 'react';

export type Visibility = 'private' | 'class' | 'public';

export interface ProjectCardProps {
  title: string;
  childNickname?: string;
  imageSrc?: string;
  aiGenerated?: boolean;
  visibility?: Visibility;
}

const visibilityStyles: Record<Visibility, { label: string; className: string }> = {
  private: { label: 'Private', className: 'bg-ink/10 text-ink/60' },
  class: { label: 'Class', className: 'bg-challenge/15 text-challenge' },
  public: { label: 'Public', className: 'bg-explore/15 text-explore' },
};

export default function ProjectCard({
  title,
  childNickname,
  imageSrc,
  aiGenerated,
  visibility,
}: ProjectCardProps) {
  const vis = visibility ? visibilityStyles[visibility] : null;

  return (
    <div className="rounded-card bg-white shadow-sm overflow-hidden flex flex-col w-48">
      <div className="relative h-32 bg-tint-lavender">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl select-none opacity-30" aria-hidden="true">🖼️</span>
          </div>
        )}
        {aiGenerated && (
          <span className="absolute top-2 ltr:left-2 rtl:right-2 rounded-pill bg-pricing/90 text-white text-xs font-semibold font-body px-2.5 py-0.5 backdrop-blur-sm">
            AI
          </span>
        )}
      </div>
      <div className="px-3 py-2.5 flex flex-col gap-1">
        <p className="font-display text-ink text-sm leading-snug line-clamp-2">{title}</p>
        <div className="flex items-center justify-between gap-2">
          {childNickname && (
            <span className="font-body text-ink/50 text-xs truncate">{childNickname}</span>
          )}
          {vis && (
            <span className={`rounded-pill px-2 py-0.5 text-xs font-semibold font-body flex-shrink-0 ${vis.className}`}>
              {vis.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
