'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import AssetSlot from '@/components/AssetSlot';
import ModalClose from '@/components/ModalClose';
import { btnPrimary } from '@/components/challenge/buttons';
import {
  CHARACTER_NAMES,
  INSPA,
  closeCharacterDialog,
  markCharacterMet,
  subscribeCharacterDialog,
  type CharacterDialog,
  type CharacterKey,
} from '@/lib/characters';

/** A character's own badge, shown inside its popup card. `named`: the artwork carries the name. */
const CHARACTER_BADGE: Partial<Record<CharacterKey, { art: string; named: boolean }>> = {
  quizi: { art: '/challenge/max/badges/MAX-BADGE-001.webp', named: true },
};

/** Approved pictures; a character without one keeps its Asset ID spot until the art arrives. */
const CHARACTER_ART: Record<CharacterKey, { image: string } | { asset: string }> = {
  popi: { image: '/popi/popi.png' },
  quizi: { image: '/characters/quizzy.png' },
  scamper: { image: '/characters/scamper.webp' },
  conspy: { image: '/characters/conspy.webp' },
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
  const isIntro = dialog.kind === 'intro';
  const badge = isIntro ? CHARACTER_BADGE[dialog.character] : { art: `asset:${INSPA.asset}`, named: true };
  const badgeIsArt = !!badge && !badge.art.startsWith('asset:');
  // The name is the title, unless the badge's artwork already shows it.
  const title = isIntro ? CHARACTER_NAMES[dialog.character] : t('inspiration_title');
  const showTitle = !isIntro || !(badge?.named && badgeIsArt);

  // The one character popup: the character stands beside the card, large and moving; the words,
  // the badge (when the character has one) and the button are inside the card.
  return (
    <div
      data-testid={dialog.kind === 'intro' ? `character-intro-${dialog.character}` : 'inspiration-tip-dialog'}
      className="app-typography fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
    >
      <div className="my-auto flex w-full max-w-[400px] flex-col items-center sm:w-auto sm:max-w-none sm:flex-row">
        <span data-testid="character-popup-character" className="pointer-events-none relative z-[71] -mb-6 shrink-0 sm:-me-6 sm:mb-0 sm:self-center">
          {isIntro ? (
            <CharacterArt character={dialog.character} className="quizzy-idle h-40 w-auto drop-shadow-[0_10px_14px_rgba(0,0,0,0.25)] sm:h-72" />
          ) : (
            // Inspa's own picture is still pending (Master Asset Manifest).
            <span className="quizzy-idle block h-40 w-32 sm:h-72 sm:w-52">
              <AssetSlot id={INSPA.character} />
            </span>
          )}
        </span>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="story-pop relative flex w-full max-w-[400px] flex-col items-center gap-3 rounded-[1.75rem] bg-white p-6 pt-14 text-center shadow-xl sm:w-[420px] sm:ps-12"
        >
          <ModalClose onClose={close} testId="character-x" />
          {badge && (
            <span data-testid={isIntro ? 'character-badge' : 'inspa-badge'} title={isIntro ? CHARACTER_NAMES[dialog.character] : INSPA.name} className="block h-28 w-28">
              {badgeIsArt ? (
                // eslint-disable-next-line @next/next/no-img-element -- the character's own badge
                <img src={badge.art} alt="" aria-hidden="true" className="h-full w-full object-contain" />
              ) : (
                <AssetSlot id={badge.art.slice(6)} className="!rounded-full" />
              )}
            </span>
          )}
          {showTitle && <h2 dir="auto" className="font-display text-2xl text-challenge">{title}</h2>}
          <p className="whitespace-pre-line font-body text-lg font-semibold leading-snug text-ink">
            {dialog.kind === 'intro' ? t(`intro_${dialog.character}`) : t('inspiration_text')}
          </p>
          <button ref={buttonRef} type="button" data-testid="character-got-it" onClick={close} className={btnPrimary}>
            {t('got_it')}
          </button>
        </div>
      </div>
    </div>
  );
}
