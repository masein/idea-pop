'use client';

import type { KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { showCharacterIntro, showInspirationTip, type CharacterKey } from '@/lib/characters';

// "inspiration", "get inspired", "inspire us", and the Persian الهام with its endings.
const WORDS = /(\bget(?:ting)?\s+inspired\b|\binspir\w+|الهام[^\s،.!؟:؛]*)/gi;

function open(e: MouseEvent | KeyboardEvent) {
  // The word can sit inside a bigger button or card: only the explanation opens.
  e.preventDefault();
  e.stopPropagation();
  showInspirationTip();
}

/** A tappable word that explains what inspiration means. */
export function InspiredWord({ children }: { children: ReactNode }) {
  return (
    <span
      role="button"
      tabIndex={0}
      data-testid="inspiration-word"
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') open(e);
      }}
      className="cursor-help underline decoration-dotted decoration-2 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F3F63]"
    >
      {children}
    </span>
  );
}

/** Text in which every "inspiration" word offers its explanation. */
export default function Inspired({ text }: { text: string }) {
  const parts = text.split(WORDS);
  return (
    <>
      {parts.map((part, i) => (i % 2 === 1 ? <InspiredWord key={i}>{part}</InspiredWord> : part))}
    </>
  );
}

/** A character picture that says its introduction again when tapped. */
export function MeetCharacter({
  character,
  label,
  className = '',
  children,
}: {
  character: CharacterKey;
  /** What a screen reader hears, e.g. "About Popi". */
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={`meet-${character}`}
      aria-label={label}
      onClick={() => showCharacterIntro(character)}
      className={`shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63] ${className}`}
    >
      {children}
    </button>
  );
}
