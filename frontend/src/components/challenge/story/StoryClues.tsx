'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Character3D, Popi, RewardPop, StepNav, pillCtaClass } from './StoryBits';
import type { MissionStory } from './types';
import type { BadgeKey, MissionGame, GameUpdate } from './useMissionGame';
import { discoveryOf, heroExtra, heroShort, type PartnerLesson } from './discovery';
import HeroJourney, { heroJourneyDone } from './HeroJourney';
import { howQuestion } from './StoryPictureBook';
import Inspired from '@/components/characters/Inspired';

interface Props {
  story: MissionStory;
  game: MissionGame;
  update: GameUpdate;
  award: (b: BadgeKey) => void;
  onNext: () => void;
  onBack: () => void;
  /** The page awards the clue badge (Nature Hero) on Next, with its popup. */
  deferClueBadge?: boolean;
  /** The challenge the kid's idea is saved under. */
  workKey: string;
}

/**
 * Step 3, Nature clues, in three parts:
 * 1. Meet the heroes: turn every card (intro → trick → what it does). All met → Clue Detective badge.
 * 2. Pick your Nature Hero: the hero the kid likes best to help solve the problem.
 * 3. The hero's journey: its video, Conspy, Popi's questions, the kid's one answer, Conspy's review.
 * We never suggest an answer: "peek at the card" only repeats what the card said.
 */
