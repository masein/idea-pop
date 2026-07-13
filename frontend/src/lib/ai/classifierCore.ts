/**
 * Pure state logic for the in-app image classifier (no TensorFlow imports —
 * unit-testable without downloading any model).
 *
 * The classifier itself lives in `tfClassifier.ts`; everything here is plain
 * data the UI can render: the list of named classes, per-class example
 * counts, and the "was the machine right?" test score.
 */

export const MIN_CLASSES = 2;
export const MAX_CLASSES = 3;

export interface ClassInfo {
  /** Stable id used as the KNN label (never shown to kids). */
  id: string;
  /** Kid-chosen display name, e.g. "cat". */
  name: string;
  /** How many example images have been added to this class. */
  exampleCount: number;
}

export interface TestStats {
  correct: number;
  total: number;
}

export const EMPTY_STATS: TestStats = { correct: 0, total: 0 };

let nextId = 0;
/** Test-only hook so ids are deterministic per test run. */
export function resetIdsForTest() {
  nextId = 0;
}

function newId(): string {
  nextId += 1;
  return `class-${nextId}`;
}

/** Starting state: two empty classes with placeholder names. */
export function initialClasses(nameA: string, nameB: string): ClassInfo[] {
  return [
    { id: newId(), name: nameA, exampleCount: 0 },
    { id: newId(), name: nameB, exampleCount: 0 },
  ];
}

/** Add a class (no-op when already at MAX_CLASSES). */
export function addClass(classes: ClassInfo[], name: string): ClassInfo[] {
  if (classes.length >= MAX_CLASSES) return classes;
  return [...classes, { id: newId(), name, exampleCount: 0 }];
}

/** Remove a class (no-op when at MIN_CLASSES — the UI disables the button too). */
export function removeClass(classes: ClassInfo[], id: string): ClassInfo[] {
  if (classes.length <= MIN_CLASSES) return classes;
  return classes.filter((c) => c.id !== id);
}

export function renameClass(classes: ClassInfo[], id: string, name: string): ClassInfo[] {
  return classes.map((c) => (c.id === id ? { ...c, name } : c));
}

export function addExamples(classes: ClassInfo[], id: string, count = 1): ClassInfo[] {
  return classes.map((c) => (c.id === id ? { ...c, exampleCount: c.exampleCount + count } : c));
}

/** Wipe all example counts (used with the engine's clearAll). */
export function clearExamples(classes: ClassInfo[]): ClassInfo[] {
  return classes.map((c) => ({ ...c, exampleCount: 0 }));
}

/** Every class needs at least one example before the machine can guess. */
export function readyToPredict(classes: ClassInfo[]): boolean {
  return classes.length >= MIN_CLASSES && classes.every((c) => c.exampleCount > 0);
}

/** How many teams have been taught at least one example ("trained"). */
export function countTrainedClasses(classes: ClassInfo[]): number {
  return classes.filter((c) => c.exampleCount > 0).length;
}

/**
 * The machine can be quizzed once at least two teams each have an example —
 * that's enough for the KNN to tell them apart, even if a third team is still
 * empty. (Looser than `readyToPredict`, which wants every team taught.)
 */
export function readyToQuiz(classes: ClassInfo[]): boolean {
  return countTrainedClasses(classes) >= MIN_CLASSES;
}

/** Record one graded test: did the machine's guess match the real answer? */
export function recordTest(stats: TestStats, predictedId: string, actualId: string): TestStats {
  return {
    correct: stats.correct + (predictedId === actualId ? 1 : 0),
    total: stats.total + 1,
  };
}

/** Accuracy as a whole percent, or null before any graded test. */
export function accuracyPercent(stats: TestStats): number | null {
  if (stats.total === 0) return null;
  return Math.round((stats.correct / stats.total) * 100);
}
