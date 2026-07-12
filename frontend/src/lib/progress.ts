// XP → level curve, mirrored from the backend (domain/src/progress.rs LEVEL_XP).
// The API returns xp_total + level; the "X/Y to next level" display is derived
// here so the two never drift into NaN again.

export const LEVEL_XP: readonly number[] = [
  0, // Lv 1
  15, // Lv 2 — intentionally short first ladder
  50, // Lv 3
  100, // Lv 4
  200, // Lv 5
  350, // Lv 6
  500, // Lv 7
  750, // Lv 8
  1000, // Lv 9
  1500, // Lv 10 (max)
];

export interface LevelProgress {
  /** XP earned within the current level bracket. */
  into: number;
  /** Size of the current level bracket. */
  span: number;
  /** XP still needed to reach the next level (0 at max level). */
  remaining: number;
  /** The level number the kid is working toward. */
  nextLevel: number;
  /** 0–100 progress through the current bracket. */
  pct: number;
  /** True once the kid is at the top level. */
  isMax: boolean;
}

/**
 * Derive level-bracket progress from total XP. Every input is guarded so a
 * missing/NaN value degrades to a sensible 0-based state rather than "NaN".
 */
export function levelProgress(xpTotal: number, level: number): LevelProgress {
  const xp = Number.isFinite(xpTotal) ? Math.max(0, xpTotal) : 0;
  const lv =
    Number.isFinite(level) && level >= 1 ? Math.min(Math.floor(level), LEVEL_XP.length) : 1;

  const isMax = lv >= LEVEL_XP.length;
  const currentThreshold = LEVEL_XP[lv - 1] ?? 0;
  const nextThreshold = isMax ? currentThreshold : LEVEL_XP[lv];

  const into = Math.max(0, xp - currentThreshold);
  const span = Math.max(1, nextThreshold - currentThreshold);
  const remaining = isMax ? 0 : Math.max(0, nextThreshold - xp);
  const pct = isMax ? 100 : Math.min(100, Math.round((into / span) * 100));

  return { into, span, remaining, nextLevel: lv + 1, pct, isMax };
}
