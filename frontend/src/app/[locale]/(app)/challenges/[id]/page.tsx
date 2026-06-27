'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAgeMode } from '@/lib/hooks/useAgeMode';
import { useXpToast } from '@/lib/hooks/useXpToast';
import { fetchChallenge, startAttempt, advanceStep } from '@/lib/api/client';
import MissionHUD from '@/components/challenge/MissionHUD';
import StepBrief from '@/components/challenge/StepBrief';
import StepIdeaFork from '@/components/challenge/StepIdeaFork';
import StepNatureClues from '@/components/challenge/StepNatureClues';
import StepDesignSecret from '@/components/challenge/StepDesignSecret';
import StepSkill from '@/components/challenge/StepSkill';
import StepSketch from '@/components/challenge/StepSketch';
import StepBuild from '@/components/challenge/StepBuild';
import StepCelebrate from '@/components/challenge/StepCelebrate';
import XpBurst from '@/components/explore/XpBurst';
import type { components } from '@/lib/api/schema';

type ChallengeDetail = components['schemas']['ChallengeDetail'];
type ChallengeAttempt = components['schemas']['ChallengeAttempt'];
type XpAward = components['schemas']['XpAwardResponse'];

type StepNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const STEP_NAMES: Record<StepNum, string> = {
  1: 'Brief',
  2: 'Your idea?',
  3: 'Nature clues',
  4: 'Design secret',
  5: 'Skill',
  6: 'Sketch',
  7: 'Build & test',
  8: 'Celebrate & share',
};

function isStepNum(n: number): n is StepNum {
  return n >= 1 && n <= 8;
}

export default function ChallengePage() {
  const params = useParams<{ id: string }>();
  const ageMode = useAgeMode();
  const { visible, award, show, dismiss } = useXpToast();

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [attempt, setAttempt] = useState<ChallengeAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<StepNum>(1);
  const [reachedSteps, setReachedSteps] = useState<Set<number>>(new Set([1]));
  const [ideaPath, setIdeaPath] = useState<'yes' | 'no' | null>(null);
  const [sketchProjectId, setSketchProjectId] = useState<string | null>(null);

  // Load challenge data
  useEffect(() => {
    fetchChallenge(params.id)
      .then((c) => setChallenge(c as ChallengeDetail))
      .catch(() => setFetchError('Could not load this mission. Please try again.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Start attempt once challenge is loaded (once)
  useEffect(() => {
    if (!challenge || attempt) return;
    startAttempt(challenge.id)
      .then((a) => setAttempt(a as ChallengeAttempt))
      .catch(() => { /* silently fail — don't block the UI */ });
  }, [challenge, attempt]);

  const goToStep = useCallback(
    async (step: number) => {
      if (!isStepNum(step)) return;

      // Fire PATCH for analytics + possible XP award
      if (attempt) {
        try {
          const res = await advanceStep(attempt.id, step);
          if (res && (res as XpAward).xp_earned) {
            show(res as XpAward);
          }
        } catch {
          // Don't block navigation on analytics failure
        }
      }

      setCurrentStep(step);
      setReachedSteps((prev) => {
        const next = new Set(prev);
        next.add(step);
        return next;
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [attempt, show],
  );

  const handleIdeaYes = useCallback(() => {
    setIdeaPath('yes');
    // Mark steps 3/4/5 as optionally reachable via mission menu (no dead ends)
    setReachedSteps((prev) => {
      const next = new Set(prev);
      next.add(3);
      next.add(4);
      next.add(5);
      return next;
    });
    goToStep(6);
  }, [goToStep]);

  const handleIdeaNo = useCallback(() => {
    setIdeaPath('no');
    goToStep(3);
  }, [goToStep]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-tint-blue">
        <div className="animate-pulse font-display text-lg text-challenge">Loading mission…</div>
      </div>
    );
  }

  if (fetchError || !challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-tint-blue gap-4 p-8">
        <p className="font-body text-ink/70">{fetchError ?? 'Mission not found.'}</p>
        <a href="/challenges" className="text-challenge font-body text-sm underline">
          ← Back to challenges
        </a>
      </div>
    );
  }

  const sharedProps = { challenge, ageMode };

  return (
    <div data-testid="challenge-page" className="min-h-screen bg-tint-blue">
      <MissionHUD
        challenge={challenge}
        currentStep={currentStep}
        reachedSteps={reachedSteps}
        onJumpTo={goToStep}
        ideaPath={ideaPath}
      />

      <div className="max-w-2xl mx-auto px-4 pt-4 pb-24">
        {currentStep === 1 && (
          <StepBrief {...sharedProps} onNext={() => goToStep(2)} />
        )}

        {currentStep === 2 && (
          <StepIdeaFork
            {...sharedProps}
            onYes={handleIdeaYes}
            onNo={handleIdeaNo}
            onBack={() => goToStep(1)}
          />
        )}

        {currentStep === 3 && (
          <StepNatureClues
            {...sharedProps}
            onNext={() => goToStep(4)}
            onBack={() => goToStep(2)}
          />
        )}

        {currentStep === 4 && (
          <StepDesignSecret
            {...sharedProps}
            onNext={() => goToStep(5)}
            onBack={() => goToStep(3)}
          />
        )}

        {currentStep === 5 && (
          <StepSkill
            {...sharedProps}
            onNext={() => goToStep(6)}
            onBack={() => goToStep(4)}
          />
        )}

        {currentStep === 6 && (
          <StepSketch
            {...sharedProps}
            onNext={(projectId) => {
              if (projectId) setSketchProjectId(projectId);
              goToStep(7);
            }}
            onBack={() => goToStep(ideaPath === 'yes' ? 2 : 5)}
          />
        )}

        {currentStep === 7 && (
          <StepBuild
            {...sharedProps}
            sketchProjectId={sketchProjectId}
            onNext={() => {
              // Show completion XP burst before navigating to step 8
              show({
                xp_earned: challenge.completion_xp,
                xp_total: 0,
                level: 1,
                rank: 'Explorer',
                is_new: false,
                cycle_bonus_earned: false,
              });
              goToStep(8);
            }}
            onBack={() => goToStep(6)}
          />
        )}

        {currentStep === 8 && (
          <StepCelebrate
            {...sharedProps}
            completionXp={challenge.completion_xp}
            onRestart={() => {
              window.location.href = '/challenges';
            }}
          />
        )}
      </div>

      {visible && award && (
        <XpBurst
          award={award}
          stickerEmoji="⭐"
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}

