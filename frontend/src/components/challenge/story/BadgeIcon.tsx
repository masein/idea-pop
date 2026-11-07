'use client';

import AssetSlot from '@/components/AssetSlot';

/** A badge's art in a list or chip: its picture (e.g. Quizzy) or, until one exists, its Asset ID. */
export default function BadgeIcon({ art, className = 'h-6 w-6', compact = false }: { art: string; className?: string; compact?: boolean }) {
  if (/^\/|\.(png|webp|jpe?g|svg)$/i.test(art)) {
    // eslint-disable-next-line @next/next/no-img-element -- small badge artwork
    return <img src={art} alt="" aria-hidden="true" className={`inline-block shrink-0 object-contain ${className}`} />;
  }
  if (art.startsWith('asset:')) return <AssetSlot id={art.slice(6)} variant={compact ? 'dot' : 'chip'} className={compact ? '!me-0 !h-5 !w-5' : ''} />;
  return <AssetSlot />;
}
