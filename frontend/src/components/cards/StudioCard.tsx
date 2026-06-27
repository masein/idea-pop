import React from 'react';

export type StudioAccent = 'explore' | 'library' | 'challenge';

export interface StudioCardProps {
  title: string;
  subtitle?: string;
  imageSrc?: string;
  tag?: string;
  accent: StudioAccent;
}

const tagColor: Record<StudioAccent, string> = {
  explore: 'bg-explore text-white',
  library: 'bg-library text-white',
  challenge: 'bg-challenge text-white',
};

const imageBg: Record<StudioAccent, string> = {
  explore: 'bg-tint-lime',
  library: 'bg-tint-cream',
  challenge: 'bg-tint-blue',
};

export default function StudioCard({ title, subtitle, imageSrc, tag, accent }: StudioCardProps) {
  return (
    <div className="rounded-card bg-white shadow-sm overflow-hidden flex flex-col w-56">
      <div className={`relative h-32 ${imageBg[accent]}`}>
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc} alt={title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl select-none opacity-40" aria-hidden="true">🖼️</span>
          </div>
        )}
        {tag && (
          <span
            className={`absolute top-2 ltr:right-2 rtl:left-2 rounded-pill px-2.5 py-0.5 text-xs font-semibold font-body ${tagColor[accent]}`}
          >
            {tag}
          </span>
        )}
      </div>
      <div className="px-4 py-3 flex flex-col gap-1">
        <p className="font-display text-ink text-sm leading-snug line-clamp-2">{title}</p>
        {subtitle && (
          <p className="font-body text-ink/60 text-xs leading-snug line-clamp-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
