'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import MissionHelper from './MissionHelper';

// Dark-launch flag for the scoped AI helper (server enforces the real gates).
const HELPER_ON = process.env.NEXT_PUBLIC_MISSION_HELPER === 'true';

export interface CaptureData {
  title: string;
  what_i_made: string;
  what_i_used: string;
  what_was_hard?: string;
  what_id_improve?: string;
}

interface CaptureCardProps {
  showExtendedFields?: boolean;
  photoPrompt: string;
  onSubmit: (data: CaptureData) => void;
  submitting?: boolean;
  submitLabel: string;
  ageMode: 'young' | 'older';
  /** Step already renders its own MissionHelper: the CTA opens THAT one. */
  onBrainstorm?: () => void;
  /** No helper on this step yet: the CTA reveals an embedded one. */
  helper?: { challengeId: string; step: number };
}

export default function CaptureCard({
  showExtendedFields = false,
  photoPrompt,
  onSubmit,
  submitting = false,
  submitLabel,
  ageMode,
  onBrainstorm,
  helper,
}: CaptureCardProps) {
  const t = useTranslations('mission');
  const [photoSelected, setPhotoSelected] = useState(false);
  const [title, setTitle] = useState('');
  const [whatIMade, setWhatIMade] = useState('');
  const [whatIUsed, setWhatIUsed] = useState('');
  const [whatWasHard, setWhatWasHard] = useState('');
  const [whatIdImprove, setWhatIdImprove] = useState('');
  const [showPopi, setShowPopi] = useState(false);

  const canSubmit = title.trim().length > 0 && whatIMade.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit || submitting) return;
    onSubmit({
      title: title.trim(),
      what_i_made: whatIMade.trim(),
      what_i_used: whatIUsed.trim(),
      ...(showExtendedFields && {
        what_was_hard: whatWasHard.trim(),
        what_id_improve: whatIdImprove.trim(),
      }),
    });
  }

  const inputClass =
    'w-full rounded-card border border-ink/20 px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-challenge';

  return (
    <div data-testid="capture-card" className="flex flex-col gap-4">
      {/* Photo upload area */}
      <div
        data-testid="photo-area"
        onClick={() => setPhotoSelected(true)}
        className="bg-tint-blue rounded-card border-2 border-dashed border-challenge/30 flex flex-col items-center justify-center py-10 cursor-pointer"
      >
        {photoSelected ? (
          <div className="flex flex-col items-center gap-3 w-full px-6">
            <div className="w-full h-32 bg-ink/10 rounded-card" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPhotoSelected(false);
              }}
              className="font-body text-sm text-ink/60 underline"
            >
              {t('remove_photo')}
            </button>
          </div>
        ) : (
          <>
            <span className="text-4xl">📷</span>
            <p className="font-body text-sm text-ink/50 text-center mt-2 px-4">
              {photoPrompt}
            </p>
          </>
        )}
      </div>

      {/* Title / What did you make? */}
      <div className="flex flex-col gap-1">
        <label className="font-body text-sm text-ink/60">{t('capture_title_label')}</label>
        <input
          data-testid="field-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setWhatIMade(e.target.value);
          }}
          placeholder={t('capture_title_placeholder')}
          className={inputClass}
        />
      </div>

      {/* What did you use? */}
      <div className="flex flex-col gap-1">
        <label className="font-body text-sm text-ink/60">{t('capture_used_label')}</label>
        <input
          data-testid="field-used"
          type="text"
          value={whatIUsed}
          onChange={(e) => setWhatIUsed(e.target.value)}
          placeholder={t('capture_used_placeholder')}
          className={inputClass}
        />
      </div>

      {/* Extended fields */}
      {showExtendedFields && (
        <>
          <div className="flex flex-col gap-1">
            <label className="font-body text-sm text-ink/60">{t('capture_hard_label')}</label>
            <input
              data-testid="field-hard"
              type="text"
              value={whatWasHard}
              onChange={(e) => setWhatWasHard(e.target.value)}
              placeholder={t('capture_hard_placeholder')}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-body text-sm text-ink/60">{t('capture_improve_label')}</label>
            <input
              data-testid="field-improve"
              type="text"
              value={whatIdImprove}
              onChange={(e) => setWhatIdImprove(e.target.value)}
              placeholder={t('capture_improve_placeholder')}
              className={inputClass}
            />
          </div>
        </>
      )}

      {/* Brainstorm with Popi — opens the step's real helper when the
          dark-launch flag is on; otherwise keeps the coming-soon note. */}
      <div className="relative">
        <button
          type="button"
          data-testid="ai-hint"
          onClick={() => {
            if (HELPER_ON && onBrainstorm) onBrainstorm();
            else setShowPopi((prev) => !prev);
          }}
          className="flex w-full items-center gap-2 rounded-card bg-tint-lavender p-3 font-body text-sm text-ink/60 transition-colors hover:bg-tint-lavender-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ink/40"
        >
          <span aria-hidden="true">🐧</span>
          <span>{t('brainstorm_popi')}</span>
        </button>
        {showPopi &&
          (HELPER_ON && helper ? (
            <div className="mt-1">
              <MissionHelper challengeId={helper.challengeId} step={helper.step} defaultOpen />
            </div>
          ) : (
            !HELPER_ON && (
              <div className="mt-1 rounded-card border border-ink/10 bg-white px-3 py-2 font-body text-sm text-ink/60 shadow-sm">
                {t('popi_coming_soon')}
              </div>
            )
          ))}
      </div>

      {/* Submit */}
      <button
        data-testid="capture-submit"
        type="button"
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
        className="bg-challenge text-white font-display text-lg px-6 py-3 rounded-card w-full disabled:opacity-40"
      >
        {submitting ? t('saving') : submitLabel}
      </button>
    </div>
  );
}
