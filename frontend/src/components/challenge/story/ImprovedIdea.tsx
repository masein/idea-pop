'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { btnPrimary } from '@/components/challenge/buttons';
import StarRow from '@/components/challenge/StarRow';
import RewardPopup from './RewardPopup';
import BadgeIcon from './BadgeIcon';
import { BADGE_ART, badgeArt, badgeName, type MissionBadgeKey } from './missionBadges';
import type { MissionStory } from './types';
import AssetSlot from '@/components/AssetSlot';

/**
 * The last page's improved idea: the kid writes (or keeps) the better version of their idea
 * and submits it. Submitting is what earns the third star; reaching the page does not.
 */
export function ImprovedIdeaBox({
  box,
  reference,
  submitted,
  onSubmit,
}: {
  box: { title: string; prompt: string; placeholder: string };
  /** The new version made on the Skills page, shown for reference (never sent for the kid). */
  reference: string | null;
  /** Already submitted: show it, saved. */
  submitted: string | null;
  /** Resolves true when the server saved it. */
  onSubmit: (text: string) => Promise<boolean>;
}) {
  const t = useTranslations('stars');
  const [text, setText] = useState(submitted ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'failed'>('idle');
  const ready = text.trim().length >= 3;
  return (
    <section data-testid="improved-idea" className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-sm">
      <h2 className="flex items-center gap-2 font-display text-2xl text-challenge">
        <AssetSlot id="CHALLENGE-UI-004" variant="dot" />
        {box.title}
      </h2>
      {submitted ? (
        <>
          <p dir="auto" data-testid="improved-idea-saved" className="whitespace-pre-line rounded-xl bg-[#F3FBF5] px-3 py-2 font-body text-base font-semibold text-[#1d7a3a]">
            {submitted}
          </p>
          <p className="font-body text-sm font-bold text-[#7A5A00]">✓ {t('improved_saved')}</p>
        </>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!ready) return;
            setState('saving');
            setState((await onSubmit(text.trim())) ? 'idle' : 'failed');
          }}
        >
          {reference && (
            <div data-testid="improved-idea-reference" className="rounded-xl bg-[#EAF5FC] px-3 py-2">
              <p className="font-body text-sm font-extrabold text-[#135A85]">{t('improved_reference')}</p>
              <p dir="auto" className="whitespace-pre-line font-body text-sm text-ink">{reference}</p>
            </div>
          )}
          <label htmlFor="improved-idea-input" className="font-body text-base font-semibold text-ink">
            {box.prompt}
          </label>
          <textarea
            id="improved-idea-input"
            data-testid="improved-idea-input"
            rows={4}
            maxLength={1200}
            dir="auto"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={box.placeholder}
            className="w-full resize-none rounded-card border border-ink/20 px-3 py-2 font-body text-base focus:outline-none focus:ring-2 focus:ring-challenge"
          />
          <p className="font-body text-sm text-[#4A5560]">{t('improved_hint')}</p>
          <button type="submit" data-testid="improved-idea-submit" disabled={!ready || state === 'saving'} className={btnPrimary}>
            {state === 'saving' ? t('saving') : t('improved_submit')}
          </button>
          {state === 'failed' && (
            <p role="status" className="rounded-xl bg-[#FFF7E0] px-3 py-2 font-body text-base text-[#5a4300]">
              {t('improved_failed')}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

/** All three stars: the challenge done at its highest level. Only shown when all three are earned. */
export function ThreeStarCelebration({
  xp,
  badges,
  story,
  onClose,
}: {
  /** XP earned on this challenge. */
  xp: number | null;
  badges: string[];
  story: MissionStory | null;
  onClose: () => void;
}) {
  const t = useTranslations('stars');
  const tStory = useTranslations('story');
  const shown = badges.filter((b): b is MissionBadgeKey => b in BADGE_ART);
  return (
    <RewardPopup
      testId="three-star-celebration"
      title={t('three_title')}
      text={t('three_text')}
      xp={null}
      primary={{ label: tStory('reward_continue'), onClick: onClose }}
    >
      <div className="flex flex-col items-center gap-3">
        <StarRow stars={[1, 2, 3]} size={52} pop={[1, 2, 3]} />
        {xp !== null && (
          <p data-testid="three-star-xp" className="rounded-pill bg-[#EAF5FC] px-4 py-1.5 font-body text-base font-extrabold text-[#1A6FA6]">
            <AssetSlot id="CHALLENGE-UI-004" variant="dot" />{t('three_xp', { xp })}
          </p>
        )}
        {shown.length > 0 && (
          <ul data-testid="three-star-badges" className="flex flex-wrap justify-center gap-2" aria-label={tStory('badges_earned_title')}>
            {shown.map((b) => (
              <li key={b} className="rounded-pill bg-[#fff5d1] px-3 py-1.5 font-body text-sm font-bold text-[#6b4d00]">
                <BadgeIcon art={badgeArt(story, b)} className="h-5 w-5 align-[-4px]" /> {badgeName(story, b, tStory)}
              </li>
            ))}
          </ul>
        )}
      </div>
    </RewardPopup>
  );
}
