'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { CharacterArt } from '@/components/characters/CharacterDialogHost';
import Inspired, { MeetCharacter } from '@/components/characters/Inspired';
import { btnPrimary, btnText } from '@/components/challenge/buttons';
import { fetchIdeaReferences, type IdeaReference, type SubmittedIdea } from '@/lib/api/client';
import { CHARACTER_NAMES } from '@/lib/characters';

/** Null while saving; `failed` when the idea could not reach the server. */
export type IdeaReviewState = { kind: 'saving' } | { kind: 'failed' } | { kind: 'saved'; idea: SubmittedIdea };

/**
 * Conspy's review, for every challenge. The idea is already saved when this opens. It never
 * grades, rejects or rewrites: related ideas hear specific feedback, and anything else hears
 * that it is saved. With no review or search available it says so and shows nothing made up.
 */
export default function IdeaReviewDialog({
  state,
  onRetry,
  onClose,
}: {
  state: IdeaReviewState;
  onRetry: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('story');
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus({ preventScroll: true }), []);

  // On the page's body: the answer sits inside animated sections, which would trap "fixed".
  return createPortal(
    <div
      data-testid="idea-review"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('review_title')}
        className="story-pop flex max-h-[90vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-[1.5rem] bg-white p-6 shadow-xl"
      >
        <div className="flex items-center gap-3">
          <MeetCharacter character="conspy" label={t('meet_character', { name: CHARACTER_NAMES.conspy })}>
            <CharacterArt character="conspy" className="h-20 w-20" />
          </MeetCharacter>
          <div className="min-w-0">
            <p className="font-body text-sm font-bold text-[#6A2C91]">{CHARACTER_NAMES.conspy}</p>
            <h2 className="font-display text-2xl leading-tight text-ink">{t('review_title')}</h2>
          </div>
        </div>

        {state.kind === 'saving' && (
          <p role="status" className="font-body text-base font-semibold text-ink">{t('review_saving')}</p>
        )}
        {state.kind === 'failed' && (
          <div className="flex flex-col gap-2">
            <p role="status" data-testid="idea-save-failed" className="rounded-xl bg-[#FFF7E0] px-3 py-2 font-body text-base text-[#5a4300]">
              {t('review_save_failed')}
            </p>
            <button type="button" data-testid="idea-save-retry" onClick={onRetry} className={`${btnText} self-start !px-0`}>
              {t('review_try_again')}
            </button>
          </div>
        )}
        {state.kind === 'saved' && <SavedIdea idea={state.idea} />}

        <button ref={closeRef} type="button" data-testid="idea-review-close" onClick={onClose} className={`${btnPrimary} self-center`}>
          {t('review_close')}
        </button>
      </div>
    </div>,
    document.body,
  );
}

function SavedIdea({ idea }: { idea: SubmittedIdea }) {
  const t = useTranslations('story');
  const related = idea.outcome === 'related';
  // Search belongs to related ideas, and to ideas no review has looked at yet.
  const canSearch = related || !idea.review_available;
  return (
    <div className="flex flex-col gap-3">
      {related && idea.feedback && (
        <p dir="auto" data-testid="idea-review-feedback" className="font-body text-lg font-semibold leading-snug text-ink">
          <Inspired text={idea.feedback} />
        </p>
      )}
      {related && idea.experiment && <Experiment materials={idea.experiment.materials} steps={idea.experiment.steps} />}
      {idea.outcome === 'not_testable_yet' && (
        <p data-testid="idea-review-later" className="font-body text-lg font-semibold leading-snug text-ink">{t('review_saved_develop')}</p>
      )}
      {(idea.outcome === 'unrelated' || !idea.review_available) && (
        <p data-testid="idea-review-saved" className="font-body text-lg font-semibold leading-snug text-ink">{t('review_saved_later')}</p>
      )}
      {!idea.review_available && (
        <p data-testid="idea-review-unavailable" className="rounded-xl bg-[#EAF5FC] px-3 py-2 font-body text-sm font-semibold text-[#135A85]">
          {t('review_unavailable')}
        </p>
      )}
      {canSearch && <RealWorldSearch ideaId={idea.idea_id} />}
    </div>
  );
}

function Experiment({ materials, steps }: { materials: string[]; steps: string[] }) {
  const t = useTranslations('story');
  return (
    <section data-testid="idea-review-experiment" className="flex flex-col gap-1 rounded-xl bg-[#F3FBF5] px-4 py-3">
      <h3 className="font-body text-base font-extrabold text-[#1E7A44]">{t('review_try_title')}</h3>
      <p dir="auto" className="font-body text-sm font-semibold text-ink">{materials.join(' · ')}</p>
      <ol className="ms-5 list-decimal font-body text-sm text-ink">
        {steps.map((s) => (
          <li key={s} dir="auto">{s}</li>
        ))}
      </ol>
    </section>
  );
}

/** "Has anyone built something like your idea?": only ever shows sources the server verified. */
function RealWorldSearch({ ideaId }: { ideaId: string }) {
  const t = useTranslations('story');
  const [state, setState] = useState<'idle' | 'loading' | 'unavailable' | 'error' | 'done'>('idle');
  const [references, setReferences] = useState<IdeaReference[]>([]);

  async function search() {
    setState('loading');
    try {
      const res = await fetchIdeaReferences(ideaId);
      setReferences(res.references);
      setState(res.available ? 'done' : 'unavailable');
    } catch {
      setState('error');
    }
  }

  return (
    <section data-testid="idea-search" className="flex flex-col gap-2 rounded-xl border border-[#CDE7F7] px-4 py-3">
      <button type="button" data-testid="idea-search-button" onClick={() => void search()} disabled={state === 'loading'} className={`${btnText} self-start !px-0 text-start`}>
        {t('review_search_question')}
      </button>
      {state === 'loading' && <p role="status" className="font-body text-sm text-ink">{t('review_search_loading')}</p>}
      {state === 'unavailable' && <p role="status" data-testid="idea-search-unavailable" className="font-body text-sm font-semibold text-ink">{t('review_search_unavailable')}</p>}
      {state === 'error' && <p role="status" className="font-body text-sm font-semibold text-ink">{t('review_search_error')}</p>}
      {state === 'done' && references.length === 0 && <p role="status" className="font-body text-sm font-semibold text-ink">{t('review_search_none')}</p>}
      {state === 'done' && references.length > 0 && (
        <ul className="flex flex-col gap-2">
          {references.map((r) => (
            <li key={r.url} className="flex flex-col gap-1 font-body text-sm text-ink">
              {r.image_url && (
                // eslint-disable-next-line @next/next/no-img-element -- from a verified source
                <img src={r.image_url} alt="" className="max-h-32 w-full rounded-lg object-cover" />
              )}
              <a href={r.url} target="_blank" rel="noopener noreferrer" dir="auto" className="font-bold text-[#135A85] underline">{r.title}</a>
              <span dir="auto" className="text-xs font-semibold text-[#4A5560]">{r.source}</span>
              <span dir="auto">{r.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
