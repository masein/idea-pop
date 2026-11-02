import { describe, expect, it } from 'vitest';
import type { ChallengeProgress } from '@/lib/api/client';
import { isChallengeDone, nextChallenge } from './nextChallenge';

const p = (id: string, stars: number[], xp = 0): ChallengeProgress => ({ challenge_id: id, stars, badges: [], xp });
const badges = { discovery: { rewards: { mode: 'badges' } } };
const list = [
  { id: 'a', locked: false },
  { id: 'b', locked: false, story: badges },
  { id: 'c', locked: false },
];

describe('nextChallenge', () => {
  it('shows the unfinished challenge the kid started', () => {
    expect(nextChallenge(list, { b: p('b', [1], 30) }, null)).toEqual({ kind: 'open', challenge: list[1] });
  });

  it('moves on from a finished challenge to the next unfinished one', () => {
    const done = { a: p('a', [], 20), b: p('b', [1, 2, 3], 85) };
    expect(nextChallenge(list, done, null)).toEqual({ kind: 'open', challenge: list[2] });
  });

  it('skips an assigned challenge once it is finished', () => {
    expect(nextChallenge(list, { c: p('c', [1, 2, 3]) }, 'c')).toEqual({ kind: 'open', challenge: list[0] });
    expect(nextChallenge(list, {}, 'c')).toEqual({ kind: 'open', challenge: list[2] });
  });

  it('offers a locked challenge only after every open one is done', () => {
    const withLocked = [{ id: 'a', locked: false }, { id: 'z', locked: true }];
    expect(nextChallenge(withLocked, { a: p('a', [1, 2, 3]) }, null)).toEqual({ kind: 'locked', challenge: withLocked[1] });
  });

  it('reports all done instead of repeating the last one', () => {
    const all = { a: p('a', [], 20), b: p('b', [1, 2, 3]), c: p('c', [], 25) };
    expect(nextChallenge(list, all, null)).toEqual({ kind: 'all_done' });
  });
});

describe('isChallengeDone', () => {
  it('needs all three stars on a challenge that awards them', () => {
    expect(isChallengeDone(list[1], p('b', [1, 2], 60))).toBe(false);
    expect(isChallengeDone(list[1], p('b', [1, 2, 3], 85))).toBe(true);
  });

  it('counts a solved challenge that has no stars yet', () => {
    expect(isChallengeDone(list[0], p('a', [], 5))).toBe(false);
    expect(isChallengeDone(list[0], p('a', [], 20))).toBe(true);
  });
});
