'use client';

import { useState } from 'react';
import Link from 'next/link';
import AudiencePicker from './AudiencePicker';
import { submitIdea } from '@/lib/api/client';

type ChallengeDetail = import('@/lib/api/schema').components['schemas']['ChallengeDetail'];

interface StepCelebrateProps {
  challenge: ChallengeDetail;
  ageMode: 'young' | 'older';
  completionXp: number;
  sketchProjectId: string | null;
  wallAlreadySubmitted: boolean;
  onWallSubmitted: () => void;
  onRestart: () => void;
}

const XP_BREAKDOWN = [
  { label: 'Watched clue', xp: 5 },
  { label: 'Learned skill', xp: 10 },
  { label: 'Built & tested', xp: 20 },
  { label: 'Creative Cycle bonus', xp: 15 },
];

export default function StepCelebrate({
  challenge,
  ageMode,
  completionXp,
  sketchProjectId,
  wallAlreadySubmitted,
  onWallSubmitted,
  onRestart,
}: StepCelebrateProps) {
  const [caption, setCaption] = useState('');
  const [sending, setSending] = useState(false);
  const [wallDone, setWallDone] = useState(wallAlreadySubmitted);
  const [wallError, setWallError] = useState<string | null>(null);

  async function handleWallSubmit() {
    if (!sketchProjectId || sending) return;
    setSending(true);
    setWallError(null);
    try {
      await submitIdea(challenge.id, sketchProjectId, caption);
      setWallDone(true);
      onWallSubmitted();
    } catch (err: unknown) {
      if (err instanceof Error && (err as Error & { code?: string }).code === 'restricted') {
        setWallError('A grown-up needs to turn on sharing first');
      } else {
        setWallError('Could not post — try again');
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div data-testid="step-celebrate" className="flex flex-col gap-6 px-4 py-6">
      {/* Celebration header */}
      <div className="text-center py-8">
        <div className="text-6xl">🎉</div>
        <h2 className="font-display text-3xl text-challenge mt-3">MISSION COMPLETE!</h2>
      </div>

      {/* XP card */}
      <div data-testid="celebrate-xp" className="bg-challenge text-white rounded-card p-6 text-center mb-6">
        <p className="font-display text-4xl">+{completionXp} XP</p>
        {ageMode === 'older' && (
          <div className="mt-3 flex flex-col items-center gap-1">
            {XP_BREAKDOWN.map(({ label, xp }) => (
              <p key={label} className="font-body text-sm text-white/80">
                {label}: +{xp}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Audience picker — real API integration */}
      <AudiencePicker projectId={sketchProjectId} onDone={() => {}} />

      {/* Ideas Wall submission */}
      {!wallDone ? (
        <div
          data-testid="wall-submit-section"
          className="bg-white rounded-card shadow-sm p-4 flex flex-col gap-3"
        >
          <p className="font-display text-base text-ink">Post to Ideas Wall?</p>
          <p className="font-body text-sm text-ink/50">
            Your idea will be checked by a grown-up before others can see it.
          </p>

          <textarea
            data-testid="wall-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption (optional)"
            rows={2}
            className="w-full rounded-card border border-ink/20 px-3 py-2 font-body text-sm focus:outline-none focus:ring-2 focus:ring-challenge resize-none"
          />

          {wallError && (
            <p data-testid="wall-submit-error" className="font-body text-sm text-red-500">
              {wallError}
            </p>
          )}

          <button
            type="button"
            data-testid="wall-submit-btn"
            onClick={handleWallSubmit}
            disabled={sending || !sketchProjectId}
            className="bg-challenge text-white font-display text-base px-5 py-2.5 rounded-card disabled:opacity-40"
          >
            {sending ? 'Sending…' : '📤 Share to Ideas Wall'}
          </button>

          <p className="font-body text-xs text-ink/50">
            🛡 Reviewed by a grown-up before appearing
          </p>
        </div>
      ) : (
        <div
          data-testid="wall-submitted-note"
          className="bg-tint-blue rounded-card p-4 text-center font-body text-sm text-ink"
        >
          Your idea is being reviewed 🛡
        </div>
      )}

      {/* Action buttons */}
      <Link
        href="/challenges"
        className="bg-challenge text-white font-display text-lg px-6 py-3 rounded-card w-full text-center block"
      >
        Next mission →
      </Link>
    </div>
  );
}
