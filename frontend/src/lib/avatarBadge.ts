'use client';

import { useEffect, useState } from 'react';
import { fetchChallengeProgress, fetchChallenges } from '@/lib/api/client';
import { missionStorage } from '@/lib/api/guest';
import { badgeArt, badgeName } from '@/components/challenge/story/missionBadges';
import type { MissionStory } from '@/components/challenge/story/types';

/**
 * The mission badge shown on the kid's avatar: the newest finished mission's badge (River
 * Explorer after Max). A newer mission's badge replaces it on the avatar; every badge stays in
 * the kid's collection. Remembered on this device when a mission is finished; otherwise the
 * last finished mission (by the server's progress) is used.
 */

const KEY = 'ideapop:avatar-badge';

function who() {
  try {
    const raw = localStorage.getItem('kidProfile');
    return (raw ? (JSON.parse(raw) as { nickname?: string }).nickname : null) || 'kid';
  } catch {
    return 'kid';
  }
}

/** A mission was just finished (its mission badge earned): it goes on the avatar. */
export function rememberAvatarBadge(challengeId: string) {
  try {
    missionStorage()?.setItem(`${KEY}:${who()}`, JSON.stringify({ challengeId, at: Date.now() }));
  } catch {
    /* storage blocked: the server's progress still finds it */
  }
}

export type AvatarBadge = { art: string; name: string };

/** The badge for the avatar, or null when no mission is finished yet. */
export function useAvatarBadge(t: (k: string) => string): AvatarBadge | null {
  const [badge, setBadge] = useState<AvatarBadge | null>(null);
  useEffect(() => {
    let cancelled = false;
    let remembered: string | null = null;
    try {
      const raw = missionStorage()?.getItem(`${KEY}:${who()}`);
      remembered = raw ? (JSON.parse(raw) as { challengeId: string }).challengeId : null;
    } catch {
      /* ignore */
    }
    (async () => {
      const list = (await fetchChallenges().catch(() => [])) as { id: string; story?: unknown }[];
      if (cancelled || list.length === 0) return;
      const progress = await fetchChallengeProgress(list.map((c) => c.id)).catch(() => []);
      const finished = progress.filter((p) => p.badges.includes('river')).map((p) => p.challenge_id);
      if (finished.length === 0) return;
      const id = remembered && finished.includes(remembered) ? remembered : finished[finished.length - 1];
      const story = (list.find((c) => c.id === id)?.story ?? null) as MissionStory | null;
      if (!cancelled) setBadge({ art: badgeArt(story, 'river'), name: badgeName(story, 'river', t) });
    })();
    return () => {
      cancelled = true;
    };
    // t is stable for the page's language.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return badge;
}
