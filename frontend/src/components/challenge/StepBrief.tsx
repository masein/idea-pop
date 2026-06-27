'use client';

import React from 'react';

type ChallengeDetail = import('@/lib/api/schema').components['schemas']['ChallengeDetail'];
type AgeMode = import('@/lib/hooks/useAgeMode').AgeMode;

interface StepBriefProps {
  challenge: ChallengeDetail;
  ageMode: AgeMode;
  onNext: () => void;
}

export default function StepBrief({ challenge, ageMode, onNext }: StepBriefProps) {
  const isYoung = ageMode === 'young';

  return (
    <div data-testid="step-brief" className="mx-auto flex max-w-lg flex-col items-center gap-6 px-4 py-8">
      {/* Big emoji */}
      <span className="text-6xl text-center" role="img" aria-label={challenge.title}>
        {challenge.emoji}
      </span>

      {/* Headings */}
      <div className="flex flex-col items-center gap-2 text-center">
        <h2
          className={[
            'font-display text-challenge',
            isYoung ? 'text-3xl' : 'text-2xl',
          ].join(' ')}
        >
          Your mission
        </h2>
        <h3
          className={[
            'font-display text-ink',
            isYoung ? 'text-2xl' : 'text-xl',
          ].join(' ')}
        >
          {challenge.title}
        </h3>
      </div>

      {/* Brief */}
      <p
        className={[
          'font-body text-ink text-center',
          isYoung ? 'text-lg leading-relaxed' : 'text-base',
        ].join(' ')}
      >
        {challenge.brief}
      </p>

      {/* XP chip */}
      <span className="rounded-full bg-challenge/10 px-3 py-1 font-body text-sm text-challenge">
        +{challenge.completion_xp} XP to earn
      </span>

      {/* CTA */}
      <button
        onClick={onNext}
        className="w-full rounded-card bg-challenge px-8 py-4 font-display text-lg text-white transition-all hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge focus-visible:ring-offset-2"
      >
        {"Let's go! 🚀"}
      </button>
    </div>
  );
}
