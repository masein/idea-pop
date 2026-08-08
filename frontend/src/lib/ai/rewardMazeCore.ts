/**
 * Pure state logic for the Reward Maze game (no React, no storage, no
 * Math.random — the RNG is injected so unit tests are deterministic).
 *
 * A robot mouse learns a path to the cheese by tabular Q-learning: it tries
 * moves, earns the kid-editable rewards, and slowly prefers the moves that
 * paid off. The game UI lives in components/ai/RewardMaze.tsx.
 */

export const GRID = 5;
export const CELLS = GRID * GRID;

export type CellType = 'empty' | 'wall' | 'trap' | 'start' | 'cheese';

export interface Rewards {
  cheese: number;
  step: number;
  trap: number;
}

export const DEFAULT_REWARDS: Rewards = { cheese: 10, step: -1, trap: -5 };
export const REWARD_LIMITS = { min: -20, max: 20 } as const;

/** Learning constants: tuned so a 5×5 maze converges visibly in ~5-8 tries.
 *
 * Two non-obvious choices that make learning STABLE enough for kids:
 * - Q is initialised PESSIMISTIC (INIT_Q): with a −1 step cost at γ=0.9 even
 *   the optimal path's return is slightly negative, so optimistic zero-init
 *   makes untried moves look better forever and the best path never settles.
 * - ε only decays after a WINNING try (the mouse "gets confident once it has
 *   found cheese") — decaying on failed tries strands trap-heavy mazes in
 *   exploitation before the cheese was ever found.
 */
export const ALPHA = 0.5; // learning rate
export const GAMMA = 0.9; // future-reward discount
export const INIT_Q = -12; // pessimistic prior for untried moves
export const EPSILON_START = 0.8; // wander a lot until the first win
export const EPSILON_DECAY = 0.7; // per WINNING try
export const EPSILON_MIN = 0.05;
export const MAX_STEPS = 100; // per episode — lets try 1's random walk find the cheese
const REPLAY_SWEEPS = 3; // backward passes per episode (see runEpisode)

export type Rng = () => number;

// Actions: up, down, left, right.
export const ACTIONS = 4;
const DELTAS: Array<[number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];

export type Maze = CellType[]; // length CELLS, exactly one start + one cheese

export function defaultMaze(): Maze {
  const cells: Maze = Array.from({ length: CELLS }, () => 'empty' as CellType);
  cells[0] = 'start';
  cells[CELLS - 1] = 'cheese';
  return cells;
}

export function findCell(maze: Maze, type: 'start' | 'cheese'): number {
  return maze.indexOf(type);
}

/**
 * Place a cell type. START and CHEESE stay unique (the old one clears);
 * placing anything over START/CHEESE only works via those tools, so the maze
 * always keeps both. 'empty' erases walls/traps.
 */
export function placeCell(maze: Maze, index: number, type: CellType): Maze {
  const current = maze[index];
  if (current === 'start' || current === 'cheese') {
    // only the same unique tool may move it elsewhere; other tools no-op here
    if (type !== current) return maze;
  }
  const next = [...maze];
  if (type === 'start' || type === 'cheese') {
    const old = findCell(maze, type);
    if (old !== -1) next[old] = 'empty';
  }
  next[index] = type;
  return next;
}

/** Fresh pessimistic Q table: CELLS × ACTIONS at INIT_Q (see constants). */
export function newQ(): number[][] {
  return Array.from({ length: CELLS }, () => Array.from({ length: ACTIONS }, () => INIT_Q));
}

/** Where a move lands: walls and grid edges bump (stay put). */
export function moveFrom(maze: Maze, index: number, action: number): number {
  const row = Math.floor(index / GRID) + DELTAS[action][0];
  const col = (index % GRID) + DELTAS[action][1];
  if (row < 0 || row >= GRID || col < 0 || col >= GRID) return index;
  const target = row * GRID + col;
  return maze[target] === 'wall' ? index : target;
}

function argmaxWithTies(values: number[], rng: Rng): number {
  let best = -Infinity;
  const ties: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (values[i] > best) {
      best = values[i];
      ties.length = 0;
      ties.push(i);
    } else if (values[i] === best) {
      ties.push(i);
    }
  }
  return ties[Math.floor(rng() * ties.length)] ?? 0;
}

export type Outcome = 'cheese' | 'timeout';

export interface EpisodeResult {
  steps: number;
  outcome: Outcome;
  /** How many times the mouse stumbled into a trap this try ("ouches"). */
  trapHits: number;
  /** Every cell visited, starting at START — drives the path animation. */
  path: number[];
}

/**
 * Run ONE try: epsilon-greedy walk from START, updating `q` IN PLACE as it
 * goes. Only the cheese ends the episode — traps hurt (their reward) but the
 * mouse crawls on. Terminal traps looked tidier but made mazes with a trap
 * near the start almost unlearnable: exploring tries kept dying before the
 * cheese was ever found.
 */
