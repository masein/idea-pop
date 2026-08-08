/**
 * Pure state logic for the Question Tree game (no React, no storage — unit-
 * testable in plain Node). The game UI lives in components/ai/QuestionTree.tsx.
 *
 * The kid builds a yes/no DECISION TREE over 8 animal cards: each split sends
 * every animal in a group down the Yes or No branch of a preset question, and
 * a 1-3 star meter rewards even splits (the design secret of the mission).
 */

// ── Animals & questions ─────────────────────────────────────────────────────────

export type AttributeId = 'water' | 'wings' | 'big' | 'legs';

export interface Animal {
  /** Stable id — also the i18n key suffix (qtree.animal_<id>) and emoji key. */
  id: string;
  emoji: string;
  attributes: Record<AttributeId, boolean>;
}

/** Every animal has a distinct attribute vector, so a full tree can always
 *  isolate each one (4 questions worst-case). */
export const ANIMALS: Animal[] = [
  { id: 'eagle', emoji: '🦅', attributes: { wings: true, water: false, big: false, legs: true } },
  { id: 'duck', emoji: '🦆', attributes: { wings: true, water: true, big: false, legs: true } },
  { id: 'shark', emoji: '🦈', attributes: { wings: false, water: true, big: true, legs: false } },
  { id: 'goldfish', emoji: '🐠', attributes: { wings: false, water: true, big: false, legs: false } },
  { id: 'elephant', emoji: '🐘', attributes: { wings: false, water: false, big: true, legs: true } },
  { id: 'frog', emoji: '🐸', attributes: { wings: false, water: true, big: false, legs: true } },
  { id: 'snake', emoji: '🐍', attributes: { wings: false, water: false, big: false, legs: false } },
  { id: 'cat', emoji: '🐱', attributes: { wings: false, water: false, big: false, legs: true } },
];

/** The preset question bank — i18n label key is qtree.q_<id>. */
export const QUESTIONS: AttributeId[] = ['water', 'wings', 'big', 'legs'];

export function animalById(id: string): Animal {
  const found = ANIMALS.find((a) => a.id === id);
  if (!found) throw new Error(`unknown animal ${id}`);
  return found;
}

// ── Tree model ──────────────────────────────────────────────────────────────────

export type TreeNode = LeafNode | SplitNode;

export interface LeafNode {
  kind: 'leaf';
  /** Animal ids sitting in this pile. */
  animals: string[];
}

export interface SplitNode {
  kind: 'split';
  question: AttributeId;
  yes: TreeNode;
  no: TreeNode;
}

/** Path from the root: each hop is the branch taken. '' is the root itself. */
export type NodePath = ('yes' | 'no')[];

export function initialTree(): TreeNode {
  return { kind: 'leaf', animals: ANIMALS.map((a) => a.id) };
}

export function nodeAt(tree: TreeNode, path: NodePath): TreeNode {
  let node = tree;
  for (const hop of path) {
    if (node.kind !== 'split') throw new Error('path walks past a leaf');
    node = node[hop];
  }
  return node;
}

function replaceAt(tree: TreeNode, path: NodePath, next: TreeNode): TreeNode {
  if (path.length === 0) return next;
  if (tree.kind !== 'split') throw new Error('path walks past a leaf');
  const [hop, ...rest] = path;
  return { ...tree, [hop]: replaceAt(tree[hop], rest, next) };
}

/** Split the leaf at `path` with a question. No-op if the node isn't a leaf. */
export function splitAt(tree: TreeNode, path: NodePath, question: AttributeId): TreeNode {
  const node = nodeAt(tree, path);
  if (node.kind !== 'leaf') return tree;
  const yes = node.animals.filter((id) => animalById(id).attributes[question]);
  const no = node.animals.filter((id) => !animalById(id).attributes[question]);
  return replaceAt(tree, path, {
    kind: 'split',
    question,
    yes: { kind: 'leaf', animals: yes },
    no: { kind: 'leaf', animals: no },
  });
}

