'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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
import IdeasWallTab from '@/components/challenge/IdeasWallTab';
import XpBurst from '@/components/explore/XpBurst';
import type { components } from '@/lib/api/schema';

type ChallengeDetail = components['schemas']['ChallengeDetail'];
type StartAttempt = components['schemas']['StartAttemptResponse'];
type XpAward = components['schemas']['XpAwardResponse'];

type StepNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type ActiveTab = 'mission' | 'wall';

function isStepNum(n: number): n is StepNum {
  return n >= 1 && n <= 8;
}

function wallStorageKey(challengeId: string) {
  return `wallSubmitted_${challengeId}`;
}

export default function ChallengePage() {
  const params = useParams<{ id: string }>();
  const t = useTranslations('challenge');
  const ageMode = useAgeMode();
  const { visible, award, show, dismiss } = useXpToast();

  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [attempt, setAttempt] = useState<StartAttempt | null>(null);
  // Highest step already recorded server-side — PATCH only when the kid moves
  // FORWARD past it, so revisiting earlier steps never regresses the report.
  const highestRecordedRef = useRef(1);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('mission');
  const [currentStep, setCurrentStep] = useState<StepNum>(1);
  const [reachedSteps, setReachedSteps] = useState<Set<number>>(new Set([1]));
  const [ideaPath, setIdeaPath] = useState<'yes' | 'no' | null>(null);
  const [sketchProjectId, setSketchProjectId] = useState<string | null>(null);
  const [wallUnlocked, setWallUnlocked] = useState(false);

  // Load challenge data
  useEffect(() => {
    fetchChallenge(params.id)
      .then((c) => setChallenge(c as ChallengeDetail))
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Restore wall-unlocked state from localStorage
  useEffect(() => {
    if (!params.id) return;
    const stored = localStorage.getItem(wallStorageKey(params.id));
    if (stored === 'true') setWallUnlocked(true);
  }, [params.id]);

  // Start (or resume) the attempt once the challenge is loaded. The server is
  // idempotent: re-opening a mission returns the existing in-progress attempt.
  useEffect(() => {
    if (!challenge || attempt) return;
    startAttempt(challenge.id)
      .then((a) => {
        if (!a) return;
        setAttempt(a);
        // Resuming mid-mission: don't re-record steps already reached.
        highestRecordedRef.current = Math.max(1, a.current_step);
      })
      .catch(() => { /* silently fail — don't block the UI */ });
  }, [challenge, attempt]);

  const goToStep = useCallback(
    async (step: number) => {
      if (!isStepNum(step)) return;

      // Record real progress (and the step-8 completion + XP) — only when the
      // kid moves FORWARD past what's already recorded; failures never block.
      if (attempt && step > highestRecordedRef.current) {
        try {
          const res = await advanceStep(attempt.attempt_id, step);
          highestRecordedRef.current = step;
          if (res && res.xp_earned) {
            show(res as unknown as XpAward);
          }
        } catch {
          // Don't block navigation on tracking failure
        }
      }

      setCurrentStep(step);
      setReachedSteps((prev) => {
        const next = new Set(prev);
        next.add(step);
        return next;
      });
      setActiveTab('mission');
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

  function handleWallSubmitted() {
    setWallUnlocked(true);
    if (params.id) {
      localStorage.setItem(wallStorageKey(params.id), 'true');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-tint-blue">
        <div className="animate-pulse font-display text-lg text-challenge">{t('loading_mission')}</div>
      </div>
    );
  }

  if (fetchError || !challenge) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-tint-blue gap-4 p-8">
        <p className="font-body text-ink/70">{fetchError ? t('load_error') : t('not_found')}</p>
        <a href="/challenges" className="text-challenge font-body text-sm underline">
          {t('back_to_challenges')}
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

      {/* Mission / Ideas Wall tabs */}
      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="flex gap-0 rounded-card overflow-hidden border border-ink/10 mb-4" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'mission'}
            data-testid="tab-mission"
            onClick={() => setActiveTab('mission')}
            className={`flex-1 py-2.5 font-display text-sm transition-colors ${
              activeTab === 'mission'
                ? 'bg-challenge text-white'
                : 'bg-white text-ink/60 hover:bg-tint-blue'
            }`}
          >
            {t('tab_mission')}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'wall'}
            data-testid="tab-wall"
            onClick={() => setActiveTab('wall')}
            className={`flex-1 py-2.5 font-display text-sm transition-colors ${
              activeTab === 'wall'
                ? 'bg-challenge text-white'
                : 'bg-white text-ink/60 hover:bg-tint-blue'
            }`}
          >
            {t('tab_wall')}
          </button>
        </div>
      </div>

      {/* Mission tab content */}
      {activeTab === 'mission' && (
        <div className="max-w-2xl mx-auto px-4 pb-24">
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
              sketchProjectId={sketchProjectId}
              wallAlreadySubmitted={wallUnlocked}
              onWallSubmitted={handleWallSubmitted}
              onRestart={() => {
                window.location.href = '/challenges';
              }}
            />
          )}
        </div>
      )}

      {/* Ideas Wall tab content */}
      {activeTab === 'wall' && (
        <div className="max-w-2xl mx-auto pb-24">
          <IdeasWallTab
            challengeId={challenge.id}
            ageMode={ageMode}
            wallUnlocked={wallUnlocked}
            onWriteMyIdea={() => {
              setActiveTab('mission');
              goToStep(8);
            }}
          />
        </div>
      )}

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
