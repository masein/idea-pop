'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import XpInfoDialog from './XpInfoDialog';
import StarRow from './StarRow';
import { btnPrimary, btnSecondary } from '@/components/challenge/buttons';

const ALL_STEPS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const INFO_KEYS = ['problem', 'goal', 'rules'] as const;

/** Difficulty bands for the step dots: 1 explore and understand, 2 create and experiment,
 *  3 improve and master. Soft outline, darker fill (white tick stays readable). */
const LEVEL_STYLE: Record<number, { line: string; fill: string; tint: string; text: string }> = {
  1: { line: '#7FD4A0', fill: '#2E8B57', tint: '#E6F8EC', text: '#1E6B40' },
  2: { line: '#F5B57A', fill: '#B85A12', tint: '#FFF0E0', text: '#8A4310' },
  3: { line: '#F29A8F', fill: '#C0473A', tint: '#FDE8E5', text: '#9A3328' },
};

/** The mission's key facts, shown under the title on every step. */
export interface MissionKeyInfo {
  problem: string;
  goal: string;
  rules: string;
}

interface MissionHUDProps {
  challenge: { title: string; emoji: string; completion_xp: number };
  currentStep: number; // 1-8
  reachedSteps: Set<number>;
  onJumpTo: (step: number) => void;
  ideaPath?: 'yes' | 'no' | null;
  /** Problem / Goal / Rules pinned under the title (story missions). */
  keyInfo?: MissionKeyInfo | null;
  /** Fallback one-line problem statement when there is no story card. */
  summary?: string | null;
  /** Clears this challenge's answers and goes back to step 1. */
  onRestart?: () => void;
  /** This mission's own step names, in order (e.g. Max's 9 steps); default: the usual 8. */
  stepNames?: string[];
  /** Each step's difficulty band (1–3), same order as the steps; colours the step dots. */
  stepLevels?: number[];
  /** The kid's stars on this challenge; shown beside the XP when given. */
  stars?: number[] | null;
}

