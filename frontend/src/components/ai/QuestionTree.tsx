'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ANIMALS,
  animalById,
  answerQuestion,
  betterScore,
  initialTree,
  isComplete,
  nodeAt,
  type AttributeId,
  type NodePath,
  type PlayState,
  type TreeNode,
  QUESTIONS,
  questionsOnPath,
  splitAt,
  splitStars,
  startPlay,
  summaryLines,
  unsplitAt,
} from '@/lib/ai/questionTreeCore';
import { clearGame, loadGame, saveGame } from '@/lib/ai/questionTreeStorage';

/**
 * The Question Tree game: kids BUILD a yes/no decision tree over 8 animal
 * cards (star meter rewards even splits), then PLAY — the tree asks its own
 * questions and guesses. Everything runs on-device; the tree lives in
 * localStorage so it follows the kid across mission steps.
 */

type Mode = 'build' | 'play';

const pathKey = (path: NodePath) => (path.length ? path.join('-') : 'root');

export default function QuestionTree() {
  const t = useTranslations('qtree');

  const [tree, setTree] = useState<TreeNode>(initialTree);
  const [best, setBest] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>('build');
  const [pickerPath, setPickerPath] = useState<string | null>(null);
  const [play, setPlay] = useState<PlayState>(startPlay);
  const [guessResult, setGuessResult] = useState<'right' | 'wrong' | null>(null);
  const [copied, setCopied] = useState(false);
  const loadedRef = useRef(false);

  // Load once, then persist every change (on-device only).
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      setTree(saved.tree);
      setBest(saved.best);
    }
    loadedRef.current = true;
  }, []);
  useEffect(() => {
    if (loadedRef.current) saveGame({ tree, best });
  }, [tree, best]);

  const complete = isComplete(tree);
  const built = tree.kind === 'split';

  const animalLabel = (id: string) => t(`animal_${id}`);
  const questionLabel = (q: AttributeId) => t(`q_${q}`);

  function doSplit(path: NodePath, question: AttributeId) {
    setTree((prev) => splitAt(prev, path, question));
    setPickerPath(null);
  }

  function doUnsplit(path: NodePath) {
    setTree((prev) => unsplitAt(prev, path));
    setPickerPath(null);
  }

  function resetAll() {
    setTree(initialTree());
    setBest(null);
    setPlay(startPlay());
    setGuessResult(null);
    clearGame();
  }

  function restartPlay() {
    setPlay(startPlay());
    setGuessResult(null);
  }

  function switchMode(next: Mode) {
    setMode(next);
    if (next === 'play') restartPlay();
  }

  // ── Build mode: recursive tree view ────────────────────────────────────────

  function LeafView({ node, path }: { node: Extract<TreeNode, { kind: 'leaf' }>; path: NodePath }) {
    const key = pathKey(path);
    const asked = questionsOnPath(tree, path);
    const pickerOpen = pickerPath === key;
    return (
      <div
        data-testid={`qtree-leaf-${key}`}
        className="flex min-w-[7.5rem] flex-col items-center gap-2 rounded-card bg-white p-2 shadow-sm"
      >
        <div className="flex max-w-[11rem] flex-wrap justify-center gap-1">
          {node.animals.length === 0 ? (
            <span className="font-body text-xs text-ink/40">{t('empty_pile')}</span>
          ) : (
            node.animals.map((id) => (
              <span
                key={id}
                className="flex items-center gap-1 rounded-pill bg-tint-cream px-2 py-0.5 font-body text-xs font-bold text-ink"
              >
                <span aria-hidden="true">{animalById(id).emoji}</span>
                {animalLabel(id)}
              </span>
            ))
          )}
        </div>
        {node.animals.length > 1 && (
          <div className="flex flex-col items-center gap-1">
            {!pickerOpen ? (
              <button
                type="button"
                data-testid={`qtree-split-${key}`}
                onClick={() => setPickerPath(key)}
                className="rounded-pill bg-challenge px-3 py-1.5 font-display text-xs font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
              >
                {t('split_pile', { count: node.animals.length })}
              </button>
            ) : (
              <div className="flex flex-col gap-1" role="group" aria-label={t('pick_question')}>
                {QUESTIONS.map((q) => {
                  const used = asked.includes(q);
                  return (
                    <button
                      key={q}
                      type="button"
                      data-testid={`qtree-pick-${q}`}
                      disabled={used}
                      onClick={() => doSplit(path, q)}
                      className="rounded-card border border-challenge/40 bg-white px-2 py-1 font-body text-xs font-bold text-challenge transition-colors hover:bg-challenge/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge disabled:opacity-40"
                    >
                      {questionLabel(q)}
                      {used ? ` ${t('question_used')}` : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function NodeView({ node, path }: { node: TreeNode; path: NodePath }) {
    if (node.kind === 'leaf') return <LeafView node={node} path={path} />;
    const key = pathKey(path);
    const yesCount = node.yes.kind === 'leaf' ? node.yes.animals.length : collectCount(node.yes);
    const noCount = node.no.kind === 'leaf' ? node.no.animals.length : collectCount(node.no);
    const stars = splitStars(yesCount, noCount);
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-1 rounded-card bg-tint-lavender px-3 py-1.5 shadow-sm">
          <span className="font-display text-sm font-bold text-ink">
            {questionLabel(node.question)}
          </span>
          <span
            data-testid={`qtree-stars-${key}`}
            aria-label={t('stars_label', { stars })}
            title={t('stars_label', { stars })}
            className="font-body text-sm tracking-tight text-library"
          >
            {'★'.repeat(stars)}
            <span className="text-ink/20">{'★'.repeat(3 - stars)}</span>
          </span>
          <button
            type="button"
            data-testid={`qtree-unsplit-${key}`}
            onClick={() => doUnsplit(path)}
            aria-label={t('unsplit')}
            className="rounded-full p-0.5 text-ink/40 hover:bg-ink/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
          >
            <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1">
            <span className="rounded-pill bg-explore/15 px-2 py-0.5 font-body text-[11px] font-bold text-explore">
              {t('yes_count', { count: yesCount })}
            </span>
            <NodeView node={node.yes} path={[...path, 'yes']} />
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="rounded-pill bg-coral/10 px-2 py-0.5 font-body text-[11px] font-bold text-coral">
              {t('no_count', { count: noCount })}
            </span>
            <NodeView node={node.no} path={[...path, 'no']} />
          </div>
        </div>
      </div>
    );
  }

  // ── Play mode ──────────────────────────────────────────────────────────────

  const playNode = built ? nodeAt(tree, play.path) : tree;

  function PlayView() {
    if (!built) {
      return (
        <p data-testid="qtree-build-first" className="font-body text-sm font-semibold text-ink/70">
          {t('build_first')}
        </p>
      );
    }
    if (playNode.kind === 'split') {
      return (
        <div className="flex flex-col items-center gap-3">
          <p data-testid="qtree-play-question" className="font-display text-xl font-bold text-ink">
            {questionLabel(playNode.question)}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              data-testid="qtree-yes"
              onClick={() => setPlay((p) => answerQuestion(p, 'yes'))}
              className="rounded-pill bg-explore px-6 py-2.5 font-display text-base font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              {t('yes')}
            </button>
            <button
              type="button"
              data-testid="qtree-no"
              onClick={() => setPlay((p) => answerQuestion(p, 'no'))}
              className="rounded-pill bg-coral px-6 py-2.5 font-display text-base font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              {t('no')}
            </button>
          </div>
          <p data-testid="qtree-play-count" className="font-body text-sm font-semibold text-ink/60">
            {t('questions_so_far', { count: play.questionsAsked })}
          </p>
        </div>
      );
    }
    // At a leaf.
    if (playNode.animals.length === 1) {
      const id = playNode.animals[0];
      return (
        <div className="flex flex-col items-center gap-3">
          {guessResult === null ? (
            <>
              <p data-testid="qtree-guess" className="text-center font-display text-xl font-bold text-ink">
                {t('guess_prompt', {
                  emoji: animalById(id).emoji,
                  name: animalLabel(id),
                  count: play.questionsAsked,
                })}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  data-testid="qtree-right"
                  onClick={() => {
                    setBest((b) => betterScore(b, play.questionsAsked));
                    setGuessResult('right');
                  }}
                  className="rounded-pill bg-explore px-5 py-2 font-display text-sm font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                >
                  {t('guess_right')}
                </button>
                <button
                  type="button"
                  data-testid="qtree-wrong"
                  onClick={() => setGuessResult('wrong')}
                  className="rounded-pill bg-coral px-5 py-2 font-display text-sm font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
                >
                  {t('guess_wrong')}
                </button>
              </div>
            </>
          ) : guessResult === 'right' ? (
            <p
              data-testid="qtree-win"
              role="status"
              className="rounded-card bg-explore/15 px-4 py-2 text-center font-display text-base font-bold text-explore"
            >
              {t('win_status', { count: play.questionsAsked })}
            </p>
          ) : (
            <p data-testid="qtree-wrong-note" className="text-center font-body text-sm font-semibold text-ink/70">
              {t('wrong_note')}
            </p>
          )}
          {guessResult !== null && (
            <button
              type="button"
              data-testid="qtree-play-again"
              onClick={restartPlay}
              className="rounded-pill bg-challenge px-5 py-2 font-display text-sm font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
            >
              {t('play_again')}
            </button>
          )}
        </div>
      );
    }
    if (playNode.animals.length === 0) {
      return (
        <div className="flex flex-col items-center gap-3">
          <p data-testid="qtree-empty-note" className="text-center font-body text-sm font-semibold text-ink/70">
            {t('empty_note')}
          </p>
          <button
            type="button"
            data-testid="qtree-play-again"
            onClick={restartPlay}
            className="rounded-pill bg-challenge px-5 py-2 font-display text-sm font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
          >
            {t('play_again')}
          </button>
        </div>
      );
    }
    // 2+ animals — the tree needs to grow.
    return (
      <div className="flex flex-col items-center gap-3">
        <p data-testid="qtree-grow-note" className="text-center font-body text-sm font-semibold text-ink/70">
          {t('grow_note', {
            names: playNode.animals.map((id) => animalLabel(id)).join(' · '),
          })}
        </p>
        <button
          type="button"
          data-testid="qtree-grow-build"
          onClick={() => switchMode('build')}
          className="rounded-pill bg-challenge px-5 py-2 font-display text-sm font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
        >
          {t('grow_build_btn')}
        </button>
      </div>
    );
  }

  // ── Share snapshot ─────────────────────────────────────────────────────────

  const shareText = built
    ? summaryLines(tree, { question: questionLabel, animal: animalLabel })
        .join('\n')
        .concat(best !== null ? `\n\n${t('best_line', { count: best })}` : '')
    : null;

  async function copyShare() {
    if (!shareText) return;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the text is visible to copy by hand */
    }
  }

  return (
    <div data-testid="question-tree" className="flex flex-col gap-4">
      <p
        data-testid="qtree-privacy-note"
        className="rounded-card bg-tint-lavender px-3 py-2 font-body text-sm font-semibold text-ink/80"
      >
        🔒 {t('privacy')}
      </p>

      {/* Mode tabs + score */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          data-testid="qtree-mode-build"
          onClick={() => switchMode('build')}
          aria-pressed={mode === 'build'}
          className={`rounded-pill px-4 py-1.5 font-body text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge ${
            mode === 'build' ? 'bg-challenge text-white' : 'bg-tint-blue text-ink'
          }`}
        >
          🌳 {t('mode_build')}
        </button>
        <button
          type="button"
          data-testid="qtree-mode-play"
          onClick={() => switchMode('play')}
          aria-pressed={mode === 'play'}
          className={`rounded-pill px-4 py-1.5 font-body text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge ${
            mode === 'play' ? 'bg-challenge text-white' : 'bg-tint-blue text-ink'
          }`}
        >
          🎮 {t('mode_play')}
        </button>
        <span data-testid="qtree-best" className="ltr:ml-auto rtl:mr-auto font-body text-sm font-bold text-ink/70">
          🏆 {best === null ? t('best_none') : t('best_label', { count: best })}
        </span>
      </div>

      {mode === 'build' ? (
        <section aria-label={t('mode_build')} className="flex flex-col gap-3 rounded-card bg-tint-cream p-4">
          {complete && built ? (
            <p
              data-testid="qtree-complete"
              role="status"
              className="rounded-card bg-explore/15 px-4 py-2 text-center font-display text-base font-bold text-explore"
            >
              {t('complete_banner')}
            </p>
          ) : (
            <p className="font-body text-sm font-semibold text-ink/70">{t('build_hint')}</p>
          )}
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-fit justify-center">
              <NodeView node={tree} path={[]} />
            </div>
          </div>
        </section>
      ) : (
        <section
          aria-label={t('mode_play')}
          data-testid="qtree-play-panel"
          className="flex flex-col items-center gap-3 rounded-card bg-tint-blue p-4"
        >
          <p className="font-body text-sm font-semibold text-ink/70">{t('play_hint')}</p>
          <PlayView />
        </section>
      )}

      {/* Share snapshot — the mission's no-photo share artefact */}
      {shareText && (
        <section aria-label={t('share_heading')} className="flex flex-col gap-2 rounded-card bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base text-ink">{t('share_heading')}</h3>
            <button
              type="button"
              data-testid="qtree-copy"
              onClick={() => void copyShare()}
              className="rounded-card border border-ink/20 bg-white px-3 py-1.5 font-body text-xs font-bold text-ink transition-colors hover:border-challenge/40 hover:bg-challenge/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge"
            >
              {copied ? t('copied') : t('copy')}
            </button>
          </div>
          <pre
            data-testid="qtree-share-summary"
            dir="auto"
            className="overflow-x-auto rounded-card bg-tint-cream p-3 font-body text-xs leading-relaxed text-ink"
          >
            {shareText}
          </pre>
        </section>
      )}

      <button
        type="button"
        data-testid="qtree-reset"
        onClick={resetAll}
        className="w-fit font-body text-xs font-semibold text-ink/50 underline-offset-2 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
      >
        {t('reset')}
      </button>
    </div>
  );
}

function collectCount(node: TreeNode): number {
  if (node.kind === 'leaf') return node.animals.length;
  return collectCount(node.yes) + collectCount(node.no);
}
