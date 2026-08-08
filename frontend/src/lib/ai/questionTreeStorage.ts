/**
 * On-device persistence for the Question Tree game. The tree must survive the
 * mission's skill → plan → build steps (each remounts the game), so it lives
 * in localStorage — never uploaded anywhere.
 */

import {
  type AttributeId,
  parseSavedGame,
  type SavedGame,
  summaryLines,
} from './questionTreeCore';

export const QTREE_STORAGE_KEY = 'ideapop_qtree';

export function loadGame(): SavedGame | null {
  try {
    return parseSavedGame(localStorage.getItem(QTREE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveGame(game: SavedGame): void {
  try {
    localStorage.setItem(QTREE_STORAGE_KEY, JSON.stringify(game));
  } catch {
    /* storage full/blocked — the game still works in memory */
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(QTREE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * The mission's share artefact: the tree as indented text plus the best score
 * — used as the project body instead of a photo upload. Null when the kid
 * hasn't built anything yet.
 */
export function snapshotText(label: {
  question: (q: AttributeId) => string;
  animal: (id: string) => string;
  bestLine: (count: number) => string;
}): string | null {
  const game = loadGame();
  if (!game || game.tree.kind === 'leaf') return null;
  const lines = summaryLines(game.tree, label);
  if (game.best !== null) lines.push('', label.bestLine(game.best));
  return lines.join('\n');
}
