'use client';

import { useState } from 'react';

type ChallengeDetail = import('@/lib/api/schema').components['schemas']['ChallengeDetail'];

interface StepNatureCluesProps {
  challenge: ChallengeDetail;
  ageMode: 'young' | 'older';
  onNext: () => void;
  onBack: () => void;
}

export default function StepNatureClues({
  challenge,
  ageMode,
  onNext,
  onBack,
}: StepNatureCluesProps) {
  const [watched, setWatched] = useState<Set<number>>(new Set());

  const toggleWatched = (index: number) => {
    setWatched((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Defensive: never index a possibly-missing array (the white-screen bug).
  const clues = challenge.nature_clues ?? [];
  const exampleXp = clues[0]?.xp_reward ?? 5;

  return (
    <div data-testid="step-nature-clues" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl text-challenge">
          How does nature solve this? 🌿
        </h2>
        <p className="font-body text-sm text-ink/50">
          Each clue earns +{exampleXp} XP
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {clues.map((clue, index) => {
          const isWatched = watched.has(index);

          return (
            <div
              key={index}
              data-testid={`nature-clue-${index}`}
              className="relative bg-white rounded-card shadow-sm p-4 flex flex-col gap-2"
            >
              {isWatched && (
                <div className="absolute top-2 right-2 text-explore text-xl leading-none">
                  ✅
                </div>
              )}

              <span className="text-4xl">{clue.emoji}</span>

              <p className="font-display text-lg text-ink">{clue.title}</p>

              <p className="font-body text-sm text-ink/70">{clue.description}</p>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-explore/10 text-explore text-xs px-2 py-0.5 rounded-full">
                  +{clue.xp_reward} XP
                </span>

                {clue.explore_video_id && (
                  <button
                    data-testid={`watch-clue-${index}`}
                    onClick={() => toggleWatched(index)}
                    className="text-xs font-body text-challenge underline underline-offset-2 hover:opacity-80 transition-opacity"
                  >
                    {isWatched ? 'Watched ✓' : 'Watch clip'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={onNext}
          className="w-full sm:w-auto bg-challenge text-white font-body text-sm font-semibold px-6 py-3 rounded-card shadow-sm hover:opacity-90 active:opacity-80 transition-opacity"
        >
          Got it — show me the secret →
        </button>

        <button
          onClick={onBack}
          className="font-body text-sm text-ink/50 hover:text-ink transition-colors"
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
