'use client';

import { type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import RewardPopup from './RewardPopup';

/** Build and Test is done. No uploads here: the photo is on the page itself. Shows what the kid
 *  has actually earned for it, and gives nothing by itself. */
export default function LabCelebration({
  hero,
  xp,
  star = null,
  onKeepExploring,
  onEnough,
  onClose,
}: {
  /** Who the kid is helping. */
  hero: string;
  /** XP already earned for this section (null while it's being read, or when there is none). */
  xp: number | null;
  /** The star this documentation earned, shown once it is given. */
  star?: ReactNode;
  onKeepExploring: () => void;
  onEnough: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('story');
  return (
    <RewardPopup
      testId="lab-celebration"
      title={t('lab_done_title')}
      text={t('lab_done_text', { hero })}
      xp={xp}
      primary={{ label: t('reward_continue'), onClick: onKeepExploring }}
      secondary={{ label: t('enough_today'), onClick: onEnough }}
      onClose={onClose}
    >
      {star}
    </RewardPopup>
  );
}
