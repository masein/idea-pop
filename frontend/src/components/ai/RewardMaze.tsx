'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  CELL_EMOJI,
  type CellType,
  DEFAULT_REWARDS,
  decayEpsilon,
  defaultMaze,
  EPSILON_START,
  GRID,
  greedyPath,
  type Maze,
  mazeSummaryLines,
  newQ,
  placeCell,
  REWARD_LIMITS,
  type Rewards,
  runEpisode,
  type TryRecord,
} from '@/lib/ai/rewardMazeCore';
import { clearMaze, loadMaze, saveMaze } from '@/lib/ai/rewardMazeStorage';

/**
 * The Reward Maze game: kids place START/CHEESE/WALLS/TRAPS on a 5×5 grid,
 * set the rewards, and press "Run a try" — a robot mouse learns the path by
 * reinforcement (Q-learning), its step count dropping try after try. All
 * on-device; the maze + what the mouse has learned live in localStorage so
 * they follow the kid across mission steps.
 */

type Tool = CellType; // the palette maps 1:1 onto cell types ('empty' = eraser)

const TOOLS: Tool[] = ['start', 'cheese', 'wall', 'trap', 'empty'];
const ANIM_MS = 60; // per animated cell
const ANIM_MAX_FRAMES = 40; // long wanders play compressed so a try never drags

/** Evenly sample a long path down to ANIM_MAX_FRAMES cells (ends preserved). */
function compressPath(path: number[]): number[] {
  if (path.length <= ANIM_MAX_FRAMES) return path;
  const out: number[] = [];
  for (let i = 0; i < ANIM_MAX_FRAMES - 1; i++) {
    out.push(path[Math.floor((i * (path.length - 1)) / (ANIM_MAX_FRAMES - 1))]);
  }
  out.push(path[path.length - 1]);
  return out;
}

