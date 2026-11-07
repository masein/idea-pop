'use client';

import { createContext, useContext } from 'react';
import { useTranslations } from 'next-intl';

/** Which manifest set the pictures on this screen belong to (one challenge's CHALLENGE-SET-…). */
export const AssetScope = createContext<string | null>(null);

/**
 * The spot for a custom IDEA POP picture that isn't approved yet: a neutral box naming its
 * Asset ID from the Master Asset Manifest, never an emoji or a stand-in icon. Swap it for the
 * approved file when it arrives.
 * - box: fills its parent, with the ID and "Pending visual asset".
 * - chip: small, for badges and tiles, with the ID only.
 * - dot: the size of a letter, beside text; the ID is in its tooltip.
 */
export default function AssetSlot({
  id,
  variant = 'box',
  className = '',
}: {
  /** The Asset ID; without one, the screen's own set (AssetScope). */
  id?: string;
  variant?: 'box' | 'chip' | 'dot';
  className?: string;
}) {
  const t = useTranslations('assets');
  const scope = useContext(AssetScope);
  const assetId = id ?? scope ?? 'CHALLENGE-CARD-001';
  const label = `${assetId} · ${t('pending')}`;
  const base = 'border border-dashed border-[#9FB3C4] bg-[#F4F8FC] text-[#4A5560]';
  if (variant === 'dot') {
    return (
      <span
        data-asset-id={assetId}
        title={label}
        aria-hidden="true"
        className={`me-1 inline-block h-[0.85em] w-[0.85em] shrink-0 rounded-[3px] align-[-0.05em] ${base} ${className}`}
      />
    );
  }
  if (variant === 'chip') {
    return (
      <span
        data-asset-id={assetId}
        title={label}
        dir="ltr"
        className={`inline-flex shrink-0 items-center justify-center rounded-lg px-1.5 py-1 font-body text-[9px] font-bold leading-none ${base} ${className}`}
      >
        {assetId}
      </span>
    );
  }
  return (
    <span
      data-asset-id={assetId}
      title={label}
      className={`flex h-full w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl p-1 text-center font-body leading-tight ${base} ${className}`}
    >
      <span dir="ltr" className="break-all text-[10px] font-extrabold">{assetId}</span>
      <span className="text-[9px] font-semibold">{t('pending')}</span>
    </span>
  );
}