export default function StoryClues({ story, game, update, award, onNext, onBack, deferClueBadge = false, workKey }: Props) {
  const t = useTranslations('story');
  // Which cards show their words right now; a card can be turned back to its photo.
  const [turned, setTurned] = useState<number[]>([]);
  const cards = story.clue_cards;
  const allOpen = cards.every((_, i) => game.flipped.includes(i));
  const partner = game.partner !== null && game.partner !== undefined ? cards[game.partner] : null;
  // The partner's own hint for the idea question (Max's challenge), when the mission has one.
  const companion =
    partner && game.partner !== null && game.partner !== undefined
      ? discoveryOf(story)?.companions?.[game.partner] ?? null
      : null;
  // Template missions teach each partner with a worked example (secret, how, inspiration),
  // then only ask the kid's own turn.
  const lesson: PartnerLesson | null =
    game.partner !== null && game.partner !== undefined ? discoveryOf(story)?.partner_lessons?.[game.partner] ?? null : null;
  const allAnswered = partner !== null && heroJourneyDone(game);
  const cluesTop = discoveryOf(story)?.clues_top ?? null;
  // Popi opens with the mission's own question; every challenge then hears why nature can help.
  const missionQuestion = cluesTop?.question ?? howQuestion(story) ?? t('clues_how_help', { hero: heroShort(story) });
  const opening = [missionQuestion, t('clues_nature_inspires')].filter(Boolean).join('\n');
  const intro = cluesTop?.intro ?? story.guide.nature_clues;

  function flip(i: number) {
    if (!game.flipped.includes(i)) {
      const flipped = [...game.flipped, i];
      update({ flipped });
      // Meeting every nature hero earns the Clue Detective badge.
      if (!deferClueBadge && cards.every((_, k) => flipped.includes(k))) award('clue');
    }
    setTurned((v) => (v.includes(i) ? v.filter((x) => x !== i) : [...v, i]));
  }

  function choosePartner(i: number) {
    // Changing partner starts the three questions again, about the new one.
    if (game.partner === i) return;
    update({ partner: i, partnerAnswers: {}, partnerDone: [] });
  }

  return (
    <div data-testid="story-clues" className="flex flex-col gap-6 py-4">
      <div className="flex flex-col gap-3">
        <Popi text={opening} keepLines spokenText={`${opening} ${intro}`} />
        <p data-testid="clues-intro" className="font-body text-lg font-semibold leading-snug text-ink">
          <Inspired text={intro} />
        </p>
      </div>

      {/* ── Part 1: meet the heroes ── */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-2xl text-challenge">{story.function_question}</h2>
        <Meter label={t('heroes_met')} value={game.flipped.length} total={cards.length} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {cards.map((c, i) => {
            const open = turned.includes(i);
            return (
              <button
                key={c.name}
                type="button"
                data-testid={`clue-card-${i}`}
                data-open={open}
                onClick={() => flip(i)}
                aria-label={open ? t('clue_opened', { name: c.name }) : t('clue_closed', { name: c.name })}
                className="story-flip min-h-[320px] rounded-[20px] text-start focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63]"
              >
                <span className="story-flip-inner block min-h-[320px]">
                  {/* Front: the nature hero's picture. */}
                  <span className="story-face flex flex-col items-center justify-center gap-2 rounded-[20px] border border-[#58C6EE] bg-white p-5 text-center shadow-sm">
                    <Character3D src={c.image} emoji={c.emoji} alt={c.name} size={170} />
                    <span className="font-body text-2xl font-extrabold text-ink">{c.name}</span>
                    <span data-testid={`clue-intro-${i}`} className="font-body text-base font-semibold leading-snug text-[#4A5560]">{heroExtra(story, i)?.intro ?? c.tagline}</span>
                    <span className="font-body text-sm font-bold text-[#1A6FA6]">{t('tap_to_open')}</span>
                  </span>
                  {/* Back: the words. */}
                  <span className="story-face story-back flex flex-col gap-2 rounded-[20px] border border-[#58C6EE] bg-white p-5 shadow-sm">
                    <span className="font-body text-2xl font-extrabold text-ink">{c.name}</span>
                    <span className="font-body text-lg font-extrabold text-[#1E7A44]">{t('its_trick')}</span>
                    <span className="font-body text-base font-medium leading-snug text-ink">{c.trick}</span>
                    <span className="font-body text-lg font-extrabold text-[#1E7A44]">{t('what_it_does')}</span>
                    <span className="font-body text-base font-medium leading-snug text-ink">{c.does}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {allOpen && !deferClueBadge && <RewardPop text={t('badge_earned', { badge: t('badge_clue') })} />}
      </section>

      {/* ── Part 2: pick your Nature Hero ── */}
      {allOpen && (
        <section data-testid="pick-partner" className="story-rise flex flex-col gap-3">
          {/* With its own words under the title, Popi's line would say the same thing twice. */}
          {!discoveryOf(story)?.choose_hero_text && <Popi text={t('partner_pick_popi', { hero: heroShort(story) })} />}
          <h2 className="font-display text-2xl text-challenge">{t('partner_pick_title')}</h2>
          {discoveryOf(story)?.choose_hero_text && (
            <p data-testid="choose-hero-text" className="font-body text-lg font-semibold leading-snug text-ink">
              <Inspired text={discoveryOf(story)?.choose_hero_text ?? ''} />
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label={t('partner_pick_title')}>
            {cards.map((c, i) => {
              const on = game.partner === i;
              return (
                <button
                  key={c.name}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-testid={`partner-${i}`}
                  onClick={() => choosePartner(i)}
                  className={[
                    'flex flex-col items-center gap-1 rounded-[18px] border-2 bg-white p-3 text-center transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63]',
                    on ? 'scale-[1.03] border-[#1A6FA6] bg-[#EAF5FC] shadow-[0_0_0_4px_#CDE7F7]' : 'border-[#D6E4EE] hover:border-[#58C6EE]',
                  ].join(' ')}
                >
                  <Character3D src={c.image} emoji={c.emoji} alt="" size={96} />
                  <span className="font-body text-base font-extrabold text-ink">{c.name}</span>
                  {on && (
                    <span className="rounded-pill bg-[#1A6FA6] px-2.5 py-0.5 font-body text-xs font-bold text-white">
                      {t('partner_chip')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Part 3: the chosen hero's journey ── */}
      {partner && game.partner !== null && game.partner !== undefined && (
        <HeroJourney
          key={game.partner}
          story={story}
          card={partner}
          index={game.partner}
          lesson={lesson}
          companion={companion}
          game={game}
          update={update}
          workKey={workKey}
        />
      )}

      <StepNav onBack={onBack} backLabel={t('back')}>
        <button type="button" data-testid="clues-next" onClick={onNext} disabled={!allAnswered} className={pillCtaClass}>
          {lesson ? t('clues_next_hero') : t('clues_next')}
        </button>
      </StepNav>
    </div>
  );
}

/** A progress meter that fills as the kid goes (heroes met, inspiration). */
function Meter({ label, value, total, icon = '' }: { label: string; value: number; total: number; icon?: string }) {
  const shown = Math.min(value, total);
  const pct = total > 0 ? Math.round((shown / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 font-body text-sm font-extrabold text-[#1E7A44]">
      <span>{label}</span>
      <span
        className="h-3 flex-1 overflow-hidden rounded-pill bg-[#E3EEF5]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={shown}
        aria-label={label}
      >
        <span
          className="block h-full rounded-pill bg-gradient-to-r from-[#D1EF5A] to-[#9ED34A] transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span dir="ltr">
        {shown}/{total} {shown >= total ? icon : ''}
      </span>
    </div>
  );
}