export default function MissionHUD({
  challenge,
  currentStep,
  reachedSteps,
  onJumpTo,
  keyInfo = null,
  summary = null,
  onRestart,
  stepNames,
  stepLevels,
  stars = null,
}: MissionHUDProps) {
  const t = useTranslations('challenge');
  const steps: number[] = stepNames ? stepNames.map((_, i) => i + 1) : [...ALL_STEPS];
  const shown = (step: number) => step;
  const stepName = (step: number) => stepNames?.[step - 1] ?? t(`step_name_${step}`);
  const tStory = useTranslations('story');
  const [menuOpen, setMenuOpen] = useState(false);
  const [xpOpen, setXpOpen] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const levelOf = (step: number) => stepLevels?.[step - 1] ?? 0;
  const maxReached = Math.max(currentStep, ...Array.from(reachedSteps));

  function handleStepClick(step: number) {
    if (reachedSteps.has(step)) {
      onJumpTo(step);
      setMenuOpen(false);
    }
  }

  return (
    <div data-testid="mission-hud" className="relative z-40">
      {/* Title bar */}
      {/* z-50 keeps the bar above the tap-outside backdrop, so ✕ still works */}
      <div className="relative z-50 flex items-center gap-2 bg-white px-4 py-3 shadow-sm">
        {/* Left: menu toggle (☰ opens and closes; the open menu also has its own ✕) */}
        <button
          data-testid="mission-menu-button"
          aria-label={t('hud_menu_aria')}
          aria-expanded={menuOpen}
          onClick={() => {
            setXpOpen(false);
            setMenuOpen((v) => !v);
          }}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-tint-blue transition-colors"
        >
          <span className="text-lg leading-none" aria-hidden="true">
            ☰
          </span>
        </button>

        {/* Center: title */}
        <h1
          data-testid="mission-title"
          className="line-clamp-2 min-w-0 flex-1 text-center font-display text-xl leading-tight text-ink sm:text-2xl md:text-3xl"
        >
          {challenge.emoji} {challenge.title}
        </h1>

        {/* Right: the three stars, then the XP badge — a button that explains XP and stars.
            dir=ltr so "+N XP" doesn't reorder in RTL. */}
        {stars && <StarRow stars={stars} size={20} className="shrink-0" />}
        <button
          type="button"
          dir="ltr"
          data-testid="hud-xp-button"
                    aria-label={t('hud_xp_aria', { xp: challenge.completion_xp })}
          aria-expanded={xpOpen}
          onClick={() => {
            setMenuOpen(false);
            setXpOpen((v) => !v);
          }}
          className="flex shrink-0 items-center gap-1 rounded-pill bg-challenge px-3 py-1.5 font-body text-xs font-semibold text-white shadow-sm transition-transform hover:scale-105 hover:bg-challenge/90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">⭐</span>
          {t('hud_xp', { xp: challenge.completion_xp })}
          <span
            aria-hidden="true"
            className="flex h-4 w-4 items-center justify-center rounded-full bg-white/25 text-[10px] leading-none"
          >
            ?
          </span>
        </button>
      </div>

      {/* Key info: the problem statement and constraints, from step 2 on
          (step 1, the Brief, already shows the full story card). */}
      {currentStep < 2 ? null : keyInfo ? (
        <dl
          data-testid="mission-key-info"
          className="grid grid-cols-3 gap-2 border-t border-ink/5 bg-white px-4 py-2.5"
        >
          {INFO_KEYS.map((k) => (
            <div key={k} className="min-w-0 rounded-lg bg-tint-blue/60 px-2.5 py-2">
              <dt className="font-body text-xs font-bold uppercase tracking-wide text-challenge sm:text-sm">
                {tStory(`card_${k}`)}
              </dt>
              <dd className="font-body text-sm leading-snug text-ink sm:text-base">{keyInfo[k]}</dd>
            </div>
          ))}
        </dl>
      ) : summary ? (
        <p
          data-testid="mission-key-info"
          className="line-clamp-2 border-t border-ink/5 bg-white px-4 py-2.5 text-center font-body text-sm text-ink/80 sm:text-base"
        >
          <span className="font-bold text-challenge">{tStory('card_problem')}: </span>
          {summary}
        </p>
      ) : null}

      {/* Progress: all eight steps. Current = highlighted, visited = dark,
          not yet unlocked = hollow ring. Under them, the current step's name,
          the same name the menu uses. */}
      <div className="flex items-center justify-center gap-1.5 bg-white px-4 pb-2.5 pt-1">
        {steps.map((step) => {
          const isCurrent = step === currentStep;
          const isVisited = !isCurrent && reachedSteps.has(step);
          const state = isCurrent ? 'current' : isVisited ? 'done' : 'locked';
          const level = levelOf(step);
          if (level) {
            // Difficulty dots: shape and fill say the state, not only the colour.
            const c = LEVEL_STYLE[level];
            const levelState = isCurrent ? 'current' : isVisited ? (step < maxReached ? 'done' : 'available') : 'locked';
            return (
              <button
                key={step}
                type="button"
                data-testid={`progress-dot-${step}`}
                data-state={state}
                data-level={level}
                disabled={!isCurrent && !isVisited}
                aria-current={isCurrent ? 'step' : undefined}
                aria-label={t('hud_step_level_aria', {
                  step,
                  name: stepName(step),
                  level: t(`hud_level_${level}`),
                  state: t(`hud_state_${levelState}`),
                })}
                title={`${stepName(step)} · ${t(`hud_level_${level}`)}`}
                onClick={() => isVisited && onJumpTo(step)}
                style={
                  levelState === 'done'
                    ? { background: c.fill, borderColor: c.fill, color: '#fff' }
                    : levelState === 'current'
                      ? { background: c.tint, borderColor: c.fill, color: c.text, boxShadow: `0 0 0 3px #fff, 0 0 0 5px ${c.line}` }
                      : levelState === 'available'
                        ? { background: '#fff', borderColor: c.line, color: c.text }
                        : { background: '#fff', borderColor: c.line, color: c.text, opacity: 0.6 }
                }
                className={[
                  'flex shrink-0 items-center justify-center rounded-full border-2 font-display leading-none transition-all duration-300',
                  isCurrent ? 'h-8 w-8 text-sm' : 'h-6 w-6 text-[11px]',
                  levelState === 'locked' ? 'cursor-not-allowed border-dashed' : '',
                  isVisited ? 'hover:scale-110' : '',
                ].join(' ')}
              >
                {levelState === 'done' ? <span aria-hidden="true">✓</span> : step}
              </button>
            );
          }

          return (
            <button
              key={step}
              type="button"
              data-testid={`progress-dot-${step}`}
              data-state={state}
              disabled={!isCurrent && !isVisited}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={t('hud_step_aria', { step: shown(step), state })}
              onClick={() => isVisited && onJumpTo(step)}
              className={[
                'flex shrink-0 items-center justify-center rounded-full font-display leading-none transition-all duration-300',
                isCurrent
                  ? 'h-7 w-7 bg-[#C0F0FF] text-sm text-[#333333] ring-2 ring-challenge ring-offset-2'
                  : isVisited
                    ? 'h-6 w-6 bg-[#1B5E86] text-[11px] text-white hover:scale-110'
                    : 'h-6 w-6 cursor-not-allowed border-2 border-challenge/40 bg-transparent text-[11px] text-challenge/60',
              ].join(' ')}
            >
              {shown(step)}
            </button>
          );
        })}
      </div>
      <p
        data-testid="progress-label"
        aria-live="polite"
        className="bg-white px-4 pb-2.5 text-center font-body text-sm font-semibold text-challenge"
      >
        {stepName(currentStep)}
        {levelOf(currentStep) > 0 && (
          <span style={{ color: LEVEL_STYLE[levelOf(currentStep)].text }} className="font-bold">
            {' · '}
            {t(`hud_level_${levelOf(currentStep)}`)}
          </span>
        )}
      </p>

      {xpOpen && (
        <XpInfoDialog missionXp={challenge.completion_xp} withStars={!!stars} onClose={() => setXpOpen(false)} />
      )}

      {/* Mission menu dropdown */}
      {menuOpen && (
        <div
          data-testid="mission-menu-backdrop"
          className="fixed inset-0 z-40"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
      )}
      {menuOpen && (
        <div
          data-testid="mission-menu"
          className="absolute left-0 right-0 top-full z-50 rounded-b-xl border-t border-ink/10 bg-white shadow-xl"
        >
          {/* Laid out like the XP panel: a heading with a ✕ to close, and the list
              kept to a centred column rather than stretched edge to edge. */}
          <div className="mx-auto max-w-2xl">
          <div className="flex items-center justify-between px-5 pt-4">
            <h2 className="font-display text-lg text-challenge">🗺️ {t('hud_menu_title')}</h2>
            <button
              type="button"
              data-testid="mission-menu-close"
              onClick={() => setMenuOpen(false)}
              aria-label={t('hud_menu_close_aria')}
              className="rounded-lg p-1 text-ink/50 hover:bg-tint-blue hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge"
            >
              ✕
            </button>
          </div>
          <ul role="list" className="flex flex-col gap-1 p-2 pb-4">
            {steps.map((step) => {
              const isReached = reachedSteps.has(step);
              const isCurrent = step === currentStep;

              return (
                <li key={step}>
                  <button
                    data-testid={`mission-step-${step}`}
                    onClick={() => handleStepClick(step)}
                    disabled={!isReached}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={[
                      'flex w-full items-center gap-3 rounded-xl border-2 px-5 py-3 text-start font-body text-lg transition-colors',
                      isCurrent
                        ? 'border-[#8FD3F7] bg-tint-blue/60 text-ink'
                        : isReached
                          ? 'border-transparent cursor-pointer hover:bg-tint-blue text-ink'
                          : 'border-transparent cursor-not-allowed text-ink/30',
                    ].join(' ')}
                  >
                    {/* Dot indicator */}
                    <span
                      className={[
                        'h-3 w-3 shrink-0 rounded-full',
                        isReached ? 'bg-challenge' : 'bg-ink/20',
                      ].join(' ')}
                      aria-hidden="true"
                    />

                    {/* Step number */}
                    <span className="w-5 shrink-0 font-body font-bold text-base text-ink/50">
                      {shown(step)}
                    </span>

                    {/* Step name */}
                    <span className="flex-1">{stepName(step)}</span>

                  </button>
                </li>
              );
            })}
          </ul>
          {onRestart && (
            <div className="mx-2 mb-4 border-t border-ink/10 px-3 pt-4">
              {confirmRestart ? (
                <div data-testid="restart-confirm" className="flex flex-col gap-3 rounded-xl bg-[#FFF7E0] p-4">
                  <p className="font-body text-base font-semibold text-ink">{t('restart_confirm')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid="restart-yes"
                      onClick={() => {
                        setConfirmRestart(false);
                        setMenuOpen(false);
                        onRestart();
                      }}
                      className={btnPrimary}
                    >
                      {t('restart_yes')}
                    </button>
                    <button type="button" onClick={() => setConfirmRestart(false)} className={btnSecondary}>
                      {t('restart_cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" data-testid="restart-mission" onClick={() => setConfirmRestart(true)} className={btnSecondary}>
                  🔄 {t('restart_cta')}
                </button>
              )}
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
