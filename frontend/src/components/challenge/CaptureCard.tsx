'use client';

import { useState } from 'react';

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
}

export default function CaptureCard({
  showExtendedFields = false,
  photoPrompt,
  onSubmit,
  submitting = false,
  submitLabel,
  ageMode,
}: CaptureCardProps) {
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
              Remove photo
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
        <label className="font-body text-sm text-ink/60">What did you make?</label>
        <input
          data-testid="field-title"
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setWhatIMade(e.target.value);
          }}
          placeholder="Describe your creation…"
          className={inputClass}
        />
      </div>

      {/* What did you use? */}
      <div className="flex flex-col gap-1">
        <label className="font-body text-sm text-ink/60">What did you use?</label>
        <input
          data-testid="field-used"
          type="text"
          value={whatIUsed}
          onChange={(e) => setWhatIUsed(e.target.value)}
          placeholder="Materials, tools, apps…"
          className={inputClass}
        />
      </div>

      {/* Extended fields */}
      {showExtendedFields && (
        <>
          <div className="flex flex-col gap-1">
            <label className="font-body text-sm text-ink/60">What was hard?</label>
            <input
              data-testid="field-hard"
              type="text"
              value={whatWasHard}
              onChange={(e) => setWhatWasHard(e.target.value)}
              placeholder="The trickiest part was…"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-body text-sm text-ink/60">What would you improve?</label>
            <input
              data-testid="field-improve"
              type="text"
              value={whatIdImprove}
              onChange={(e) => setWhatIdImprove(e.target.value)}
              placeholder="Next time I'd…"
              className={inputClass}
            />
          </div>
        </>
      )}

      {/* AI hint — always shown (can scope to young only if needed) */}
      <div className="relative">
        <div
          data-testid="ai-hint"
          onClick={() => setShowPopi((prev) => !prev)}
          className="bg-tint-lavender rounded-card p-3 flex items-center gap-2 cursor-pointer font-body text-sm text-ink/60"
        >
          <span>🤖</span>
          <span>Stuck? Brainstorm with Popi</span>
        </div>
        {showPopi && (
          <div className="mt-1 bg-white border border-ink/10 rounded-card px-3 py-2 font-body text-sm text-ink/60 shadow-sm">
            Coming soon — Popi is being trained!
          </div>
        )}
      </div>

      {/* Submit */}
      <button
        data-testid="capture-submit"
        type="button"
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
        className="bg-challenge text-white font-display text-lg px-6 py-3 rounded-card w-full disabled:opacity-40"
      >
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </div>
  );
}
