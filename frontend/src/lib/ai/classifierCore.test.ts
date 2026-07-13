import { describe, it, expect, beforeEach } from 'vitest';
import {
  accuracyPercent,
  addClass,
  addExamples,
  clearExamples,
  EMPTY_STATS,
  initialClasses,
  MAX_CLASSES,
  MIN_CLASSES,
  countTrainedClasses,
  readyToPredict,
  readyToQuiz,
  recordTest,
  removeClass,
  renameClass,
  resetIdsForTest,
} from './classifierCore';

beforeEach(() => resetIdsForTest());

describe('class management', () => {
  it('starts with two named, empty classes', () => {
    const classes = initialClasses('cat', 'dog');
    expect(classes).toHaveLength(MIN_CLASSES);
    expect(classes.map((c) => c.name)).toEqual(['cat', 'dog']);
    expect(classes.every((c) => c.exampleCount === 0)).toBe(true);
    expect(new Set(classes.map((c) => c.id)).size).toBe(2);
  });

  it('adds a third class but refuses a fourth', () => {
    let classes = initialClasses('cat', 'dog');
    classes = addClass(classes, 'bird');
    expect(classes).toHaveLength(MAX_CLASSES);
    const again = addClass(classes, 'fish');
    expect(again).toHaveLength(MAX_CLASSES);
    expect(again).toBe(classes); // unchanged reference — true no-op
  });

  it('removes a class but never drops below the minimum', () => {
    let classes = addClass(initialClasses('cat', 'dog'), 'bird');
    classes = removeClass(classes, classes[2].id);
    expect(classes.map((c) => c.name)).toEqual(['cat', 'dog']);
    const again = removeClass(classes, classes[0].id);
    expect(again).toHaveLength(MIN_CLASSES); // no-op at the floor
  });

  it('renames a class in place', () => {
    const classes = initialClasses('cat', 'dog');
    const renamed = renameClass(classes, classes[1].id, 'puppy');
    expect(renamed[1].name).toBe('puppy');
    expect(renamed[0].name).toBe('cat');
  });

  it('counts examples per class and clears them all on reset', () => {
    let classes = initialClasses('cat', 'dog');
    classes = addExamples(classes, classes[0].id, 3);
    classes = addExamples(classes, classes[1].id); // default +1
    expect(classes.map((c) => c.exampleCount)).toEqual([3, 1]);
    expect(clearExamples(classes).map((c) => c.exampleCount)).toEqual([0, 0]);
  });
});

describe('readyToPredict', () => {
  it('requires at least one example in EVERY class', () => {
    let classes = initialClasses('cat', 'dog');
    expect(readyToPredict(classes)).toBe(false);
    classes = addExamples(classes, classes[0].id, 5);
    expect(readyToPredict(classes)).toBe(false); // dog still empty
    classes = addExamples(classes, classes[1].id);
    expect(readyToPredict(classes)).toBe(true);
  });
});

describe('training progress signals', () => {
  it('counts only teams that have examples', () => {
    let classes = initialClasses('cat', 'dog');
    expect(countTrainedClasses(classes)).toBe(0);
    classes = addExamples(classes, classes[0].id, 3);
    expect(countTrainedClasses(classes)).toBe(1);
    classes = addExamples(classes, classes[1].id);
    expect(countTrainedClasses(classes)).toBe(2);
  });

  it('is ready to quiz once TWO teams have examples (even with a third empty)', () => {
    let classes = addClass(initialClasses('cat', 'dog'), 'bird'); // 3 teams
    expect(readyToQuiz(classes)).toBe(false);
    classes = addExamples(classes, classes[0].id);
    expect(readyToQuiz(classes)).toBe(false); // only one team trained
    classes = addExamples(classes, classes[1].id);
    expect(readyToQuiz(classes)).toBe(true); // two trained, bird still empty
    // …and readyToPredict stays stricter: it wants the empty team taught too.
    expect(readyToPredict(classes)).toBe(false);
  });
});

describe('accuracy scoring', () => {
  it('is null before any graded test', () => {
    expect(accuracyPercent(EMPTY_STATS)).toBeNull();
  });

  it('computes correct ÷ total as a rounded percent', () => {
    let stats = EMPTY_STATS;
    stats = recordTest(stats, 'class-1', 'class-1'); // right
    stats = recordTest(stats, 'class-1', 'class-2'); // wrong
    stats = recordTest(stats, 'class-2', 'class-2'); // right
    expect(stats).toEqual({ correct: 2, total: 3 });
    expect(accuracyPercent(stats)).toBe(67); // 2/3 → 66.7 → 67
  });

  it('scores 100% on a perfect run and 0% on a total miss', () => {
    let perfect = recordTest(EMPTY_STATS, 'a', 'a');
    perfect = recordTest(perfect, 'b', 'b');
    expect(accuracyPercent(perfect)).toBe(100);
    const miss = recordTest(EMPTY_STATS, 'a', 'b');
    expect(accuracyPercent(miss)).toBe(0);
  });
});
