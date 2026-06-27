import React from 'react';
import Image from 'next/image';

export interface ExploreCategoryCardProps {
  category: string;
  count?: number;
  color?: string;
  imageSrc?: string;
}

export default function ExploreCategoryCard({
  category,
  count,
  color = 'bg-tint-lime',
  imageSrc,
}: ExploreCategoryCardProps) {
  return (
    <div className={`rounded-card overflow-hidden ${color} relative w-44 h-48 flex flex-col justify-end p-4`}>
      {imageSrc && (
        <Image src={imageSrc} alt="" aria-hidden="true" fill className="object-cover opacity-20" sizes="176px" />
      )}
      <div className="relative z-10 flex flex-col gap-2">
        <p className="font-display text-ink text-lg leading-tight">{category}</p>
        {count !== undefined && (
          <span className="inline-flex items-center self-start rounded-pill bg-white/70 px-2.5 py-0.5 text-xs font-semibold font-body text-ink/70 backdrop-blur-sm">
            {count.toLocaleString()} animals
          </span>
        )}
      </div>
    </div>
  );
}
