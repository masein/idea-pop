'use client';

import { useTranslations } from 'next-intl';
import RewardPopup, { type RewardBadge, type RewardSummary } from './RewardPopup';

/** The S — Substitute practice is done: the kid made a new version of their idea and a
 *  prediction (nothing here says it works). Same reward popup as every badge. */
export default function SubstCelebration({
  badge,
  xp,
  onKeepExploring,
  onEnough,
  onClose,
  toolName = null,
  summary = null,
}: {
  badge: RewardBadge;
  xp: number | null;
  onKeepExploring: () => void;
  onEnough: () => void;
  onClose: () => void;
  /** XP and star progress for the achievement bar. */
  summary?: RewardSummary | null;
  /** Another creativity tool (brainstorm, mind map…): its own words instead of Substitute's. */
  toolName?: string | null;
}) {
  const t = useTranslations('story');
  return (
    <RewardPopup
      testId="subst-celebration"
      badge={badge}
      title={toolName ? t('tool_cel_title', { tool: toolName }) : t('subst_cel_title')}
      text={toolName ? t('tool_cel_text') : t('subst_cel_text')}
      xp={xp}
      primary={{ label: t('lab_keep_exploring'), onClick: onKeepExploring }}
      secondary={{ label: t('enough_today'), onClick: onEnough }}
      onClose={onClose}
      summary={summary}
    />
  );
}
