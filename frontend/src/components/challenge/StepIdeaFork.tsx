'use client';

import React from 'react';

type ChallengeDetail = import('@/lib/api/schema').components['schemas']['ChallengeDetail'];
type AgeMode = import('@/lib/hooks/useAgeMode').AgeMode;

interface StepIdeaForkProps {
  challenge: ChallengeDetail;
  ageMode: AgeMode;
  onYes: () => void; // user has an idea → jump to step 6
  onNo: () => void;  // inspire me → go to step 3
  onBack: () => void; // back to step 1
}

export default function StepIdeaFork({
  challenge: _challenge,
  ageMode: _ageMode,
  onYes,
  onNo,
  onBack,
}: StepIdeaForkProps) {
  return (
    <div data-testid="step-idea-fork" className="mx-auto flex max-w-lg flex-col items-center gap-8 px-4 py-8">
      {/* Heading */}
      <h2 className="font-display text-2xl text-challenge text-center">
        Do you already have an idea?
      </h2>

      {/* Two choice cards */}
      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
        {/* YES card */}
        <button
          data-testid="idea-yes"
          onClick={onYes}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-transparent bg-white p-6 text-center shadow-sm transition-all hover:border-challenge hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge focus-visible:ring-offset-2"
        >
          <span className="text-5xl" role="img" aria-label="Light bulb">
            💡
          </span>
          <span className="font-display text-lg text-ink">YES! I have an idea</span>
          <span className="font-body text-sm text-ink/50">Jump straight to sketching</span>
        </button>

        {/* NO card */}
        <button
          data-testid="idea-no"
          onClick={onNo}
          className="flex cursor-pointer flex-col items-center gap-3 rounded-card border-2 border-transparent bg-white p-6 text-center shadow-sm transition-all hover:border-challenge hover:shadow-md active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge focus-visible:ring-offset-2"
        >
          <span className="text-5xl" role="img" aria-label="Leaf">
            🌿
          </span>
          <span className="font-display text-lg text-ink">Not yet — inspire me!</span>
          <span className="font-body text-sm text-ink/50">See how nature solves it</span>
        </button>
      </div>

      {/* Back link */}
      <button
        onClick={onBack}
        className="font-body text-sm text-ink/50 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 rounded"
      >
        ← Back
      </button>
    </div>
  );
}