/** Collapse the split at `path` back into a single pile (undo). */
export function unsplitAt(tree: TreeNode, path: NodePath): TreeNode {
  const node = nodeAt(tree, path);
  if (node.kind !== 'split') return tree;
  return replaceAt(tree, path, { kind: 'leaf', animals: collectAnimals(node) });
}

export function collectAnimals(node: TreeNode): string[] {
  if (node.kind === 'leaf') return [...node.animals];
  return [...collectAnimals(node.yes), ...collectAnimals(node.no)];
}

/** Questions already asked on the way to `path` (asking again is useless). */
export function questionsOnPath(tree: TreeNode, path: NodePath): AttributeId[] {
  const asked: AttributeId[] = [];
  let node = tree;
  for (const hop of path) {
    if (node.kind !== 'split') break;
    asked.push(node.question);
    node = node[hop];
  }
  return asked;
}

/** The tree is finished when no pile holds more than one animal. */
export function isComplete(tree: TreeNode): boolean {
  if (tree.kind === 'leaf') return tree.animals.length <= 1;
  return isComplete(tree.yes) && isComplete(tree.no);
}

/** Leaves with 2+ animals — the piles that still need a question. */
export function unresolvedLeaves(tree: TreeNode, path: NodePath = []): NodePath[] {
  if (tree.kind === 'leaf') return tree.animals.length > 1 ? [path] : [];
  return [
    ...unresolvedLeaves(tree.yes, [...path, 'yes']),
    ...unresolvedLeaves(tree.no, [...path, 'no']),
  ];
}

// ── Star meter ──────────────────────────────────────────────────────────────────

/**
 * How smart a split is, 1-3 stars: an even split (difference 0-1) throws away
 * the most wrong answers at once → 3 stars; mildly lopsided → 2; wasted → 1.
 */
export function splitStars(yesCount: number, noCount: number): 1 | 2 | 3 {
  const diff = Math.abs(yesCount - noCount);
  if (diff <= 1) return 3;
  if (diff <= 3) return 2;
  return 1;
}

// ── Play mode ───────────────────────────────────────────────────────────────────

export interface PlayState {
  path: NodePath;
  questionsAsked: number;
}

export function startPlay(): PlayState {
  return { path: [], questionsAsked: 0 };
}

/** Answer the current node's question; returns the advanced state. */
export function answerQuestion(state: PlayState, answer: 'yes' | 'no'): PlayState {
  return { path: [...state.path, answer], questionsAsked: state.questionsAsked + 1 };
}

/** Best (lowest) score bookkeeping; null means no win recorded yet. */
export function betterScore(best: number | null, score: number): number {
  return best === null ? score : Math.min(best, score);
}

// ── Shareable snapshot ──────────────────────────────────────────────────────────

/**
 * Compact, indented text rendering of the tree — the mission's share artefact
 * (no photo upload). `label` maps question/animal ids to localised text.
 */
export function summaryLines(
  tree: TreeNode,
  label: { question: (q: AttributeId) => string; animal: (id: string) => string },
): string[] {
  const lines: string[] = [];
  function walk(node: TreeNode, indent: string, prefix: string) {
    if (node.kind === 'leaf') {
      const names = node.animals.map((id) => label.animal(id)).join(', ') || '—';
      lines.push(`${indent}${prefix}${names}`);
      return;
    }
    lines.push(`${indent}${prefix}${label.question(node.question)}`);
    walk(node.yes, indent + '  ', '✔ ');
    walk(node.no, indent + '  ', '✘ ');
  }
  walk(tree, '', '');
  return lines;
}

// ── Persistence (plain JSON shape guard) ────────────────────────────────────────

export interface SavedGame {
  tree: TreeNode;
  best: number | null;
}

/** Parse a stored game, returning null for anything malformed or stale. */
export function parseSavedGame(raw: string | null): SavedGame | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SavedGame;
    const known = new Set(ANIMALS.map((a) => a.id));
    const ids = collectAnimals(data.tree);
    if (ids.length !== known.size || !ids.every((id) => known.has(id))) return null;
    if (data.best !== null && typeof data.best !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}
