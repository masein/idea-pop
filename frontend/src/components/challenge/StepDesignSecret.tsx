'use client';

type ChallengeDetail = import('@/lib/api/schema').components['schemas']['ChallengeDetail'];

interface StepDesignSecretProps {
  challenge: ChallengeDetail;
  ageMode: 'young' | 'older';
  onNext: () => void;
  onBack: () => void;
}

export default function StepDesignSecret({
  challenge,
  ageMode,
  onNext,
  onBack,
}: StepDesignSecretProps) {
  return (
    <div data-testid="step-design-secret" className="flex flex-col gap-6">
      <h2 className="font-display text-2xl text-challenge">Design secret 🔑</h2>

      {ageMode === 'older' && challenge.design_secret_story && (
        <div className="bg-tint-blue rounded-card p-4 flex flex-col gap-1">
          <span className="font-body text-xs text-ink/50 uppercase tracking-wide">
            The story
          </span>
          <p className="font-body text-sm text-ink">{challenge.design_secret_story}</p>
        </div>
      )}

      <div className="bg-challenge text-white rounded-card p-6 text-center shadow-md">
        <p
          data-testid="design-secret-text"
          className="font-display text-2xl leading-snug"
        >
          {challenge.design_secret}
        </p>
      </div>

      {ageMode === 'older' && (
        <p className="font-body text-xs text-ink/50 text-center italic">
          This is the design principle engineers call biomimicry
        </p>
      )}

      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={onNext}
          className="w-full sm:w-auto bg-white text-challenge border border-challenge font-body text-sm font-semibold px-6 py-3 rounded-card shadow-sm hover:bg-challenge/5 active:bg-challenge/10 transition-colors"
        >
          I got the secret! →
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
