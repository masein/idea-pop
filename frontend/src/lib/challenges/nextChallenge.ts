import type { ChallengeProgress } from '@/lib/api/client';

/** Every challenge has exactly three stars. */
const STAR_COUNT = 3;
/** A challenge that doesn't award stars yet is finished once its +20 XP solve reward is in. */
const SOLVE_XP = 20;

type Item = { id: string; locked?: boolean; story?: unknown };

/** Finished: all three stars, or, for a challenge that doesn't award stars yet, solved. */
export function isChallengeDone(c: Item, p: ChallengeProgress | null | undefined): boolean {
  if (!p) return false;
  if (p.stars.length >= STAR_COUNT) return true;
  const mode = (c.story as { discovery?: { rewards?: { mode?: string } } } | null | undefined)?.discovery?.rewards?.mode;
  return mode !== 'badges' && p.xp >= SOLVE_XP;
}

export type NextChallenge<T> = { kind: 'open' | 'locked'; challenge: T } | { kind: 'all_done' } | null;

/**
 * What the Continue area offers, from the list in page order: the class-assigned challenge,
 * then one the kid started and hasn't finished, then the next one not finished. A locked one
 * comes only after every open one is done; when nothing is left, the all-done state.
 */
export function nextChallenge<T extends Item>(
  list: T[],
  progress: Record<string, ChallengeProgress>,
  assignedId: string | null,
): NextChallenge<T> {
  if (list.length === 0) return null;
  // Same rule as the cards: the server's decision, or "first free".
  const isLocked = (c: T) => c.locked ?? list.indexOf(c) > 0;
  const started = (c: T) => (progress[c.id]?.stars.length ?? 0) > 0 || (progress[c.id]?.xp ?? 0) > 0;
  const open = list.filter((c) => !isLocked(c) && !isChallengeDone(c, progress[c.id]));
  const pick = open.find((c) => c.id === assignedId) ?? open.find(started) ?? open[0];
  if (pick) return { kind: 'open', challenge: pick };
  const locked = list.find(isLocked);
  return locked ? { kind: 'locked', challenge: locked } : { kind: 'all_done' };
}
