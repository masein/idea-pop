/**
 * On-device persistence for the Reward Maze. The maze + learned Q-table must
 * survive the mission's skill → plan → build steps (each remounts the game),
 * so it lives in localStorage — never uploaded anywhere.
 */

import {
  mazeSummaryLines,
  type Outcome,
  parseSavedMaze,
  type SavedMaze,
} from './rewardMazeCore';

export const MAZE_STORAGE_KEY = 'ideapop_maze';

export function loadMaze(): SavedMaze | null {
  try {
    return parseSavedMaze(localStorage.getItem(MAZE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveMaze(state: SavedMaze): void {
  try {
    localStorage.setItem(MAZE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full/blocked — the game still works in memory */
  }
}

export function clearMaze(): void {
  try {
    localStorage.removeItem(MAZE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * The mission's share artefact: the emoji maze + the tries-to-learn story —
 * used as the project body instead of a photo upload. Null before any try.
 */
export function mazeSnapshotText(label: {
  tryLine: (n: number, steps: number, outcome: Outcome) => string;
}): string | null {
  const state = loadMaze();
  if (!state || state.history.length === 0) return null;
  return mazeSummaryLines(state.maze, state.history, label).join('\n');
}
