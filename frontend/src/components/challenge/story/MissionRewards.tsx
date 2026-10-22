'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { fetchMissionRewards } from '@/lib/api/client';
import { badgeArt, badgeName, type MissionBadgeKey } from './missionBadges';
import type { MissionStory } from './types';

type Rewards = Awaited<ReturnType<typeof fetchMissionRewards>>;

/**
 * Where the kid's points came from on this mission, item by item, read from the saved reward
 * records: every badge and photo bonus, earned or not, its XP out of what it's worth, then the
 * badge count and the total out of the maximum. Optional things not done say "Not earned" or
 * "Not added" — no minus points, nothing about failing.
 */
export default function MissionRewards({
  challengeId,
  story = null,
  refreshKey = 0,
}: {
  challengeId: string;
  /** The challenge content: its own badge names. */
  story?: MissionStory | null;
  refreshKey?: number;
}) {
  const t = useTranslations('story');
  const [data, setData] = useState<Rewards | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    fetchMissionRewards(challengeId)
      .then((d) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [challengeId, refreshKey]);

  if (failed) return <p className="font-body text-base text-ink/70">{t('rewards_load_failed')}</p>;
  if (!data) return <div className="h-40 animate-pulse rounded-card bg-white" />;

  const badgesEarned = data.badges.filter((b) => b.xp > 0).length;
  const row = 'flex items-center justify-between gap-3 rounded-xl px-3 py-2';
  return (
    <section data-testid="mission-rewards" className="flex flex-col gap-3 rounded-card bg-white p-5">
      <h2 className="font-display text-2xl text-challenge">{t('rewards_title')}</h2>

      <p className="font-body text-xs font-extrabold uppercase tracking-wide text-[#4A5560]">{t('rewards_badges')}</p>
      <ul className="flex flex-col gap-1.5">
        {data.badges.map((b) => {
          const got = b.xp > 0;
          return (
            <li key={b.key} data-testid={`reward-badge-${b.key}`} data-earned={got} className={`${row} ${got ? 'bg-[#F3FBF5]' : 'bg-[#F4F6F8]'}`}>
              <span className="flex min-w-0 items-center gap-2 font-body text-base font-bold text-ink">
                <span aria-hidden="true">{badgeArt(story, b.key as MissionBadgeKey) ?? '🏅'}</span>
                <span className="truncate">{badgeName(story, b.key as MissionBadgeKey, t)}</span>
              </span>
              <span className="flex shrink-0 items-center gap-3 font-body text-sm font-semibold">
                <span className={got ? 'text-[#1E7A44]' : 'text-[#5B6878]'}>{got ? t('rewards_earned') : t('rewards_not_earned')}</span>
                <span dir="ltr" className="tabular-nums text-ink">
                  {b.xp}/{b.available} XP
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-1 font-body text-xs font-extrabold uppercase tracking-wide text-[#4A5560]">{t('rewards_photos')}</p>
      <ul className="flex flex-col gap-1.5">
        {data.photos.map((p) => {
          const got = p.xp > 0;
          return (
            <li key={p.key} data-testid={`reward-photo-${p.key}`} data-earned={got} className={`${row} ${got ? 'bg-[#F3FBF5]' : 'bg-[#F4F6F8]'}`}>
              <span className="min-w-0 font-body text-base font-bold text-ink">📷 {t(`photo_kind_${p.key}`)}</span>
              <span className="flex shrink-0 items-center gap-3 font-body text-sm font-semibold">
                <span className={got ? 'text-[#1E7A44]' : 'text-[#5B6878]'}>{got ? t('rewards_added') : t('rewards_not_added')}</span>
                <span dir="ltr" className="tabular-nums text-ink">
                  {p.xp}/{p.available} XP
                </span>
              </span>
            </li>
          );
        })}
      </ul>

      <div data-testid="rewards-total" className="mt-2 flex flex-col gap-1 rounded-2xl bg-challenge p-4 text-center text-white">
        <p className="font-body text-base font-bold">
          {t('rewards_badge_count', { earned: badgesEarned, total: data.badges.length })}
        </p>
        <p className="font-display text-3xl">
          <span dir="ltr">
            {data.xp_earned} / {data.xp_max} XP
          </span>
        </p>
        <p className="font-body text-sm text-white/90">{t('rewards_total_label')}</p>
      </div>
    </section>
  );
}
