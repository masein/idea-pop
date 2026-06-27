'use client';

import { useState } from 'react';
import Link from 'next/link';

type ChallengeDetail = import('@/lib/api/schema').components['schemas']['ChallengeDetail'];

type ShareOption = 'private' | 'class' | 'public';

interface StepCelebrateProps {
  challenge: ChallengeDetail;
  ageMode: 'young' | 'older';
  completionXp: number;
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
  onRestart,
}: StepCelebrateProps) {
  const [shareOption, setShareOption] = useState<ShareOption>('private');

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

      {/* Privacy / share card */}
      <div className="bg-white rounded-card shadow-sm p-4 mb-6">
        <p className="font-display text-base text-ink mb-3">Who can see your project?</p>

        <div className="flex flex-col gap-1">
          {/* Private */}
          <label
            data-testid="share-private"
            className={`flex items-start gap-3 p-2 rounded cursor-pointer ${
              shareOption === 'private' ? 'bg-tint-blue' : ''
            }`}
          >
            <input
              type="radio"
              name="share"
              value="private"
              checked={shareOption === 'private'}
              onChange={() => setShareOption('private')}
              className="mt-0.5 accent-challenge"
            />
            <div>
              <span className="font-body text-sm text-ink">🔒 Only me</span>
              <span className="font-body text-xs text-ink/50 block">Your private portfolio</span>
            </div>
          </label>

          {/* Class */}
          <label
            data-testid="share-class"
            className={`flex items-start gap-3 p-2 rounded cursor-pointer ${
              shareOption === 'class' ? 'bg-tint-blue' : ''
            }`}
          >
            <input
              type="radio"
              name="share"
              value="class"
              checked={shareOption === 'class'}
              onChange={() => setShareOption('class')}
              className="mt-0.5 accent-challenge"
            />
            <div>
              <span className="font-body text-sm text-ink">🏫 My class</span>
              <span className="font-body text-xs text-ink/50 block">Your teacher can see &amp; cheer</span>
            </div>
          </label>

          {/* Public — locked */}
          <div
            data-testid="share-public-locked"
            className="flex items-start gap-3 p-2 rounded opacity-50 cursor-not-allowed"
          >
            <input
              type="radio"
              name="share"
              value="public"
              disabled
              className="mt-0.5"
            />
            <div>
              <span className="font-body text-sm text-ink">🌍 Idea Gallery</span>
              <span className="font-body text-xs text-ink/50 block">
                Ask a parent to unlock this
              </span>
            </div>
          </div>
        </div>

        {/* Safety note */}
        <p className="font-body text-xs text-ink/50 flex items-center gap-1 mt-3">
          <span>🛡</span>
          <span>Grown-ups check public posts before others can see them</span>
        </p>
      </div>

      {/* Action buttons */}
      <Link
        href="/challenges"
        className="bg-challenge text-white font-display text-lg px-6 py-3 rounded-card w-full text-center block"
      >
        Next mission →
      </Link>
      <Link
        href="/ideas-wall"
        className="text-challenge font-body text-sm text-center block"
      >
        See the Ideas Wall →
      </Link>
    </div>
  );
}
