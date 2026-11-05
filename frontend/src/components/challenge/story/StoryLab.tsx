'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import MissionHints from '../MissionHints';
import ImageUploadArea from '../ImageUploadArea';
import PhotoUploadError from '../PhotoUploadError';
import { Popi, StepNav, optionClass, pillCtaClass } from './StoryBits';
import type { ChallengeDetail, MissionStory } from './types';
import type { MissionGame, GameUpdate } from './useMissionGame';
import { btnSecondary, btnText } from '@/components/challenge/buttons';
import { discoveryOf } from './discovery';
import AssetSlot from '@/components/AssetSlot';

interface Props {
  challenge: ChallengeDetail;
  story: MissionStory;
  game: MissionGame;
  update: GameUpdate;
  onNext: () => void;
  onBack: () => void;
  /** Results submitted ("Finish the lab"); without it, finishing goes straight on. */
  onFinished?: () => void;
  /** Max's challenge: this page is the Experiment (its own step, before Skills). */
  experiment?: boolean;
  /** Saves a picture of the model; resolves false when it couldn't be saved. */
  onPhoto: (photo: File) => Promise<boolean>;
  /** No photo? The kid describes the model in words instead (resolves true when saved). */
  onDescribe?: (text: string) => Promise<boolean>;
}

/** "What did you build?": a picture of the model, or words instead. Optional, private, and saved
 *  as soon as it is chosen; a failed upload keeps the picture ready for Try Again. */
export function BuildPhoto({
  description,
  onPhoto,
  onDescribe,
  onBusy,
}: {
  description: string;
  onPhoto: (photo: File) => Promise<boolean>;
  onDescribe?: (text: string) => Promise<boolean>;
  onBusy: (busy: boolean) => void;
}) {
  const t = useTranslations('story');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<'none' | 'saving' | 'saved' | 'failed'>('none');
  const [describing, setDescribing] = useState(false);
  const [words, setWords] = useState('');
  const [wordsState, setWordsState] = useState<'none' | 'saving' | 'saved' | 'failed'>('none');

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  async function send(f: File) {
    setState('saving');
    onBusy(true);
    const ok = await onPhoto(f);
    setState(ok ? 'saved' : 'failed');
    onBusy(false);
  }

  return (
    <ImageUploadArea
      testId="lab-photo"
      heading={t('lab_build_heading')}
      description={description}
      prompt={t('lab_build_prompt')}
      previewUrl={preview}
      busy={state === 'saving'}
      onSelect={(f) => {
        setPhoto(f);
        setPreview(URL.createObjectURL(f));
        void send(f);
      }}
    >
      {preview && state !== 'failed' && (
        <p aria-live="polite" data-testid="lab-photo-status" className="text-center font-body text-base font-semibold text-[#1E7A44]">
          {state === 'saving' ? t('lab_photo_saving') : state === 'saved' ? `✓ ${t('lab_photo_saved')}` : ''}
        </p>
      )}
      {state === 'failed' && photo && <PhotoUploadError onRetry={() => void send(photo)} />}
      {onDescribe && !preview && wordsState !== 'saved' && (
        describing ? (
          <form
            data-testid="lab-describe"
            className="flex w-full flex-col gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (words.trim().length < 3) return;
              setWordsState('saving');
              setWordsState((await onDescribe(words.trim())) ? 'saved' : 'failed');
            }}
          >
            <label htmlFor="lab-describe-input" className="font-body text-base font-bold text-ink">
              {t('lab_describe_label')}
            </label>
            <textarea
              id="lab-describe-input"
              rows={3}
              maxLength={600}
              dir="auto"
              value={words}
              onChange={(e) => setWords(e.target.value)}
              placeholder={t('lab_describe_placeholder')}
              className="w-full resize-none rounded-lg border border-[#8FA3B8] bg-white px-3 py-2 font-body text-base text-ink focus:border-challenge focus:outline-none"
            />
            <button type="submit" data-testid="lab-describe-save" disabled={words.trim().length < 3 || wordsState === 'saving'} className={`${btnSecondary} self-start`}>
              {wordsState === 'saving' ? t('lab_photo_saving') : t('lab_describe_save')}
            </button>
            {wordsState === 'failed' && <p role="alert" className="font-body text-base font-semibold text-[#9A3328]">{t('lab_describe_failed')}</p>}
          </form>
        ) : (
          <button type="button" data-testid="lab-describe-open" onClick={() => setDescribing(true)} className={`${btnText} self-start !px-0`}>
            {t('lab_no_photo')}
          </button>
        )
      )}
      {wordsState === 'saved' && (
        <p data-testid="lab-describe-saved" aria-live="polite" className="font-body text-base font-semibold text-[#1E7A44]">
          ✓ {t('lab_describe_saved')}
        </p>
      )}
      <p className="font-body text-sm text-[#4A5560]">{t('photo_private_note')}</p>
      <p className="font-body text-sm font-semibold text-[#4A5560]">{t('photo_bonus_note')}</p>
    </ImageUploadArea>
  );
}

/** Winner index for a set of lab numbers, or null until every row is filled. */
export function labWinner(values: (number | null)[], higherIsBetter: boolean): number | null {
  if (values.some((v) => v === null)) return null;
  const nums = values as number[];
  const best = higherIsBetter ? Math.max(...nums) : Math.min(...nums);
  if (higherIsBetter && best <= 0) return null;
  return nums.indexOf(best);
}

/** Step 5 as a story: predict which option wins, run the experiment, record
 *  one number per option. The best row gets a crown and Popi says whether the
 *  prediction was right — either way is a win ("surprises teach"). */
