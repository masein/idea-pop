import React from 'react';
import Image from 'next/image';

export type PersonaAccent = 'explore' | 'library' | 'challenge';

export interface PersonaCardProps {
  name: string;
  role: string;
  imageSrc?: string;
  accent: PersonaAccent;
}

const accentBorder: Record<PersonaAccent, string> = {
  explore: 'border-explore',
  library: 'border-library',
  challenge: 'border-challenge',
};

export default function PersonaCard({ name, role, imageSrc, accent }: PersonaCardProps) {
  return (
    <div
      className={`relative rounded-card overflow-hidden bg-ink border-2 ${accentBorder[accent]} w-48 h-64 flex flex-col`}
    >
      <div className="relative flex-1">
        {imageSrc ? (
          <Image src={imageSrc} alt={name} fill className="object-cover object-top" sizes="192px" />
        ) : (
          <div className="absolute inset-0 bg-ink/60 flex items-center justify-center">
            <span className="text-5xl select-none" aria-hidden="true">👤</span>
          </div>
        )}
        {/* Bottom gradient scrim */}
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-ink/90 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-6">
        <p className="font-display text-white text-base leading-tight truncate">{name}</p>
        <p className="font-body text-white/70 text-xs mt-0.5 truncate">{role}</p>
      </div>
    </div>
  );
}
