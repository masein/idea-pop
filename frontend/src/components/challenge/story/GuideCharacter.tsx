'use client';

import { useTranslations } from 'next-intl';
import Inspired, { MeetCharacter } from '@/components/characters/Inspired';
import { CHARACTER_NAMES, useFirstMeet, type CharacterKey } from '@/lib/characters';

/** A helper character (Quizi for WH Questions) explaining a tool in a speech bubble. A clean
 *  round spot waits for the character's picture until it arrives. */
export default function GuideCharacter({
  character = 'quizi',
  text,
  image = null,
  testId,
  introReady = true,
}: {
  character?: CharacterKey;
  text: string;
  image?: string | null;
  testId?: string;
  /** False while narration or Popi's introduction of this character is still playing. */
  introReady?: boolean;
}) {
  const t = useTranslations('story');
  const name = CHARACTER_NAMES[character];
  useFirstMeet(character, introReady);
  return (
    <div data-testid={testId} className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:gap-3">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small character cut-out
        <MeetCharacter character={character} label={t('meet_character', { name })}>
          <img
            src={image}
            alt=""
            aria-hidden="true"
            className="quizzy-idle h-28 w-auto shrink-0 object-contain drop-shadow-[0_6px_8px_rgba(0,0,0,0.15)] sm:h-44"
          />
        </MeetCharacter>
      ) : (
        <span aria-hidden="true" className="h-24 w-24 shrink-0 rounded-full border-2 border-dashed border-[#9CC9E6] bg-white/60" />
      )}
      <div className="min-w-0 flex-1 rounded-[18px] bg-white px-4 py-3 shadow-sm">
        <p className="font-body text-sm font-bold text-challenge">{name}</p>
        <p dir="auto" className="whitespace-pre-line font-body text-lg font-semibold leading-snug text-ink">
          <Inspired text={text} />
        </p>
      </div>
    </div>
  );
}
