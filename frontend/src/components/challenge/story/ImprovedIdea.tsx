'use client';

import { useTranslations } from 'next-intl';
import RewardPopup, { type RewardBadge, type RewardSummary } from './RewardPopup';
import BadgeIcon from './BadgeIcon';
import { BADGE_ART, badgeArt, badgeName, type MissionBadgeKey } from './missionBadges';
import type { MissionStory } from './types';

/** Mission complete (page 9): the mission badge (River Explorer for Max) and the third star,
 *  in the shared reward popup, with everything earned on the mission. Shown once. */
export function MissionComplete({
  badge,
  summary,
  totals,
  story,
  onClose,
}: {
  badge: RewardBadge;
  summary: RewardSummary;
  /** Everything earned on this mission now. */
  totals: { xp: number; stars: number[]; badges: string[] };
  story: MissionStory | null;
  onClose: () => void;
}) {
  const t = useTranslations('stars');
  const tStory = useTranslations('story');
  const shown = totals.badges.filter((b): b is MissionBadgeKey => b in BADGE_ART);
  const all = [1, 2, 3].every((n) => totals.stars.includes(n));
  return (
    <RewardPopup
      testId="mission-complete"
      badge={badge}
      title={tStory('complete_title')}
      text={all ? t('three_text') : tStory('complete_text')}
      xp={null}
      summary={summary}
      primary={{ label: tStory('reward_continue'), onClick: onClose }}
      onClose={onClose}
    >
      {/* Everything earned on this mission. */}
      <div data-testid="mission-complete-totals" className="flex flex-col items-center gap-3 rounded-[20px] bg-[#FFF8E1] px-4 py-3">
        <p className="font-body text-sm font-extrabold uppercase tracking-wide text-[#7A5A00]">{tStory('complete_totals')}</p>
        <p data-testid="mission-complete-xp" className="rounded-pill bg-[#EAF5FC] px-4 py-1.5 font-body text-base font-extrabold text-[#1A6FA6]">
          {t('three_xp', { xp: totals.xp })}
        </p>
        {shown.length > 0 && (
          <ul data-testid="mission-complete-badges" className="flex flex-wrap justify-center gap-2" aria-label={tStory('badges_earned_title')}>
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
