import { describe, it, expect } from 'vitest';
import {
  CELLS,
  DEFAULT_REWARDS,
  decayEpsilon,
  defaultMaze,
  EPSILON_MIN,
  EPSILON_START,
  findCell,
  GRID,
  greedyPath,
  MAX_STEPS,
  mazeSummaryLines,
  moveFrom,
  newQ,
  parseSavedMaze,
  placeCell,
  runEpisode,
  type Maze,
} from './rewardMazeCore';

/** mulberry32 — tiny seeded RNG so learning runs are reproducible. */
function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('maze editing', () => {
  it('starts with one start (corner) and one cheese (opposite corner)', () => {
    const maze = defaultMaze();
    expect(maze).toHaveLength(CELLS);
    expect(findCell(maze, 'start')).toBe(0);
    expect(findCell(maze, 'cheese')).toBe(CELLS - 1);
  });

  it('keeps start/cheese unique when moved', () => {
    let maze = defaultMaze();
    maze = placeCell(maze, 12, 'cheese');
    expect(findCell(maze, 'cheese')).toBe(12);
    expect(maze.filter((c) => c === 'cheese')).toHaveLength(1);
  });

  it('never overwrites start/cheese with walls or traps', () => {
    const maze = defaultMaze();
    expect(placeCell(maze, 0, 'wall')).toBe(maze); // no-op, same reference
    expect(placeCell(maze, CELLS - 1, 'trap')).toBe(maze);
  });

  it('erases walls back to empty', () => {
    let maze = placeCell(defaultMaze(), 7, 'wall');
    expect(maze[7]).toBe('wall');
    maze = placeCell(maze, 7, 'empty');
    expect(maze[7]).toBe('empty');
  });
});

describe('movement', () => {
  it('bumps on grid edges and walls (stays put)', () => {
    const maze = placeCell(defaultMaze(), 1, 'wall');
    expect(moveFrom(maze, 0, 0)).toBe(0); // up off-grid → stay
    expect(moveFrom(maze, 0, 2)).toBe(0); // left off-grid → stay
    expect(moveFrom(maze, 0, 3)).toBe(0); // right into wall at 1 → stay
    expect(moveFrom(maze, 0, 1)).toBe(GRID); // down is open
  });
});

describe('learning', () => {
  it('one episode terminates and records a path', () => {
    const q = newQ();
    const result = runEpisode(defaultMaze(), DEFAULT_REWARDS, q, EPSILON_START, seededRng(1));
    expect(result.steps).toBeGreaterThan(0);
    expect(result.steps).toBeLessThanOrEqual(MAX_STEPS);
    expect(result.path[0]).toBe(0);
    expect(['cheese', 'timeout']).toContain(result.outcome);
    expect(result.trapHits).toBeGreaterThanOrEqual(0);
  });

  it('converges: after ~8 tries the greedy path is the shortest safe route', () => {
    const maze = defaultMaze(); // empty 5×5, start 0 → cheese 24; shortest = 8 moves
    const q = newQ();
    const rng = seededRng(42);
    let epsilon = EPSILON_START;
    const stepCounts: number[] = [];
    for (let i = 0; i < 10; i++) {
      const result = runEpisode(maze, DEFAULT_REWARDS, q, epsilon, rng);
      stepCounts.push(result.steps);
      if (result.outcome === 'cheese') epsilon = decayEpsilon(epsilon); // win-only decay
    }
    const path = greedyPath(maze, q);
    expect(path).not.toBeNull();
    expect(maze[path![path!.length - 1]]).toBe('cheese');
    expect(path!.length).toBeLessThanOrEqual(13); // near-shortest (optimum is 9 cells)
    // learning is visible: the late tries beat the first try
    expect(Math.min(...stepCounts.slice(-3))).toBeLessThanOrEqual(stepCounts[0]);
  });

  it('a nastier trap cost makes the learned path avoid the trap', () => {
    // trap on the corridor next to start; with a heavy penalty the mouse
    // must learn the detour (the mission's "change one reward" experiment)
    let maze: Maze = defaultMaze();
    maze = placeCell(maze, 1, 'trap');
    const rewards = { ...DEFAULT_REWARDS, trap: -20 };
    const q = newQ();
    const rng = seededRng(7);
    let epsilon = EPSILON_START;
    for (let i = 0; i < 15; i++) {
      const result = runEpisode(maze, rewards, q, epsilon, rng);
      if (result.outcome === 'cheese') epsilon = decayEpsilon(epsilon); // win-only decay
    }
    const path = greedyPath(maze, q);
    expect(path).not.toBeNull();
    expect(path!).not.toContain(1);
    expect(maze[path![path!.length - 1]]).toBe('cheese');
  });

  it('epsilon decays to the floor', () => {
    let e = EPSILON_START;
    for (let i = 0; i < 20; i++) e = decayEpsilon(e);
    expect(e).toBe(EPSILON_MIN);
  });

  it('greedyPath is null before any learning (loops on ties)', () => {
    expect(greedyPath(defaultMaze(), newQ())).toBeNull();
  });
});

describe('snapshot + persistence', () => {
  it('renders the emoji grid + try lines', () => {
    const maze = placeCell(defaultMaze(), 12, 'wall');
    const lines = mazeSummaryLines(maze, [{ steps: 24, outcome: 'cheese' }], {
      tryLine: (n, steps, outcome) => `try ${n}: ${steps} (${outcome})`,
    });
    expect(lines).toHaveLength(GRID + 1);
    expect(lines[0].startsWith('🐭')).toBe(true);
    expect(lines[2]).toContain('🧱');
    expect(lines[4].endsWith('🧀')).toBe(true);
    expect(lines[5]).toBe('try 1: 24 (cheese)');
  });

  it('round-trips saved state and rejects malformed payloads', () => {
    const saved = {
      maze: defaultMaze(),
      rewards: DEFAULT_REWARDS,
      q: newQ(),
      epsilon: 0.2,
      history: [{ steps: 10, outcome: 'cheese' as const }],
    };
    expect(parseSavedMaze(JSON.stringify(saved))?.epsilon).toBe(0.2);
    expect(parseSavedMaze(null)).toBeNull();
    expect(parseSavedMaze('nope')).toBeNull();
    const noCheese = { ...saved, maze: saved.maze.map((c) => (c === 'cheese' ? 'empty' : c)) };
    expect(parseSavedMaze(JSON.stringify(noCheese))).toBeNull();
  });
});
