'use client';

import { useTranslations } from 'next-intl';
import RewardPopup, { type RewardBadge } from './RewardPopup';

/** The S — Substitute practice is done: the kid made a new version of their idea and a
 *  prediction (nothing here says it works). Same reward popup as every badge. */
export default function SubstCelebration({
  badge,
  xp,
  onKeepExploring,
  onEnough,
}: {
  badge: RewardBadge;
  xp: number | null;
  onKeepExploring: () => void;
  onEnough: () => void;
}) {
  const t = useTranslations('story');
  return (
    <RewardPopup
      testId="subst-celebration"
      badge={badge}
      title={t('subst_cel_title')}
      text={t('subst_cel_text')}
      xp={xp}
      primary={{ label: t('lab_keep_exploring'), onClick: onKeepExploring }}
      secondary={{ label: t('enough_today'), onClick: onEnough }}
    />
  );
}
