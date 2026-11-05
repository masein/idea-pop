'use client';

import { useContext, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import AssetSlot, { AssetScope } from '@/components/AssetSlot';
import { CharacterArt } from '@/components/characters/CharacterDialogHost';
import Inspired, { MeetCharacter } from '@/components/characters/Inspired';
import { btnPrimary, btnText } from '@/components/challenge/buttons';
import { CHARACTER_NAMES, useFirstMeet } from '@/lib/characters';
import { submitHeroIdea } from '@/lib/api/client';
import IdeaReviewDialog, { type IdeaReviewState } from './IdeaReview';
import { Character3D, Popi } from './StoryBits';
import { discoveryOf, heroExtra, heroShort, type CompanionData, type PartnerLesson } from './discovery';
import type { MissionStory } from './types';
import type { GameUpdate, MissionGame } from './useMissionGame';

type ClueCard = MissionStory['clue_cards'][number];

const MIN_ANSWER = 3;

const answered = (answers: Record<string, string> | undefined) => (answers?.inspired ?? '').trim().length >= MIN_ANSWER;

/** The one answer is in. Earlier versions of this page marked it 'idea' or 'inspired'. */
export function heroJourneyDone(game: MissionGame): boolean {
  const done = game.partnerDone ?? [];
  return answered(game.partnerAnswers) && (done.includes('inspired') || done.includes('idea'));
}

/**
 * After a kid picks a Nature Hero, for every challenge: the hero grows into its video, Conspy
 * says no idea is weird, Popi answers two short questions, and the kid answers the third.
 */
export default function HeroJourney({
  story,
  card,
  index,
  lesson,
  companion,
  game,
  update,
  workKey,
}: {
  story: MissionStory;
  card: ClueCard;
  /** Which of the story's heroes this is. */
  index: number;
  lesson: PartnerLesson | null;
  companion: CompanionData | null;
  game: MissionGame;
  update: GameUpdate;
  /** The challenge this idea belongs to. */
  workKey: string;
}) {
  const t = useTranslations('story');
  const extra = heroExtra(story, index);
  const hero = heroShort(story);
  const finished = heroJourneyDone(game);
  const watched = finished || (game.partnerDone ?? []).includes('video');
  const goal = discoveryOf(story)?.help_goal ?? t('popi_goal_default', { hero });
  const lines = [
    `${extra?.popi?.question ?? t('popi_q_do')} ${extra?.popi?.does ?? card.does}`,
    `${t('popi_q_how')} ${extra?.popi?.how ?? card.trick}`,
    t('popi_q_use', { goal }),
  ];

  return (
    <div data-testid="hero-journey" className="story-rise flex flex-col gap-5">
      <HeroVideo
        card={card}
        index={index}
        videoUrl={extra?.video ?? null}
        showNext={!watched}
        onNext={() => update((g) => ({ partnerDone: [...g.partnerDone, 'video'] }))}
      />
      {watched && (
        <>
          <ConspyCard />
          <Popi text={lines.join('\n')} keepLines />
          <HeroAnswer
            key={`${workKey}-${index}`}
            challengeId={workKey}
            heroIndex={index}
            label={t('hero_answer_label')}
            value={game.partnerAnswers?.inspired ?? ''}
            submitted={finished}
            onChange={(v) => update((g) => ({ partnerAnswers: { ...g.partnerAnswers, inspired: v } }))}
            onSubmit={() =>
              update((g) => ({ partnerDone: g.partnerDone.includes('inspired') ? g.partnerDone : [...g.partnerDone, 'inspired'] }))
            }
            onRevise={() => update((g) => ({ partnerDone: g.partnerDone.filter((x) => x !== 'inspired' && x !== 'idea') }))}
            hint={lesson?.hint ? `${lesson.hint.text} ${lesson.hint.ask}` : companion?.hint ?? null}
            peek={`${card.trick} ${card.does}`}
          />
        </>
      )}
    </div>
  );
}

/** The hero grows large as the opening picture, then its own video (or the spot waiting for it). */
function HeroVideo({
  card,
  index,
  videoUrl,
  showNext,
  onNext,
}: {
  card: ClueCard;
  index: number;
  videoUrl: string | null;
  showNext: boolean;
  onNext: () => void;
}) {
  const t = useTranslations('story');
  const scope = useContext(AssetScope);
  const assetId = `${scope ?? 'MAX'}-HERO-VIDEO-${String(index + 1).padStart(3, '0')}`;
  const [opening, setOpening] = useState(true);
  const [ended, setEnded] = useState(!videoUrl);

  useEffect(() => {
    const timer = setTimeout(() => setOpening(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section data-testid="hero-video" className="flex flex-col items-center gap-3 rounded-[24px] bg-gradient-to-b from-[#EAF5FC] to-white p-5">
      {opening ? (
        <span data-testid="hero-video-opening" className="story-pop block">
          <Character3D src={card.image ?? null} emoji={card.emoji} alt={card.name} size={260} />
        </span>
      ) : (
        <div className="story-rise aspect-video w-full max-w-xl overflow-hidden rounded-[18px] bg-white">
          {videoUrl ? (
            <video
              data-testid="hero-video-player"
              src={videoUrl}
              poster={card.image ?? undefined}
              controls
              playsInline
              onEnded={() => setEnded(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            <AssetSlot id={assetId} />
          )}
        </div>
      )}
      {/* Every hero's video ends on its card's own Trick sentence (one source for both). */}
      {!opening && ended && (
        <p data-testid="hero-video-ending" className="story-pop max-w-xl rounded-[16px] bg-[#1A6FA6] px-5 py-3 text-center font-body text-lg font-bold leading-snug text-white">
          {card.trick}
        </p>
      )}
      {!opening && showNext && (
        <button type="button" data-testid="hero-video-next" onClick={onNext} className={`${btnPrimary} self-end`}>
          {t('hero_next')}
        </button>
      )}
    </section>
  );
}

/** Conspy: dream first; building comes later. */
function ConspyCard() {
  const t = useTranslations('story');
  useFirstMeet('conspy');
  return (
    <section data-testid="conspy-card" className="story-rise flex flex-col gap-3 rounded-[20px] bg-[#F1D8FB] p-5 sm:flex-row sm:items-start">
      <MeetCharacter character="conspy" label={t('meet_character', { name: CHARACTER_NAMES.conspy })} className="self-center sm:self-start">
        <CharacterArt character="conspy" className="h-24 w-24" />
      </MeetCharacter>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="font-body text-sm font-bold text-[#6A2C91]">{CHARACTER_NAMES.conspy}</p>
        <h3 className="font-display text-2xl leading-tight text-ink">{t('conspy_title')}</h3>
        <p className="font-body text-lg font-semibold leading-snug text-ink">
          <Inspired text={t('conspy_message')} />
        </p>
        <details data-testid="conspy-more" className="rounded-[14px] bg-white px-4 py-3">
          <summary className="cursor-pointer font-body text-base font-bold text-ink">{t('conspy_question')}</summary>
          <p className="mt-2 font-body text-base font-medium leading-snug text-ink">{t('conspy_answer')}</p>
        </details>
      </div>
    </section>
  );
}

/** The kid's one answer: a sentence or two, typed. */
function HeroAnswer({
  challengeId,
  heroIndex,
  label,
  value,
  submitted,
  onChange,
  onSubmit,
  onRevise,
  hint,
  peek,
}: {
  challengeId: string;
  heroIndex: number;
  label: string;
  value: string;
  submitted: boolean;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onRevise: () => void;
  /** The hero's "Need a hint?", shown only when asked; otherwise a peek at its card. */
  hint: string | null;
  peek: string;
}) {
  const t = useTranslations('story');
  const locale = useLocale();
  const [hintOpen, setHintOpen] = useState(false);
  const [review, setReview] = useState<IdeaReviewState | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const ready = value.trim().length >= MIN_ANSWER;

  /** Saves the idea, as it stands, on the server, and shows Conspy's review. Progress never waits for this. */
  async function sendForReview() {
    setReview({ kind: 'saving' });
    setReviewOpen(true);
    try {
      const idea = await submitHeroIdea(challengeId, {
        text: value.trim(),
        hero_index: heroIndex,
        lang: locale,
      });
      setReview({ kind: 'saved', idea });
    } catch {
      setReview({ kind: 'failed' });
    }
  }

  const dialog = review && reviewOpen && (
    <IdeaReviewDialog state={review} onRetry={() => void sendForReview()} onClose={() => setReviewOpen(false)} />
  );

  if (submitted) {
    return (
      <section data-testid="hero-answer-saved" className="flex flex-col gap-2 rounded-xl border border-[#BFE6C8] bg-[#F3FBF5] px-4 py-3">
        <p dir="auto" className="font-body text-base font-semibold text-[#1d7a3a]">
          {value} <span aria-hidden="true">✓</span>
        </p>
        <button type="button" data-testid="hero-answer-revise" onClick={onRevise} className={`${btnText} self-start !px-0`}>
          {t('partner_revise')}
        </button>
        {review && (
          <button type="button" data-testid="idea-review-open" onClick={() => setReviewOpen(true)} className={`${btnText} self-start !px-0`}>
            {t('review_open')}
          </button>
        )}
        {dialog}
      </section>
    );
  }

  return (
    <form
      data-testid="hero-answer"
      className="flex flex-col gap-2 rounded-xl border-2 border-[#1A6FA6] bg-white p-4 shadow-[0_4px_14px_rgba(45,156,219,0.18)]"
      onSubmit={(e) => {
        e.preventDefault();
        if (!ready) return;
        onSubmit();
        void sendForReview();
      }}
    >
      <label htmlFor="hero-answer-input" className="font-body text-base font-bold text-ink">
        {label}
      </label>
      <textarea
        autoComplete="off"
        id="hero-answer-input"
        data-testid="hero-answer-input"
        rows={2}
        maxLength={240}
        dir="auto"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('partner_placeholder')}
        className="min-w-0 resize-none rounded-lg border border-[#8FA3B8] px-3 py-2 font-body text-base text-ink placeholder:text-ink/40 focus:border-challenge focus:outline-none"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" data-testid="hero-answer-submit" disabled={!ready} className={btnPrimary}>
          {t('hero_review')}
        </button>
        <button
          type="button"
          data-testid={hint ? 'partner-hint' : 'partner-peek'}
          onClick={() => setHintOpen((v) => !v)}
          className={btnText}
        >
          {hint ? t('subst_hint_btn') : t('partner_peek')}
        </button>
      </div>
      {hintOpen && (
        <p data-testid={hint ? 'partner-hint-text' : 'partner-peek-text'} className="rounded-xl bg-[#FFF7E0] px-3 py-2 font-body text-base text-[#5a4300]">
          <AssetSlot id="CHALLENGE-UI-003" variant="dot" />
          <Inspired text={hint ?? peek} />
        </p>
      )}
    </form>
  );
}
