'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import AssetSlot from '@/components/AssetSlot';
import { btnPrimary } from '@/components/challenge/buttons';
import {
  CHARACTER_NAMES,
  closeCharacterDialog,
  markCharacterMet,
  subscribeCharacterDialog,
  type CharacterDialog,
  type CharacterKey,
} from '@/lib/characters';

/** Approved pictures; a character without one keeps its Asset ID spot until the art arrives. */
const CHARACTER_ART: Record<CharacterKey, { image: string } | { asset: string }> = {
  popi: { image: '/popi/popi.png' },
  quizi: { image: '/characters/quizzy.png' },
  scamper: { asset: 'SCAMPER-CHAR-001' },
  conspy: { asset: 'CONSPY-CHAR-001' },
};

export function CharacterArt({ character, className = '' }: { character: CharacterKey; className?: string }) {
  const art = CHARACTER_ART[character];
  if ('image' in art) {
    // eslint-disable-next-line @next/next/no-img-element -- a transparent character cut-out
    return <img src={art.image} alt="" aria-hidden="true" className={`object-contain ${className}`} />;
  }
  return (
    <span className={`block ${className}`}>
      <AssetSlot id={art.asset} />
    </span>
  );
}

/** The one dialog for character introductions and the "inspiration" explanation. */
export default function CharacterDialogHost() {
  const t = useTranslations('characters');
  const [dialog, setDialog] = useState<CharacterDialog | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => subscribeCharacterDialog(setDialog), []);
  useEffect(() => {
    if (dialog) buttonRef.current?.focus({ preventScroll: true });
  }, [dialog]);

  if (!dialog) return null;

  const close = () => {
    if (dialog.kind === 'intro') markCharacterMet(dialog.character);
    closeCharacterDialog();
  };
  const title = dialog.kind === 'intro' ? CHARACTER_NAMES[dialog.character] : t('inspiration_title');

  return (
    <div
      data-testid={dialog.kind === 'intro' ? `character-intro-${dialog.character}` : 'inspiration-tip-dialog'}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="story-pop flex w-full max-w-sm flex-col items-center gap-3 rounded-[1.5rem] bg-white p-6 text-center shadow-xl"
      >
        {dialog.kind === 'intro' && <CharacterArt character={dialog.character} className="h-36 w-36" />}
        <h2 dir="auto" className="font-display text-2xl text-challenge">{title}</h2>
        <p className="font-body text-lg font-semibold leading-snug text-ink">
          {dialog.kind === 'intro' ? t(`intro_${dialog.character}`) : t('inspiration_text')}
        </p>
        <button ref={buttonRef} type="button" data-testid="character-got-it" onClick={close} className={btnPrimary}>
          {t('got_it')}
        </button>
      </div>
    </div>
  );
}