export default function RewardMaze() {
  const t = useTranslations('maze');

  const [maze, setMaze] = useState<Maze>(defaultMaze);
  const [rewards, setRewards] = useState<Rewards>(DEFAULT_REWARDS);
  const [q, setQ] = useState<number[][]>(newQ);
  const [epsilon, setEpsilon] = useState(EPSILON_START);
  const [history, setHistory] = useState<TryRecord[]>([]);
  const [tool, setTool] = useState<Tool>('wall');
  const [anim, setAnim] = useState<{ path: number[]; index: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const loadedRef = useRef(false);

  // Load once, then persist every change (on-device only).
  useEffect(() => {
    const saved = loadMaze();
    if (saved) {
      setMaze(saved.maze);
      setRewards(saved.rewards);
      setQ(saved.q);
      setEpsilon(saved.epsilon);
      setHistory(saved.history);
    }
    loadedRef.current = true;
  }, []);
  useEffect(() => {
    if (loadedRef.current) saveMaze({ maze, rewards, q, epsilon, history });
  }, [maze, rewards, q, epsilon, history]);

  const best = anim ? null : greedyPath(maze, q);
  const bestCells = new Set(best ?? []);
  const bestCrossesTrap = best !== null && best.some((i) => maze[i] === 'trap');
  const mouseAt = anim ? anim.path[anim.index] : null;

  /** Any edit means the world changed — the mouse must re-learn. */
  function forgetLearning() {
    setQ(newQ());
    setEpsilon(EPSILON_START);
    setHistory([]);
  }

  function tapCell(index: number) {
    if (anim) return;
    const next = placeCell(maze, index, tool);
    if (next === maze) return; // no-op tap (e.g. wall over the start)
    setMaze(next);
    forgetLearning();
  }

  function editReward(key: keyof Rewards, raw: string) {
    const value = Math.min(REWARD_LIMITS.max, Math.max(REWARD_LIMITS.min, Number(raw) || 0));
    setRewards((prev) => ({ ...prev, [key]: value }));
    forgetLearning();
  }

  function runTry() {
    if (anim) return;
    const nextQ = q.map((row) => [...row]); // learn on a copy, commit at once
    const result = runEpisode(maze, rewards, nextQ, epsilon, Math.random);
    setQ(nextQ);
    if (result.outcome === 'cheese') setEpsilon((e) => decayEpsilon(e));
    setHistory((prev) => [...prev, { steps: result.steps, outcome: result.outcome }]);
    setAnim({ path: compressPath(result.path), index: 0 });
  }

  // Path animation: advance the mouse one cell per tick.
  useEffect(() => {
    if (!anim) return;
    if (anim.index >= anim.path.length - 1) {
      const timer = setTimeout(() => setAnim(null), 400);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setAnim((a) => a && { ...a, index: a.index + 1 }), ANIM_MS);
    return () => clearTimeout(timer);
  }, [anim]);

  function startOver() {
    setMaze(defaultMaze());
    setRewards(DEFAULT_REWARDS);
    forgetLearning();
    setAnim(null);
    clearMaze();
  }

  // ── Share snapshot ─────────────────────────────────────────────────────────

  const shareText =
    history.length > 0
      ? mazeSummaryLines(maze, history, {
          tryLine: (n, steps, outcome) =>
            outcome === 'cheese'
              ? t('try_line_cheese', { n, steps })
              : t('try_line_timeout', { n }),
        }).join('\n')
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
    <div data-testid="reward-maze" className="flex flex-col gap-4">
      <p
        data-testid="maze-privacy-note"
        className="rounded-card bg-tint-lavender px-3 py-2 font-body text-sm font-semibold text-ink/80"
      >
        🔒 {t('privacy')}
      </p>

      {/* 1 · Build the world */}
      <section aria-label={t('build_heading')} className="flex flex-col gap-3 rounded-card bg-tint-cream p-4">
        <h3 className="font-display text-lg text-ink">{t('build_heading')}</h3>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('palette_label')}>
          {TOOLS.map((item) => (
            <button
              key={item}
              type="button"
              data-testid={`maze-tool-${item}`}
              onClick={() => setTool(item)}
              aria-pressed={tool === item}
              className={`rounded-pill px-3 py-1.5 font-body text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge ${
                tool === item ? 'bg-challenge text-white' : 'bg-white text-ink'
              }`}
            >
              {item === 'empty' ? '🧽' : CELL_EMOJI[item]} {t(`tool_${item}`)}
            </button>
          ))}
        </div>

        {/* The maze is spatial, not text — keep it LTR so moves read the same in FA */}
        <div dir="ltr" className="grid w-fit grid-cols-5 gap-1" role="group" aria-label={t('grid_label')}>
          {maze.map((cell, i) => {
            const onBest = bestCells.has(i);
            return (
              <button
                key={i}
                type="button"
                data-testid={`maze-cell-${i}`}
                onClick={() => tapCell(i)}
                aria-label={t('cell_label', { number: i + 1, type: t(`tool_${cell}`) })}
                className={`flex h-12 w-12 items-center justify-center rounded-lg border text-xl transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge sm:h-14 sm:w-14 ${
                  onBest
                    ? maze[i] === 'trap'
                      ? 'border-coral bg-coral/20 ring-2 ring-coral'
                      : 'border-explore bg-explore/15 ring-2 ring-explore/60'
                    : 'border-ink/15 bg-white hover:border-challenge/40'
                }`}
              >
                <span aria-hidden="true">
                  {mouseAt === i
                    ? '🐭' // the mouse mid-animation
                    : cell === 'empty' || (cell === 'start' && mouseAt !== null)
                      ? '' // empty floor; the start marker hides while the mouse is out
                      : CELL_EMOJI[cell]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end gap-3" role="group" aria-label={t('rewards_label')}>
          {(['cheese', 'step', 'trap'] as const).map((key) => (
            <label key={key} className="flex flex-col gap-1 font-body text-xs font-bold text-ink/70">
              {t(`reward_${key}`)}
              <input
                type="number"
                data-testid={`maze-reward-${key}`}
                value={rewards[key]}
                min={REWARD_LIMITS.min}
                max={REWARD_LIMITS.max}
                onChange={(e) => editReward(key, e.target.value)}
                className="w-20 rounded-card border border-ink/20 px-2 py-1.5 font-body text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge"
              />
            </label>
          ))}
          <p className="font-body text-xs text-ink/50">{t('edit_note')}</p>
        </div>
      </section>

      {/* 2 · Train the mouse */}
      <section aria-label={t('train_heading')} className="flex flex-col gap-3 rounded-card bg-tint-blue p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-display text-lg text-ink ltr:mr-auto rtl:ml-auto">{t('train_heading')}</h3>
          <button
            type="button"
            data-testid="maze-run"
            onClick={runTry}
            disabled={anim !== null}
            className="rounded-pill bg-challenge px-5 py-2.5 font-display text-base font-bold text-white transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 disabled:opacity-50"
          >
            {anim ? t('running') : t('run_try')}
          </button>
        </div>

        {best ? (
          bestCrossesTrap ? (
            <p
              data-testid="maze-trap-warning"
              role="status"
              className="rounded-card bg-coral/10 px-4 py-2 text-center font-body text-sm font-bold text-coral"
            >
              {t('trap_warning', { steps: best.length - 1 })}
            </p>
          ) : (
            <p
              data-testid="maze-best-note"
              role="status"
              className="rounded-card bg-explore/15 px-4 py-2 text-center font-display text-base font-bold text-explore"
            >
              {t('best_note', { steps: best.length - 1 })}
            </p>
          )
        ) : (
          <p data-testid="maze-still-learning" className="font-body text-sm font-semibold text-ink/70">
            {history.length === 0 ? t('no_tries_yet') : t('still_learning')}
          </p>
        )}

        {history.length > 0 && (
          <ol data-testid="maze-history" className="flex flex-col gap-1" dir="auto">
            {history.map((record, i) => (
              <li key={i} data-testid={`maze-try-${i + 1}`} className="font-body text-sm text-ink/80">
                {record.outcome === 'cheese'
                  ? t('try_line_cheese', { n: i + 1, steps: record.steps })
                  : t('try_line_timeout', { n: i + 1 })}
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* Share snapshot — the mission's no-photo share artefact */}
      {shareText && (
        <section aria-label={t('share_heading')} className="flex flex-col gap-2 rounded-card bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-base text-ink">{t('share_heading')}</h3>
            <button
              type="button"
              data-testid="maze-copy"
              onClick={() => void copyShare()}
              className="rounded-card border border-ink/20 bg-white px-3 py-1.5 font-body text-xs font-bold text-ink transition-colors hover:border-challenge/40 hover:bg-challenge/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge"
            >
              {copied ? t('copied') : t('copy')}
            </button>
          </div>
          <pre
            data-testid="maze-share-summary"
            dir="auto"
            className="overflow-x-auto rounded-card bg-tint-cream p-3 font-body text-xs leading-relaxed text-ink"
          >
            {shareText}
          </pre>
        </section>
      )}

      <div className="flex flex-wrap gap-4">
        <button
          type="button"
          data-testid="maze-reset-learning"
          onClick={() => {
            forgetLearning();
            setAnim(null);
          }}
          className="w-fit font-body text-xs font-semibold text-ink/50 underline-offset-2 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
        >
          {t('reset_learning')}
        </button>
        <button
          type="button"
          data-testid="maze-start-over"
          onClick={startOver}
          className="w-fit font-body text-xs font-semibold text-ink/50 underline-offset-2 hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
        >
          {t('start_over')}
        </button>
      </div>
    </div>
  );
}
