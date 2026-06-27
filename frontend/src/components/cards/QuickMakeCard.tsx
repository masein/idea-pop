import React from 'react';
import Image from 'next/image';

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuickMakeCardProps {
  title: string;
  duration?: string;
  difficulty?: Difficulty;
  imageSrc?: string;
}

const difficultyStyles: Record<Difficulty, string> = {
  easy: 'bg-tint-lime text-ink',
  medium: 'bg-tint-cream text-ink',
  hard: 'bg-tint-blush text-ink',
};

export default function QuickMakeCard({ title, duration, difficulty, imageSrc }: QuickMakeCardProps) {
  return (
    <div className="rounded-card bg-white shadow-sm flex overflow-hidden h-20">
      <div className="relative w-20 flex-shrink-0 bg-tint-lime">
        {imageSrc ? (
          <Image src={imageSrc} alt="" aria-hidden="true" fill className="object-cover" sizes="80px" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl select-none opacity-40" aria-hidden="true">✏️</span>
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center gap-1 px-3 py-2 min-w-0">
        <p className="font-display text-ink text-sm leading-snug line-clamp-2">{title}</p>
        <div className="flex items-center gap-2">
          {duration && (
            <span className="font-body text-ink/60 text-xs">{duration}</span>
          )}
          {difficulty && (
            <span
              className={`rounded-pill px-2 py-0.5 text-xs font-semibold font-body capitalize ${difficultyStyles[difficulty]}`}
            >
              {difficulty}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
