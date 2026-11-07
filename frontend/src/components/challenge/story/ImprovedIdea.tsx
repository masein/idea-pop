'use client';

import { useTranslations } from 'next-intl';
import StarRow from '@/components/challenge/StarRow';
import RewardPopup from './RewardPopup';
import BadgeIcon from './BadgeIcon';
import { BADGE_ART, badgeArt, badgeName, type MissionBadgeKey } from './missionBadges';
import type { MissionStory } from './types';
import AssetSlot from '@/components/AssetSlot';

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
      onClose={onClose}
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
