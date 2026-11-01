'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Character3D } from './StoryBits';
import { btnPrimary, btnText } from '@/components/challenge/buttons';
import type { PartnerLesson } from './discovery';
import type { MissionStory } from './types';
import type { GameUpdate, MissionGame } from './useMissionGame';
import AssetSlot from '@/components/AssetSlot';

type ClueCard = MissionStory['clue_cards'][number];

/** The kid's answers in this flow, kept in the mission's saved state (partnerAnswers). */
export const HERO_KEYS = ['attention', 'f_what', 'f_why', 'f_how', 'inspired'] as const;
type HeroKey = (typeof HERO_KEYS)[number];

/** Enough written for each step to count (we never mark answers right or wrong). */
const filled = (v: string | undefined, min = 2) => (v ?? '').trim().length >= min;

/** The three parts the kid moves on from with their own "Next" (kept in partnerDone). */
const STAGES = ['attention', 'questions', 'idea'] as const;

/** Every step of the hero flow is written and moved on from: the kid can go on to design. */
export function heroFlowDone(answers: Record<string, string>, done: string[]): boolean {
  return HERO_KEYS.every((k) => filled(answers[k], k === 'inspired' ? 3 : 2)) && STAGES.every((st) => done.includes(st));
}

/**
 * The chosen Nature Hero in focus: observe → notice → understand how → the three thinking
 * questions → think like your hero for Max → what "inspired by nature" means. Each part
 * opens when the one before it is written; nothing is marked right or wrong. A hint (only
 * when asked for) points at the mechanism, never at a finished design.
 */
