'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchChallengeProgress, type ChallengeProgress } from '@/lib/api/client';

/**
 * One shared achievement state (stars, badges, XP per challenge) for every screen: the
 * Challenges cards and the challenge header read it from the server, and anything that
 * earns a star or badge announces it so all of them refresh together.
 */
const EVENT = 'ideapop:challenge-progress';

/** Tell every screen that a challenge's stars, badges or XP changed. */
export function announceChallengeProgress(challengeId: string) {
  try {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: challengeId }));
  } catch {
    /* ignore */
  }
}

export function useChallengeProgress(ids: string[]) {
  const key = ids.join(',');
  const [progress, setProgress] = useState<Record<string, ChallengeProgress>>({});
  const load = useCallback(() => {
    if (!key) return;
    fetchChallengeProgress(key.split(','))
      .then((list) => setProgress(Object.fromEntries(list.map((p) => [p.challenge_id, p]))))
      .catch(() => {});
  }, [key]);
  useEffect(() => {
    load();
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (!id || key.split(',').includes(id)) load();
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [key, load]);
  return progress;
}