export default function StoryLab({ challenge, story, game, update, onNext, onBack, onFinished, experiment = false, onPhoto, onDescribe }: Props) {
  const [photoBusy, setPhotoBusy] = useState(false);
  const refs = experiment ? discoveryOf(story)?.experiment ?? null : null;
  const t = useTranslations('story');
  const lab = story.lab;
  const values = lab.options.map((_, i) => {
    const raw = game.lab[i];
    return raw === undefined || raw === '' ? null : Number(raw);
  });
  const winner = labWinner(values, lab.higher_is_better);
  const ready = winner !== null && game.labPick !== null;

  return (
    <div data-testid="story-lab" className="flex flex-col gap-5 py-4">
      {experiment && <h1 className="font-display text-3xl text-challenge">{t('experiment_heading')}</h1>}
      <Popi text={story.guide.skill} />

      <div className="flex flex-col gap-3 rounded-card bg-white p-5">
        <p className="font-display text-2xl text-challenge">{lab.title}</p>
        {challenge.skill_instructions && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 rounded-md bg-tint-lime px-2 py-1 font-body text-[11px] font-bold uppercase tracking-wide text-explore">
              {t('do_it')}
            </span>
            <p className="whitespace-pre-line font-body text-sm text-ink">{challenge.skill_instructions}</p>
          </div>
        )}

        {refs && (
          // Optional starting shapes: references to build from, never a model to copy or a result.
          <div data-testid="experiment-refs" className="flex flex-col gap-2 rounded-2xl bg-tint-blue p-3">
            <p className="font-body text-base font-semibold text-ink">{refs.refs_caption}</p>
            <div className="grid grid-cols-3 gap-2">
              {refs.refs.map((r) => (
                <figure key={r.label} className="m-0 flex flex-col items-center gap-1">
                  {r.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- a small reference picture
                    <img src={r.image} alt={r.label} className="aspect-[4/3] w-full rounded-xl object-cover" />
                  ) : (
                    <span data-testid="experiment-ref-placeholder" className="block aspect-[4/3] w-full">
                      <AssetSlot id={r.asset} />
                    </span>
                  )}
                  <figcaption className="text-center font-body text-sm font-semibold text-ink">{r.label}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        )}

        {experiment && discoveryOf(story)?.predict_intro && (
          <p data-testid="predict-intro" className="rounded-xl bg-[#FFF7E0] px-3 py-2 font-body text-base text-[#5a4300]">
            <AssetSlot id="CHALLENGE-UI-003" variant="dot" />{discoveryOf(story)?.predict_intro}
          </p>
        )}
        <p className="font-body text-sm font-bold text-ink">1. {t('my_prediction')} <span className="font-medium">{lab.predict}</span></p>
        <div className="flex flex-wrap gap-2">
          {lab.options.map((o, i) => (
            <button
              key={o}
              type="button"
              data-testid={`lab-pick-${i}`}
              aria-pressed={game.labPick === i}
              onClick={() => update({ labPick: i })}
              className={`flex-1 basis-36 ${optionClass(game.labPick === i ? 'picked' : 'idle')}`}
            >
              {o}
            </button>
          ))}
        </div>

        <p className="font-body text-sm font-bold text-ink">2. {t('my_results')}</p>
        <table className="w-full border-separate border-spacing-y-2 font-body text-sm tabular-nums">
          <tbody>
            {lab.options.map((o, i) => (
              <tr key={o} className={winner === i ? 'story-pop' : ''}>
                <td className={`rounded-s-xl px-3 py-2.5 font-semibold ${winner === i ? 'bg-[#fff5d1]' : 'bg-tint-blue'}`}>
                  <span className="inline-block w-6" aria-hidden="true">{winner === i ? '👑' : ''}</span>
                  {o}
                </td>
                <td className={`rounded-e-xl px-3 py-2.5 text-end ${winner === i ? 'bg-[#fff5d1]' : 'bg-tint-blue'}`}>
                  <label className="inline-flex items-center gap-2">
                    <input
                      autoComplete="off"
                      inputMode="numeric"
                      data-testid={`lab-value-${i}`}
                      value={game.lab[i] ?? ''}
                      placeholder="0"
                      aria-label={t('lab_value_aria', { option: o, measure: lab.measure })}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 4);
                        update((g) => ({ lab: { ...g.lab, [i]: v } }));
                      }}
                      className="w-16 rounded-lg border-2 border-ink/10 px-2 py-1 text-center font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge"
                    />
                    <span className="text-xs text-ink/60">{lab.measure}</span>
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="font-body text-sm text-ink/60" aria-live="polite">
          {winner === null ? t('lab_hint') : game.labPick === winner ? t('lab_right') : t('lab_surprise')}
        </p>
      </div>

      <MissionHints hints={challenge.skill_hints ?? []} />

      <BuildPhoto
        description={discoveryOf(story)?.build_photo_desc ?? t('lab_build_desc')}
        onPhoto={onPhoto}
        onDescribe={onDescribe}
        onBusy={setPhotoBusy}
      />

      <StepNav onBack={onBack} backLabel={t('back')}>
        <button type="button" data-testid="lab-skip" onClick={onNext} className={btnText}>
          {t('lab_skip')}
        </button>
        <button
          type="button"
          data-testid="lab-done"
          disabled={!ready || photoBusy}
          onClick={() => {
            update({ labDone: true });
            (onFinished ?? onNext)();
          }}
          className={pillCtaClass}
        >
          {experiment ? t('experiment_finished') : t('lab_next')}
        </button>
      </StepNav>
    </div>
  );
}