export default function HeroFocus({
  card,
  lesson,
  hero,
  game,
  update,
}: {
  card: ClueCard;
  lesson: PartnerLesson;
  /** The story's hero ("Max"). */
  hero: string;
  game: MissionGame;
  update: GameUpdate;
}) {
  const t = useTranslations('story');
  const answers = game.partnerAnswers ?? {};
  const [hintOpen, setHintOpen] = useState(false);
  const set = (k: HeroKey, v: string) => update((g) => ({ partnerAnswers: { ...g.partnerAnswers, [k]: v } }));
  const done = game.partnerDone ?? [];
  const finish = (st: (typeof STAGES)[number]) =>
    update((g) => ({ partnerDone: g.partnerDone.includes(st) ? g.partnerDone : [...g.partnerDone, st] }));
  // "Next ›" under a part, once it is written; the next part opens when the kid presses it.
  const next = (st: (typeof STAGES)[number], ready: boolean) =>
    !done.includes(st) && (
      <button type="button" data-testid={`hero-next-${st}`} disabled={!ready} onClick={() => finish(st)} className={`${btnPrimary} self-end`}>
        {t('hero_next')}
      </button>
    );
  const box = (k: HeroKey, label: string, rows = 2, placeholder = t('partner_placeholder'), big = false) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`hero-${k}`} className={big ? 'font-display text-2xl text-challenge' : 'font-body text-base font-bold text-ink'}>
        {label}
      </label>
      <textarea
        id={`hero-${k}`}
        data-testid={`hero-${k}`}
        rows={rows}
        maxLength={big ? 600 : 240}
        dir="auto"
        value={answers[k] ?? ''}
        onChange={(e) => set(k, e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none rounded-[14px] border border-[#8FA3B8] bg-white px-3 py-2 font-body text-base text-ink placeholder:text-ink/40 focus:border-challenge focus:outline-none focus:ring-2 focus:ring-challenge/30"
      />
    </div>
  );
  // What was special about this hero: the facts the kid already met on its card.
  const callouts = [
    { label: t('its_trick'), text: card.trick },
    { label: t('what_it_does'), text: card.does },
  ];
  const step2 = done.includes('attention');
  const step3 = step2 && done.includes('questions');
  const step4 = step3 && done.includes('idea');

  return (
    <div data-testid="hero-focus" className="story-rise flex flex-col gap-5">
      {/* 1. The chosen hero, big and in the middle, with what made it special around it. */}
      <section className="flex flex-col items-center gap-4 rounded-[24px] bg-gradient-to-b from-[#EAF5FC] to-white p-5">
        <h2 className="text-center font-display text-2xl text-challenge">{t('partner_think_title', { name: card.name })}</h2>
        <div className="grid w-full grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <Callout {...callouts[0]} side="start" />
          <div className="relative flex flex-col items-center">
            <span className="hero-float block">
              <Character3D src={card.image ?? null} emoji={card.emoji} alt={card.name} size={200} />
            </span>
            <span data-testid="my-hero-label" className="mt-1 rounded-pill bg-[#1A6FA6] px-4 py-1 font-body text-sm font-extrabold text-white shadow-md">
              {t('partner_chip')}: {card.name}
            </span>
          </div>
          <Callout {...callouts[1]} side="end" />
        </div>
      </section>

      {/* 2. Why this hero? */}
      <section className="flex flex-col gap-2 rounded-[20px] bg-white p-5 shadow-sm">
        <p className="font-display text-2xl text-challenge">{t('hero_attention_title')}</p>
        {box('attention', t('hero_attention_q', { hero }), 3)}
        {next('attention', filled(answers.attention))}
      </section>

      {/* 3. How it works, again, simply, with a picture of the trick when there is one. */}
      {step2 && (
        <section data-testid="hero-how" className="story-rise flex flex-col gap-3 rounded-[20px] bg-[#E6F8EC] p-5">
          <p className="font-display text-2xl text-[#1E6B40]">{t('hero_how_title')}</p>
          <p className="font-body text-lg font-medium leading-snug text-ink">{lesson.how}</p>
          {lesson.diagram && (
            // eslint-disable-next-line @next/next/no-img-element -- a small authored diagram (SVG)
            <img src={lesson.diagram} alt={lesson.diagram_alt ?? ''} data-testid="lesson-diagram" className="w-full max-w-xl self-center rounded-xl border border-[#BFE6C8] bg-white" />
          )}
          {/* 4. Three thinking questions: from seeing a feature to understanding it. */}
          <div className="grid grid-cols-1 gap-3 rounded-[16px] bg-white p-4 sm:grid-cols-3">
            {box('f_what', t('hero_q_what'))}
            {box('f_why', t('hero_q_why'))}
            {box('f_how', t('hero_q_how'))}
          </div>
          {next('questions', filled(answers.f_what) && filled(answers.f_why) && filled(answers.f_how))}
        </section>
      )}

      {/* 5. Back to Max: think like your hero. */}
      {step3 && (
        <section data-testid="hero-idea" className="story-rise flex flex-col gap-3 rounded-[20px] bg-[#FFF7D6] p-5">
          <p className="font-body text-sm font-extrabold uppercase tracking-wide text-[#7A5A00]">{t('hero_now_think')}</p>
          <p className="font-body text-base font-semibold text-ink">{t('hero_now_text', { hero })}</p>
          {box('inspired', t('hero_idea_q', { hero }), 5, t('hero_idea_placeholder'), true)}
          <p className="font-body text-sm text-[#5a4300]">{t('hero_idea_help')}</p>
          {lesson.hint && (
            <>
              <button type="button" data-testid="hero-hint-btn" onClick={() => setHintOpen((v) => !v)} className={`${btnText} self-start !px-0`}>
                <AssetSlot id="CHALLENGE-UI-003" variant="dot" />{t('subst_hint_btn')}
              </button>
              {hintOpen && (
                <div data-testid="hero-hint" className="story-pop flex flex-col gap-1 rounded-[14px] bg-white px-4 py-3">
                  <p className="font-body text-sm font-extrabold text-[#7A5A00]">{t('hero_hint_title')}</p>
                  <p className="font-body text-base text-ink">{lesson.hint.text}</p>
                  <p className="font-body text-base font-bold text-ink">{lesson.hint.ask}</p>
                </div>
              )}
            </>
          )}
          {next('idea', filled(answers.inspired, 3))}
        </section>
      )}

      {/* 6. What "inspired by nature" means, before designing. */}
      {step4 && (
        <section data-testid="inspired-means" className="story-rise flex flex-col gap-3 rounded-[20px] bg-white p-5 shadow-sm">
          <p className="font-display text-2xl text-challenge">{t('inspired_means_title')}</p>
          <p className="font-body text-base font-semibold text-ink">{t('inspired_quote')}</p>
          <ol className="flex flex-wrap items-center gap-2" aria-label={t('inspired_means_title')}>
            {(['inspired_flow_1', 'inspired_flow_2', 'inspired_flow_3', 'inspired_flow_4'] as const).map((k, i) => (
              <li key={k} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden="true" className="text-xl text-challenge">→</span>}
                <span className="rounded-pill bg-[#EAF5FC] px-3 py-1.5 font-body text-sm font-extrabold text-[#135A85]">
                  <AssetSlot id="CHALLENGE-STORY-001" variant="dot" />{t(k)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function Callout({ label, text, side }: { label: string; text: string; side: 'start' | 'end' }) {
  return (
    <div
      className={`story-pop rounded-[16px] border border-[#CDE7F7] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(26,111,166,0.12)] ${
        side === 'start' ? 'sm:me-2' : 'sm:ms-2'
      }`}
    >
      <p className="font-body text-xs font-extrabold uppercase tracking-wide text-[#1E7A44]">{label}</p>
      <p className="font-body text-base font-semibold leading-snug text-ink">{text}</p>
    </div>
  );
}
