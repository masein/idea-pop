'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import AssetSlot from '@/components/AssetSlot';
import { fetchProjectPhoto } from '@/lib/api/client';
import type { MissionStory } from './types';
import type { JourneyProject, MissionJourney } from './useMissionJourney';

/**
 * A kid's own saved picture (photos are private, so it is read through their account). With no
 * picture, or one that can't load, the labeled empty spot shows instead (or nothing, without an
 * Asset ID). Never blocks anything.
 */
export function SavedPhoto({
  project,
  blobUrl = null,
  alt,
  emptyAsset,
  fit = 'aspect-[4/3]',
}: {
  project: JourneyProject | null;
  /** A picture chosen on this visit, already on the device. */
  blobUrl?: string | null;
  alt: string;
  emptyAsset?: string;
  fit?: string;
}) {
  const t = useTranslations('story');
  const projectId = project?.hasPhoto ? project.id : null;
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!projectId || blobUrl) return;
    let alive = true;
    let made: string | null = null;
    setFailed(false);
    fetchProjectPhoto(projectId)
      .then((blob) => {
        if (!alive) return;
        made = URL.createObjectURL(blob);
        setLoaded({ id: projectId, url: made });
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [projectId, blobUrl]);

  const src = blobUrl ?? (loaded && loaded.id === projectId ? loaded.url : null);
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- the kid's own picture, a blob URL
      <img src={src} alt={alt} data-testid="journey-image" className={`${fit} w-full rounded-xl bg-white object-contain`} />
    );
  }
  if (projectId && !failed) return <span className={`${fit} block w-full animate-pulse rounded-xl bg-[#F4F8FC]`} />;
  if (!emptyAsset) return null;
  return (
    <span data-testid="journey-image-empty" className="flex w-full flex-col gap-1">
      <span className={`${fit} block w-full`}>
        <AssetSlot id={emptyAsset} />
      </span>
      <span className="text-center font-body text-sm font-semibold text-[#4A5560]">{t('journey_no_image')}</span>
    </span>
  );
}

/** The Nature Hero the kid chose, and its trick. */
export function HeroReminder({ story, partner, heroName }: { story: MissionStory; partner: number | null | undefined; heroName: string | null | undefined }) {
  const t = useTranslations('story');
  const cards = story.clue_cards;
  const card =
    (partner !== null && partner !== undefined ? cards[partner] : null) ??
    (heroName ? cards.find((c) => c.name === heroName) : null) ??
    null;
  if (!card && !heroName) return null;
  return (
    <div data-testid="journey-hero" className="flex items-center gap-3 rounded-[18px] bg-[#EAF5FC] px-4 py-3">
      {card?.image && (
        // eslint-disable-next-line @next/next/no-img-element -- a small transparent cut-out
        <img src={card.image} alt="" aria-hidden="true" className="h-16 w-16 shrink-0 object-contain" />
      )}
      <div className="min-w-0 font-body text-base text-ink">
        <p className="font-bold text-[#135A85]">{t('journey_hero', { name: card?.name ?? heroName ?? '' })}</p>
        {card?.trick && <p dir="auto"><b>{t('its_trick')}:</b> {card.trick}</p>}
      </div>
    </div>
  );
}

/** A name and words, without saying the same thing twice. */
function Words({ name, text }: { name: string | null; text: string }) {
  const words = text.trim();
  return (
    <>
      {name && <p dir="auto" className="font-body text-lg font-extrabold leading-snug text-ink">{name}</p>}
      {words && words !== name && <p dir="auto" className="font-body text-base leading-snug text-ink">{words}</p>}
    </>
  );
}

function Stage({ title, testId, children }: { title: string; testId: string; children: ReactNode }) {
  return (
    <li data-testid={testId} className="flex flex-col gap-2 border-s-4 border-[#9CC9E6] ps-4">
      <h3 className="font-display text-xl text-challenge">{title}</h3>
      {children}
    </li>
  );
}

const EMPTY_HISTORY = 'CHALLENGE-UI-EMPTY-HISTORY-001';
const EMPTY_JOURNEY_ART = 'CHALLENGE-UI-EMPTY-JOURNEY-001';

