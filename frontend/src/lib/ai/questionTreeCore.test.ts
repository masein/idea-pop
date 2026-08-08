import { describe, it, expect } from 'vitest';
import {
  ANIMALS,
  animalById,
  answerQuestion,
  betterScore,
  collectAnimals,
  initialTree,
  isComplete,
  nodeAt,
  parseSavedGame,
  questionsOnPath,
  splitAt,
  splitStars,
  startPlay,
  summaryLines,
  type TreeNode,
  unresolvedLeaves,
  unsplitAt,
} from './questionTreeCore';

const label = {
  question: (q: string) => `Q:${q}`,
  animal: (id: string) => id,
};

describe('animal cards', () => {
  it('ships 8 animals with pairwise-distinct attribute vectors', () => {
    expect(ANIMALS).toHaveLength(8);
    const vectors = ANIMALS.map((a) =>
      [a.attributes.water, a.attributes.wings, a.attributes.big, a.attributes.legs].join(),
    );
    expect(new Set(vectors).size).toBe(8); // a full tree can isolate every animal
  });
});

describe('building the tree', () => {
  it('splits a pile by attribute into yes/no branches', () => {
    const tree = splitAt(initialTree(), [], 'water');
    expect(tree.kind).toBe('split');
    const yes = nodeAt(tree, ['yes']);
    const no = nodeAt(tree, ['no']);
    expect(yes.kind === 'leaf' && yes.animals.sort()).toEqual(
      ['duck', 'shark', 'goldfish', 'frog'].sort(),
    );
    expect(no.kind === 'leaf' && no.animals.sort()).toEqual(
      ['eagle', 'elephant', 'snake', 'cat'].sort(),
    );
  });

  it('never loses an animal across nested splits', () => {
    let tree = splitAt(initialTree(), [], 'water');
    tree = splitAt(tree, ['yes'], 'big');
    tree = splitAt(tree, ['no'], 'wings');
    expect(collectAnimals(tree).sort()).toEqual(ANIMALS.map((a) => a.id).sort());
  });

  it('unsplit collapses a branch back into one pile (undo)', () => {
    let tree = splitAt(initialTree(), [], 'water');
    tree = splitAt(tree, ['yes'], 'big');
    tree = unsplitAt(tree, []);
    expect(tree.kind).toBe('leaf');
    expect(collectAnimals(tree)).toHaveLength(8);
  });

  it('tracks the questions already asked along a path', () => {
    let tree = splitAt(initialTree(), [], 'water');
    tree = splitAt(tree, ['yes'], 'big');
    expect(questionsOnPath(tree, ['yes', 'no'])).toEqual(['water', 'big']);
  });

  it('reports completion + the piles still needing questions', () => {
    let tree: TreeNode = initialTree();
    expect(isComplete(tree)).toBe(false);
    expect(unresolvedLeaves(tree)).toEqual([[]]);
    // the canonical full tree: water → wings/big → …
    tree = splitAt(tree, [], 'water');
    tree = splitAt(tree, ['yes'], 'legs'); // duck,frog | shark,goldfish
    tree = splitAt(tree, ['yes', 'yes'], 'wings'); // duck | frog
    tree = splitAt(tree, ['yes', 'no'], 'big'); // shark | goldfish
    tree = splitAt(tree, ['no'], 'wings'); // eagle | elephant,snake,cat
    tree = splitAt(tree, ['no', 'no'], 'big'); // elephant | snake,cat
    expect(isComplete(tree)).toBe(false);
    expect(unresolvedLeaves(tree)).toEqual([[ 'no', 'no', 'no' ]]);
    tree = splitAt(tree, ['no', 'no', 'no'], 'legs'); // cat | snake
    expect(isComplete(tree)).toBe(true);
    expect(unresolvedLeaves(tree)).toEqual([]);
  });
});

describe('star meter', () => {
  it('rewards even splits and punishes wasted questions', () => {
    expect(splitStars(4, 4)).toBe(3); // perfect half-and-half
    expect(splitStars(3, 4)).toBe(3); // best possible for an odd pile
    expect(splitStars(5, 3)).toBe(2);
    expect(splitStars(6, 2)).toBe(1);
    expect(splitStars(8, 0)).toBe(1); // useless question
  });
});

describe('play mode', () => {
  it('walks the tree by answers, counting questions', () => {
    let tree = splitAt(initialTree(), [], 'water');
    tree = splitAt(tree, ['no'], 'wings');
    let play = startPlay();
    play = answerQuestion(play, 'no'); // not water
    play = answerQuestion(play, 'yes'); // has wings
    expect(play.questionsAsked).toBe(2);
    const leaf = nodeAt(tree, play.path);
    expect(leaf.kind === 'leaf' && leaf.animals).toEqual(['eagle']);
  });

  it('every animal is reachable by answering its own attributes', () => {
    // full tree from the completion test
    let tree = splitAt(initialTree(), [], 'water');
    tree = splitAt(tree, ['yes'], 'legs');
    tree = splitAt(tree, ['yes', 'yes'], 'wings');
    tree = splitAt(tree, ['yes', 'no'], 'big');
    tree = splitAt(tree, ['no'], 'wings');
    tree = splitAt(tree, ['no', 'no'], 'big');
    tree = splitAt(tree, ['no', 'no', 'no'], 'legs');
    for (const animal of ANIMALS) {
      let node = tree;
      let play = startPlay();
      while (node.kind === 'split') {
        const answer = animalById(animal.id).attributes[node.question] ? 'yes' : 'no';
        play = answerQuestion(play, answer);
        node = node[answer];
      }
      expect(node.animals).toEqual([animal.id]);
      expect(play.questionsAsked).toBeLessThanOrEqual(4);
    }
  });

  it('keeps the best (fewest questions) score', () => {
    expect(betterScore(null, 4)).toBe(4);
    expect(betterScore(4, 3)).toBe(3);
    expect(betterScore(3, 5)).toBe(3);
  });
});

describe('snapshot + persistence', () => {
  it('renders a compact indented summary', () => {
    let tree = splitAt(initialTree(), [], 'wings');
    tree = splitAt(tree, ['yes'], 'water');
    const lines = summaryLines(tree, label);
    expect(lines[0]).toBe('Q:wings');
    expect(lines[1]).toBe('  ✔ Q:water');
    expect(lines[2]).toBe('    ✔ duck');
    expect(lines.at(-1)).toContain('✘ '); // the no-pile of the root
  });

  it('round-trips a saved game and rejects malformed payloads', () => {
    const tree = splitAt(initialTree(), [], 'water');
    const saved = parseSavedGame(JSON.stringify({ tree, best: 3 }));
    expect(saved?.best).toBe(3);
    expect(saved && collectAnimals(saved.tree)).toHaveLength(8);
    expect(parseSavedGame(null)).toBeNull();
    expect(parseSavedGame('not json')).toBeNull();
    expect(parseSavedGame(JSON.stringify({ tree: { kind: 'leaf', animals: ['cat'] }, best: null }))).toBeNull();
  });
});