export function runEpisode(
  maze: Maze,
  rewards: Rewards,
  q: number[][],
  epsilon: number,
  rng: Rng,
): EpisodeResult {
  let state = findCell(maze, 'start');
  const path = [state];
  const transitions: Array<{ s: number; a: number; r: number; next: number; terminal: boolean }> =
    [];
  let outcome: Outcome = 'timeout';
  let steps = MAX_STEPS;
  let trapHits = 0;

  const update = (tr: (typeof transitions)[number]) => {
    const future = tr.terminal ? 0 : GAMMA * Math.max(...q[tr.next]);
    q[tr.s][tr.a] += ALPHA * (tr.r + future - q[tr.s][tr.a]);
  };

  for (let step = 1; step <= MAX_STEPS; step++) {
    const action = rng() < epsilon ? Math.floor(rng() * ACTIONS) : argmaxWithTies(q[state], rng);
    const next = moveFrom(maze, state, action);
    const cell = maze[next];
    const terminal = cell === 'cheese';
    const reward =
      cell === 'cheese' ? rewards.cheese : cell === 'trap' ? rewards.trap : rewards.step;
    if (cell === 'trap') trapHits += 1;
    const tr = { s: state, a: action, r: reward, next, terminal };
    transitions.push(tr);
    update(tr);
    path.push(next);
    state = next;
    if (terminal) {
      outcome = 'cheese';
      steps = step;
      break;
    }
  }

  // Backward replay: re-apply updates newest→oldest so the terminal reward
  // propagates along the WHOLE visited path in one try — this is what makes
  // learning kid-visible in ~5 tries instead of dozens (plain one-step
  // Q-learning pushes value back only one cell per episode). Winning paths
  // are LOOP-ERASED first: replaying a meander as-is leaves some cells'
  // argmax pointing around the loop, which freezes the "best path" readout.
  const replayList = outcome === 'cheese' ? eraseLoops(transitions) : transitions;
  for (let sweep = 0; sweep < REPLAY_SWEEPS; sweep++) {
    for (let i = replayList.length - 2; i >= 0; i--) update(replayList[i]);
  }

  return { steps, outcome, trapHits, path };
}

interface Transition {
  s: number;
  a: number;
  r: number;
  next: number;
  terminal: boolean;
}

/** Cut cycles out of a transition sequence: whenever a state repeats, drop
 *  everything between its two visits (loop-erased walk). */
function eraseLoops(transitions: Transition[]): Transition[] {
  const out: Transition[] = [];
  const posByState = new Map<number, number>();
  for (const tr of transitions) {
    const seenAt = posByState.get(tr.s);
    if (seenAt !== undefined) {
      for (let i = out.length - 1; i >= seenAt; i--) posByState.delete(out[i].s);
      out.length = seenAt;
    }
    posByState.set(tr.s, out.length);
    out.push(tr);
  }
  return out;
}

/** Call after a WINNING try only (see the constants note). */
export function decayEpsilon(epsilon: number): number {
  return Math.max(EPSILON_MIN, epsilon * EPSILON_DECAY);
}

/**
 * The mouse's current favourite route: greedy argmax walk from START (first
 * index wins ties — deterministic). Returns the path only when it actually
 * reaches the cheese; null while the mouse is still learning. A best path MAY
 * pass through a trap — that's the mission's own teaching moment (the UI
 * flags it, and raising the trap cost makes the mouse re-learn a detour).
 */
export function greedyPath(maze: Maze, q: number[][]): number[] | null {
  let state = findCell(maze, 'start');
  const path = [state];
  const seen = new Set([state]);
  for (let step = 0; step < CELLS; step++) {
    const action = q[state].indexOf(Math.max(...q[state]));
    const next = moveFrom(maze, state, action);
    path.push(next);
    if (maze[next] === 'cheese') return path;
    if (next === state || seen.has(next)) return null;
    seen.add(next);
    state = next;
  }
  return null;
}

// ── Shareable snapshot ──────────────────────────────────────────────────────────

export const CELL_EMOJI: Record<CellType, string> = {
  start: '🐭',
  cheese: '🧀',
  wall: '🧱',
  trap: '🕳️',
  empty: '⬜',
};

export interface TryRecord {
  steps: number;
  outcome: Outcome;
}

/** Emoji grid + the learning story — the mission's no-photo share artefact. */
export function mazeSummaryLines(
  maze: Maze,
  history: TryRecord[],
  label: { tryLine: (n: number, steps: number, outcome: Outcome) => string },
): string[] {
  const lines: string[] = [];
  for (let row = 0; row < GRID; row++) {
    lines.push(
      maze
        .slice(row * GRID, (row + 1) * GRID)
        .map((c) => CELL_EMOJI[c])
        .join(''),
    );
  }
  history.forEach((r, i) => lines.push(label.tryLine(i + 1, r.steps, r.outcome)));
  return lines;
}

// ── Persistence shape guard ─────────────────────────────────────────────────────

export interface SavedMaze {
  maze: Maze;
  rewards: Rewards;
  q: number[][];
  epsilon: number;
  history: TryRecord[];
}

export function parseSavedMaze(raw: string | null): SavedMaze | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SavedMaze;
    if (!Array.isArray(data.maze) || data.maze.length !== CELLS) return null;
    if (findCell(data.maze, 'start') === -1 || findCell(data.maze, 'cheese') === -1) return null;
    if (!Array.isArray(data.q) || data.q.length !== CELLS) return null;
    if (typeof data.rewards?.cheese !== 'number' || typeof data.epsilon !== 'number') return null;
    if (!Array.isArray(data.history)) return null;
    return data;
  } catch {
    return null;
  }
}