/** Page 8: the kid's ideas and creations so far. Original idea, then changes, then improved. */
export function IdeaHistory({
  journey,
  improvedTitle,
  improvedNote,
  blobUrls,
}: {
  journey: MissionJourney;
  improvedTitle: string;
  /** An improved idea written before versions existed. */
  improvedNote: string | null;
  blobUrls: { model: string | null; sketch: string | null };
}) {
  const t = useTranslations('story');
  const showNote = improvedNote && journey.versions.length === 0;
  return (
    <section data-testid="idea-history" className="flex flex-col gap-4 rounded-[20px] bg-white p-5 shadow-sm">
      <h2 className="font-display text-2xl text-challenge">{t('journey_history_title')}</h2>
      <ol className="flex flex-col gap-5">
        <Stage title={t('journey_original')} testId="history-original">
          {journey.idea && <Words name={journey.idea.name} text={journey.idea.text} />}
          <div className="grid grid-cols-2 gap-3">
            <figure className="m-0 flex flex-col gap-1">
              <SavedPhoto project={journey.sketch} blobUrl={blobUrls.sketch} alt={t('journey_sketch')} emptyAsset={EMPTY_HISTORY} />
              <figcaption className="text-center font-body text-sm font-semibold text-ink">{t('journey_sketch')}</figcaption>
            </figure>
            <figure className="m-0 flex flex-col gap-1">
              <SavedPhoto project={journey.model} blobUrl={blobUrls.model} alt={t('journey_first_model')} emptyAsset={EMPTY_HISTORY} />
              <figcaption className="text-center font-body text-sm font-semibold text-ink">{t('journey_first_model')}</figcaption>
            </figure>
          </div>
        </Stage>
        {journey.change && (
          <Stage title={t('journey_changes')} testId="history-changes">
            <p dir="auto" className="font-body text-base font-semibold text-ink">{journey.change}</p>
          </Stage>
        )}
        {(journey.versions.length > 0 || showNote) && (
          <Stage title={improvedTitle} testId="history-improved">
            {showNote && <p dir="auto" className="whitespace-pre-line font-body text-base text-ink">{improvedNote}</p>}
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {journey.versions.map((v, i) => (
                <li key={v.id} data-testid="history-version" className="flex flex-col gap-1 rounded-xl bg-[#F3FBF5] p-3">
                  <p className="font-body text-sm font-extrabold text-[#1E7A44]">{t('journey_version', { n: i + 1 })}</p>
                  <SavedPhoto project={v} alt={v.title} />
                  <Words name={v.title} text={v.text} />
                </li>
              ))}
            </ul>
          </Stage>
        )}
      </ol>
    </section>
  );
}

/** Page 9: the kid's whole journey in one picture, with nothing to type. */
export function JourneySummary({
  journey,
  story,
  partner,
  improvedNote,
}: {
  journey: MissionJourney;
  story: MissionStory;
  partner: number | null | undefined;
  improvedNote: string | null;
}) {
  const t = useTranslations('story');
  const newest = [...journey.versions].reverse().find((v) => v.hasPhoto) ?? null;
  const tiles = [
    { label: t('journey_sketch'), project: journey.sketch },
    { label: t('journey_first_model'), project: journey.model },
    { label: t('journey_improved_model'), project: newest },
  ];
  return (
    <section data-testid="journey-summary" className="flex flex-col gap-4 rounded-card bg-white p-5">
      <h2 className="font-display text-2xl text-challenge">{t('journey_summary_title')}</h2>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {tiles.map((tile) => (
          <figure key={tile.label} className="m-0 flex flex-col gap-1">
            <SavedPhoto project={tile.project} alt={tile.label} emptyAsset={EMPTY_JOURNEY_ART} />
            <figcaption className="text-center font-body text-sm font-semibold text-ink">{tile.label}</figcaption>
          </figure>
        ))}
      </div>
      {journey.idea && (
        <div data-testid="journey-idea" className="flex flex-col gap-1">
          <p className="font-body text-sm font-extrabold uppercase tracking-wide text-[#4A5560]">{t('journey_original')}</p>
          <Words name={journey.idea.name} text={journey.idea.text} />
        </div>
      )}
      {(journey.versions.length > 0 || improvedNote) && (
        <div data-testid="journey-updated" className="flex flex-col gap-2">
          <p className="font-body text-sm font-extrabold uppercase tracking-wide text-[#4A5560]">{t('journey_updated')}</p>
          {journey.versions.length === 0 && <p dir="auto" className="whitespace-pre-line font-body text-base text-ink">{improvedNote}</p>}
          {journey.versions.map((v) => (
            <div key={v.id} className="flex flex-col gap-0.5">
              <Words name={v.title} text={v.text} />
            </div>
          ))}
        </div>
      )}
      <HeroReminder story={story} partner={partner} heroName={journey.idea?.heroName} />
    </section>
  );
}
