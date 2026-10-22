'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Link, useRouter } from '@/i18n/routing';
import { getAccessToken } from '@/lib/api/auth';
import { useLocale, useTranslations } from 'next-intl';
import { useAgeMode } from '@/lib/hooks/useAgeMode';
import { useXpToast } from '@/lib/hooks/useXpToast';
import { fetchChallenge, startAttempt, advanceStep, claimSketchBonus, getIdeaFeedback, createProject, uploadProjectPhoto } from '@/lib/api/client';
import LabCelebration from '@/components/challenge/story/LabCelebration';
import SubstitutePractice from '@/components/challenge/story/SubstitutePractice';
import SubstCelebration from '@/components/challenge/story/SubstCelebration';
import RewardPopup from '@/components/challenge/story/RewardPopup';
import GuideNameMessages from '@/components/challenge/story/GuideNameMessages';
import { MISSION_XP_MAX, badgeArt, badgeName, type MissionBadgeKey } from '@/components/challenge/story/missionBadges';
import { discoveryOf } from '@/components/challenge/story/discovery';
import { claimMissionBadge, claimPhotoBonus, claimStar, fetchChallengeProgress } from '@/lib/api/client';
import { announceChallengeProgress, useChallengeProgress } from '@/lib/hooks/useChallengeProgress';
import StarNotice from '@/components/challenge/StarNotice';
import { ImprovedIdeaBox, ThreeStarCelebration } from '@/components/challenge/story/ImprovedIdea';
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
import DefineCelebration from '@/components/challenge/story/DefineCelebration';
import StoryBrief from '@/components/challenge/story/StoryBrief';
import StoryClues from '@/components/challenge/story/StoryClues';
import StorySecret from '@/components/challenge/story/StorySecret';
import StoryLab from '@/components/challenge/story/StoryLab';
import ToolLesson from '@/components/challenge/story/ToolLesson';
import StoryEnding from '@/components/challenge/story/StoryEnding';
import { StoryFairTest, StorySketchTop } from '@/components/challenge/story/StorySketchBuild';
import { Popi } from '@/components/challenge/story/StoryBits';
import { howQuestion } from '@/components/challenge/story/StoryPictureBook';
import { useMissionGame } from '@/components/challenge/story/useMissionGame';
import { forgetNarration } from '@/lib/hooks/useAutoNarration';
import type { components } from '@/lib/api/schema';

type ChallengeDetail = components['schemas']['ChallengeDetail'];
type StartAttempt = components['schemas']['StartAttemptResponse'];
type XpAward = components['schemas']['XpAwardResponse'];

type StepNum = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
type ActiveTab = 'mission' | 'wall';

/** The nine-step template's difficulty bands: 1–4 explore and understand, 5–6 create and
 *  experiment, 7–9 improve and master. */
const NINE_STEP_LEVELS = [1, 1, 1, 1, 2, 2, 3, 3, 3];

function isStepNum(n: number): n is StepNum {
  return n >= 1 && n <= 8;
}

function wallStorageKey(challengeId: string) {
  return `wallSubmitted_${challengeId}`;
}

/** Max's challenge names its guide PopAI and uses its own lines: the whole page (popups
 *  included) reads its words through this wrapper once the mission is known. */
export default function ChallengePage() {
  const [badgeMode, setBadgeMode] = useState(false);
  return (
    <GuideNameMessages enabled={badgeMode}>
      <ChallengePageInner onBadgeMode={setBadgeMode} />
    </GuideNameMessages>
  );
}

function ChallengePageInner({ onBadgeMode }: { onBadgeMode: (on: boolean) => void }) {
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
  // Story missions split step 5 into the lab and the creativity-tool power-up.
  const [skillPhase, setSkillPhase] = useState<'lab' | 'tool'>('lab');
  // The "you solved it!" moment after the sketch (TEMP rule 35).
  const [solvedCelebration, setSolvedCelebration] = useState<{
    xp: number | null;
    again: boolean;
    popi: { state: 'loading' | 'done' | 'off'; text?: string; fits?: boolean };
    /** The stars after this idea earned the first one (shown once, when it is new). */
    stars?: number[];
  } | null>(null);
  // Stars, badges and XP on this challenge: the same shared state as the Challenges cards.
  const progressMap = useChallengeProgress(params.id ? [params.id] : []);
  const myProgress = progressMap[params.id] ?? null;
  // A star just earned in the lab popup (star 2), and on the last page (star 3 / all three).
  const [labStars, setLabStars] = useState<number[] | null>(null);
  const [lastStar, setLastStar] = useState<number[] | null>(null);
  const [threeStar, setThreeStar] = useState<{ xp: number | null; badges: string[] } | null>(null);
  const { game, update: updateGame, award: awardBadge, reset: resetGame, loaded: gameLoaded, resumeLater } = useMissionGame(params.id);
  // Max's Skills page (SCAMPER) is its own step after the Experiment: has the kid reached it?
  const [toolReached, setToolReached] = useState(false);
  // Coming back later: carry on where the kid left off (restored once, then kept up to date).
  const restoredRef = useRef(false);
  // The lab is done: "What Did You Build?" with an optional photo (the lab project it goes on).
  const [labCelebration, setLabCelebration] = useState<{ projectId: string | null } | null>(null);
  // The Substitute practice is done (Skills): celebrate, then Build and Test or stop for today.
  const [substCelebration, setSubstCelebration] = useState<false | 'subst' | 'tool'>(false);
  // Max's badge popups (Quizzy after the puzzle, Nature Inspiration after Nature Clues) and
  // the XP each one gave (null while the server answers).
  const [reward, setReward] = useState<{ key: 'define' | 'clue'; xp: number | null } | null>(null);
  const [substXp, setSubstXp] = useState<number | null>(null);
  // This visit's photos of the saved idea and the lab model, shown on the Substitute practice.
  const [ideaPhotoUrl, setIdeaPhotoUrl] = useState<string | null>(null);
  const [labPhotoUrl, setLabPhotoUrl] = useState<string | null>(null);
  const tStory = useTranslations('story');
  // Bumped on "start over", so every step's own state starts fresh too.
  const [runKey, setRunKey] = useState(0);

  const locale = useLocale();
  const router = useRouter();

  // Load challenge data
  // Every visit opens the mission fresh, so Popi reads the story again too.
  useEffect(() => {
    forgetNarration(params.id);
  }, [params.id]);

  useEffect(() => {
    fetchChallenge(params.id, locale)
      .then((c) => setChallenge(c as ChallengeDetail))
      .catch(() => {
        // Signed out (the session ran out and couldn't be renewed): sign in again and come
        // straight back to this mission, instead of a "could not load" dead end.
        if (!getAccessToken()) {
          try {
            sessionStorage.setItem('ideapop_return_to', `/challenges/${params.id}`);
          } catch {
            /* private mode — they land on their dashboard instead */
          }
          router.replace('/child-login');
          return;
        }
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [params.id, locale]);

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
    async (step: number, phase: 'lab' | 'tool' = 'lab') => {
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
      if (step === 6) setSkillPhase(phase);
      if (step === 6 && phase === 'tool') setToolReached(true);
      setReachedSteps((prev) => {
        const next = new Set(prev);
        next.add(step);
        return next;
      });
      setActiveTab('mission');
      // Every new page opens at its top: once the new content is on screen, reset both the
      // window and the scrolling content area (instant, so nothing interrupts it).
      const toTop = () => {
        window.scrollTo({ top: 0 });
        document.querySelector('main')?.scrollTo({ top: 0 });
      };
      toTop();
      requestAnimationFrame(() => requestAnimationFrame(toTop));
      window.setTimeout(toTop, 120);
    },
    [attempt, show],
  );

  const handleIdeaYes = useCallback(() => {
    setIdeaPath('yes');
    // A kid with an idea goes straight to the sketch; Nature clues stays open in the menu.
    setReachedSteps((prev) => new Set(prev).add(3));
    goToStep(4);
  }, [goToStep]);

  const handleIdeaNo = useCallback(() => {
    setIdeaPath('no');
    goToStep(3);
  }, [goToStep]);

  // Tell the wrapper whether this is a badge-reward mission (PopAI wording).
  useEffect(() => {
    onBadgeMode(discoveryOf(challenge?.story)?.rewards?.mode === 'badges');
  }, [challenge, onBadgeMode]);

  // Max: when Second Try Hero is earned in the fair test, give its 5 XP (once).
  const retryEarned = game.badges.includes('retry');
  const retryClaimed = useRef(false);
  useEffect(() => {
    if (!retryEarned || retryClaimed.current || !challenge || discoveryOf(challenge.story)?.rewards?.mode !== 'badges') return;
    retryClaimed.current = true;
    void claimMissionBadge(challenge.id, 'retry').catch(() => {});
  }, [retryEarned, challenge]);

  // Resume: put the kid back where they were last time.
  useEffect(() => {
    if (!gameLoaded || !challenge || restoredRef.current) return;
    restoredRef.current = true;
    const nav = game.nav;
    if (!nav) return;
    if (isStepNum(nav.step)) setCurrentStep(nav.step);
    setSkillPhase(nav.phase);
    setReachedSteps(new Set(nav.reached));
    setToolReached(nav.toolReached);
    setIdeaPath(nav.ideaPath);
    setSketchProjectId(nav.sketchProjectId);
  }, [gameLoaded, challenge, game.nav]);

  // ...and remember where they are as they go.
  useEffect(() => {
    if (!restoredRef.current) return;
    updateGame({
      nav: {
        step: currentStep,
        phase: skillPhase,
        reached: [...reachedSteps],
        toolReached,
        ideaPath,
        sketchProjectId,
      },
    });
  }, [currentStep, skillPhase, reachedSteps, toolReached, ideaPath, sketchProjectId, updateGame]);

  // "Start over": clear this challenge's answers and go back to step 1. XP and badges stay.
  const restartMission = useCallback(() => {
    resetGame();
    forgetNarration(params.id);
    setIdeaPath(null);
    setSketchProjectId(null);
    setSkillPhase('lab');
    setToolReached(false);
    setSolvedCelebration(null);
    setReachedSteps(new Set([1]));
    setCurrentStep(1);
    setActiveTab('mission');
    setRunKey((k) => k + 1);
    window.scrollTo({ top: 0 });
    document.querySelector('main')?.scrollTo({ top: 0 });
  }, [resetGame, params.id]);

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
        <Link href="/challenges" className="text-challenge font-body text-sm underline">
          {t('back_to_challenges')}
        </Link>
      </div>
    );
  }

  const sharedProps = { challenge, ageMode };
  // Max's challenge shows 9 steps: the Skill step is split into Experiment (the lab) and
  // Skills (SCAMPER). Underneath they are still step 6, in two phases.
  // Every template challenge (and Max's) has the nine steps.
  const split = !!challenge.story?.substitute || discoveryOf(challenge.story)?.rewards?.mode === 'badges';
  const stepNames = split
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => t(`plan9_step_${n}`))
    : undefined;
  const shownStep = !split || currentStep < 6 ? currentStep : currentStep === 6 ? (skillPhase === 'lab' ? 6 : 7) : currentStep + 1;
  const shownReached = new Set<number>();
  reachedSteps.forEach((s) => {
    if (!split || s < 6) shownReached.add(s);
    else if (s === 6) shownReached.add(6);
    else shownReached.add(s + 1);
  });
  if (split && toolReached) shownReached.add(7);
  const jumpTo = (n: number) => {
    if (!split || n < 6) return goToStep(n);
    if (n === 6) return goToStep(6, 'lab');
    if (n === 7) return goToStep(6, 'tool');
    return goToStep(n - 1);
  };
  // Steps this mission leaves out (Max: no Build & test); moving on skips them.
  const hiddenSteps = challenge.story?.hidden_steps ?? [];
  const after = (step: number) => {
    let next = step + 1;
    while (hiddenSteps.includes(next) && next < 8) next += 1;
    return next;
  };
  // The storytelling + Popi instructor layer; null → the classic mission.
  const story = challenge.story ?? null;
  // Max's challenge: 5 XP per badge and 10 per photo kind, its guide is PopAI.
  const badgeMode = discoveryOf(story)?.rewards?.mode === 'badges';
  // Give a badge once (the server keeps it once too); resolves the XP given now.
  const giveBadge = (key: MissionBadgeKey) => {
    updateGame((g) => ({ badges: g.badges.includes(key) ? g.badges : [...g.badges, key] }));
    return claimMissionBadge(challenge.id, key).catch(() => 0);
  };
  const givePhoto = (key: 'design' | 'build') => claimPhotoBonus(challenge.id, key).catch(() => null);
  const badgeOf = (key: MissionBadgeKey) => ({ art: badgeArt(story, key), name: badgeName(story, key, tStory) });
  const disc = discoveryOf(story);
  // Give a star once; the server checks the work behind it. Every screen hears about it.
  const giveStar = (star: 1 | 2 | 3, note?: string) =>
    claimStar(challenge.id, star, note)
      .then((r) => {
        announceChallengeProgress(challenge.id);
        return r;
      })
      .catch(() => null);
  const stars = myProgress?.stars ?? [];
  const gameProps = { game, update: updateGame };

  // A picture-book brief fills the frame; every other step keeps the narrow reading column.
  // The Your idea? choice cards get room to be big, too.
  const wide =
    (currentStep === 1 && story && story.opening.length > 0 && story.opening.every((p) => p.image)) || currentStep === 2
      ? 'max-w-5xl'
      : 'max-w-2xl';
  return (
    <div data-testid="challenge-page" className="min-h-screen bg-tint-blue">
      <MissionHUD
        challenge={badgeMode ? { ...challenge, completion_xp: MISSION_XP_MAX } : challenge}
        currentStep={shownStep}
        reachedSteps={shownReached}
        onJumpTo={jumpTo}
        stepNames={stepNames}
        stepLevels={split ? NINE_STEP_LEVELS : undefined}
        stars={badgeMode ? stars : null}
        ideaPath={ideaPath}
        keyInfo={story ? story.card : null}
        summary={challenge.brief}
      />

      {/* Mission / Ideas Wall tabs */}
      <div className={`${wide} mx-auto px-4 pt-4`}>
        <div className="mb-4 flex gap-1 rounded-pill bg-white p-1.5 shadow-sm" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'mission'}
            data-testid="tab-mission"
            onClick={() => setActiveTab('mission')}
            className={`flex-1 rounded-pill px-6 min-h-11 font-body text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63] focus-visible:ring-offset-1 ${activeTab === 'mission' ? 'bg-[#1A6FA6] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]' : 'text-[#3E5566] hover:bg-[#EAF5FC] hover:text-[#1F2A33]'}`}
          >
            {t('tab_mission')}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'wall'}
            data-testid="tab-wall"
            onClick={() => setActiveTab('wall')}
            className={`flex-1 rounded-pill px-6 min-h-11 font-body text-base font-bold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63] focus-visible:ring-offset-1 ${activeTab === 'wall' ? 'bg-[#1A6FA6] text-white shadow-[0_2px_4px_rgba(0,0,0,0.2)]' : 'text-[#3E5566] hover:bg-[#EAF5FC] hover:text-[#1F2A33]'}`}
          >
            {t('tab_wall')}
          </button>
        </div>
      </div>

      {/* Mission tab content */}
      {activeTab === 'mission' && (
        <div key={runKey} className={`${wide} mx-auto px-4 pb-24`}>
          {currentStep === 1 &&
            (story ? (
              <StoryBrief
                challenge={challenge}
                story={story}
                {...gameProps}
                customReward={badgeMode}
                onNext={() => {
                  if (!badgeMode) return goToStep(2);
                  setReward({ key: 'define', xp: null });
                  void giveBadge('define').then((xp) => setReward((r) => (r && r.key === 'define' ? { ...r, xp } : r)));
                }}
              />
            ) : (
              <StepBrief {...sharedProps} onNext={() => goToStep(2)} />
            ))}

          {currentStep === 2 && story && (
            <div className="flex flex-col gap-4 pt-4">
              <Popi text={howQuestion(story) ?? story.guide.your_idea} />
            </div>
          )}

          {currentStep === 2 && (
            <StepIdeaFork
              {...sharedProps}
              onYes={handleIdeaYes}
              onNo={handleIdeaNo}
              onBack={() => goToStep(1)}
            />
          )}

          {currentStep === 3 &&
            (story ? (
              <StoryClues
                story={story}
                {...gameProps}
                award={awardBadge}
                deferClueBadge={badgeMode}
                onNext={() => {
                  if (!badgeMode) return goToStep(4);
                  setReward({ key: 'clue', xp: null });
                  void giveBadge('clue').then((xp) => setReward((r) => (r && r.key === 'clue' ? { ...r, xp } : r)));
                }}
                onBack={() => goToStep(2)}
                fullInspirationTip={challenge.season === 1 && challenge.week_number <= 5}
              />
            ) : (
              <StepNatureClues
                {...sharedProps}
                onNext={() => goToStep(4)}
                onBack={() => goToStep(2)}
              />
            ))}

          {currentStep === 4 && story && <StorySketchTop story={story} {...gameProps} />}

          {currentStep === 4 && (
            <StepSketch
              {...sharedProps}
              hideTools={story !== null}
              guide={
                badgeMode && disc?.idea_questions?.length
                  ? {
                      questions: disc.idea_questions,
                      nameLabel: disc.idea_name_prompt ?? tStory('name_idea_fallback'),
                      submitLabel: tStory('submit_idea'),
                    }
                  : null
              }
              onNext={(projectId, idea, saved) => {
                if (projectId) setSketchProjectId(projectId);
                // The saved idea goes on to the Substitute practice (and is kept for next time).
                if (saved) {
                  updateGame({ savedIdea: { title: saved.title, description: saved.description, projectId } });
                  setIdeaPhotoUrl(saved.photo ? URL.createObjectURL(saved.photo) : null);
                }
                // The kid has solved the problem with a first idea: celebrate, then
                // invite them on to find more ideas (design secret, skill, build).
                setSolvedCelebration({ xp: null, again: game.badges.includes('solved'), popi: { state: idea || game.partnerAnswers?.inspired ? 'loading' : 'off' } });
                if (badgeMode) {
                  void Promise.all([giveBadge('solved'), saved?.photo ? givePhoto('design') : Promise.resolve(0)]).then(
                    ([b, p]) => {
                      setSolvedCelebration((c) => (c ? { ...c, xp: b + (p ?? 0) } : c));
                      // The first idea is in: the first star (after the badge, which it needs).
                      void giveStar(1).then((r) => {
                        if (r?.is_new) setSolvedCelebration((c) => (c ? { ...c, stars: r.stars } : c));
                      });
                    },
                  );
                } else {
                  claimSketchBonus(challenge.id)
                    .then((r) => setSolvedCelebration((c) => (c ? { ...c, xp: r?.xp_earned ?? 0 } : c)))
                    .catch(() => {});
                }
                // Popi reads the idea (AI helper). The XP never waits for this.
                // Popi reads the whole plan: the idea, how nature inspired it, the map labels.
                const plan = [
                  idea,
                  game.partnerAnswers?.inspired,
                  ...(game.mapLabels ?? []),
                  game.materials?.length ? game.materials.join(', ') : '',
                ]
                  .map((x) => x?.trim())
                  .filter(Boolean)
                  .join('. ');
                if (plan) {
                  void getIdeaFeedback(challenge.id, plan, locale).then((f) =>
                    setSolvedCelebration((c) =>
                      c
                        ? {
                            ...c,
                            popi: f && !f.blocked ? { state: 'done', text: f.message, fits: f.fits } : { state: 'off' },
                          }
                        : c,
                    ),
                  );
                }
              }}
              onBack={() => goToStep(ideaPath === 'yes' ? 2 : 3)}
            />
          )}

          {currentStep === 5 &&
            (story ? (
              <StorySecret
                challenge={challenge}
                story={story}
                {...gameProps}
                onNext={() => goToStep(6)}
                onBack={() => goToStep(4)}
              />
            ) : (
              <StepDesignSecret
                {...sharedProps}
                onNext={() => goToStep(6)}
                onBack={() => goToStep(4)}
              />
            ))}

          {currentStep === 6 &&
            (story ? (
              skillPhase === 'lab' ? (
                <StoryLab
                  challenge={challenge}
                  story={story}
                  {...gameProps}
                  experiment={split}
                  onNext={() => {
                    if (split) void goToStep(6, 'tool');
                    else setSkillPhase('tool');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onFinished={() => {
                    // Save the prediction and results to the kid's account, then celebrate.
                    const lab = story.lab;
                    const values = lab.options.map((_, i) => Number(game.lab[i] ?? 0));
                    const bestAt = values.indexOf(lab.higher_is_better ? Math.max(...values) : Math.min(...values));
                    const prediction = game.labPick !== null ? lab.options[game.labPick] : '';
                    const results = lab.options.map((o, i) => `${o}: ${values[i]}`).join(', ');
                    const words = `${tStory('my_prediction')} ${prediction}\n${tStory('my_results')}: ${results} (${lab.measure})`;
                    setLabCelebration({ projectId: null });
                    createProject({
                      title: lab.title,
                      what_i_made: words,
                      what_i_used: '',
                      what_was_hard: '',
                      what_id_improve: '',
                      challenge_id: challenge.id,
                      step_type: 'lab',
                    })
                      .then((p) => p.id)
                      .catch(() => null)
                      .then((projectId) => {
                        updateGame({
                          savedLab: { prediction, results, best: lab.options[bestAt], bestValue: values[bestAt], measure: lab.measure, projectId },
                        });
                        setLabCelebration((c) => (c ? { projectId } : c));
                      });
                  }}
                  onBack={() => goToStep(5)}
                />
              ) : story.substitute ? (
                <SubstitutePractice
                  challengeId={challenge.id}
                  story={story}
                  {...gameProps}
                  award={awardBadge}
                  ideaPhotoUrl={ideaPhotoUrl}
                  labPhotoUrl={labPhotoUrl}
                  onDone={() => {
                    setSubstXp(null);
                    setSubstCelebration('subst');
                    void giveBadge('tool').then((xp) => setSubstXp(xp));
                  }}
                  onBack={() => setSkillPhase('lab')}
                />
              ) : (
                <ToolLesson
                  story={story}
                  {...gameProps}
                  award={awardBadge}
                  deferBadge={badgeMode}
                  onNext={() => {
                    if (!badgeMode) return goToStep(after(6));
                    // The template: the tool's badge in the shared reward popup, then Build and Test.
                    setSubstXp(null);
                    setSubstCelebration('tool');
                    void giveBadge('tool').then((xp) => setSubstXp(xp));
                  }}
                  onBack={() => setSkillPhase('lab')}
                />
              )
            ) : (
              <StepSkill
                {...sharedProps}
                onNext={() => goToStep(after(6))}
                onBack={() => goToStep(5)}
              />
            ))}

          {currentStep === 7 && !hiddenSteps.includes(7) && story && <StoryFairTest story={story} {...gameProps} />}

          {currentStep === 7 && !hiddenSteps.includes(7) && (
            <StepBuild
              {...sharedProps}
              intro={badgeMode ? disc?.checklist_intro ?? null : null}
              hideTestQuestion={story !== null}
              sketchProjectId={sketchProjectId}
              onPhotoSaved={badgeMode ? () => void givePhoto('build') : undefined}
              onNext={async () => {
                if (badgeMode) {
                  // The final badge, given before the last page shows the totals.
                  await giveBadge('river');
                  goToStep(8);
                  return;
                }
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

          {currentStep === 8 && story && <StoryEnding story={story} {...gameProps} hiddenSteps={hiddenSteps} badgeMode={badgeMode} />}

          {currentStep === 8 && badgeMode && disc?.improved_idea && (
            <div className="mt-4 flex flex-col gap-3">
              <ImprovedIdeaBox
                key={myProgress?.improved_idea ? 'saved' : 'open'}
                box={disc.improved_idea}
                reference={game.substSaved}
                submitted={myProgress?.improved_idea ?? null}
                onSubmit={async (text) => {
                  const r = await giveStar(3, text);
                  if (!r) return false;
                  if ([1, 2, 3].every((n) => r.stars.includes(n))) {
                    // Every requirement met: the three-star celebration, with this challenge's XP and
                    // badges (the same numbers as the challenge card).
                    const [now] = await fetchChallengeProgress([challenge.id]).catch(() => []);
                    setThreeStar({ xp: now?.xp ?? myProgress?.xp ?? null, badges: now?.badges ?? myProgress?.badges ?? [] });
                  } else if (r.is_new) {
                    setLastStar(r.stars);
                  }
                  return true;
                }}
              />
              {lastStar && <StarNotice star={3} stars={lastStar} />}
            </div>
          )}

          {currentStep === 8 && (
            <StepCelebrate
              {...sharedProps}
              completionXp={challenge.completion_xp}
              // Bonuses earned along the way count toward the total too: defining the problem (+5)
              defineXp={game.badges.includes('define') ? 5 : 0}
              // The "you solved it!" bonus after the sketch (+10).
              sketchXp={game.badges.includes('solved') ? 10 : 0}
              sketchProjectId={sketchProjectId}
              wallAlreadySubmitted={wallUnlocked}
              onWallSubmitted={handleWallSubmitted}
              onRestart={restartMission}
              badgeMode={badgeMode}
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

      {solvedCelebration && badgeMode && (
        <RewardPopup
          testId="define-celebration"
          badge={badgeOf('solved')}
          lead={
            <>
              {tStory('solved_points_1')}
              <br />
              {tStory('solved_points_2')}
              <br />
              {tStory('solved_points_3')}
            </>
          }
          title={`${tStory('solved_title_1')} ${tStory('solved_title_2')}`}
          text={tStory.rich('solved_text', { b: (chunks) => <b className="font-extrabold text-ink">{chunks}</b> })}
          xp={solvedCelebration.xp}
          primary={{
            label: tStory('solved_go'),
            onClick: () => {
              setSolvedCelebration(null);
              goToStep(5);
            },
          }}
          secondary={{
            label: tStory('enough_today'),
            onClick: () => {
              setSolvedCelebration(null);
              resumeLater();
              router.push('/challenges');
            },
          }}
        >
          {solvedCelebration.stars && (
            <div className="mb-3">
              <StarNotice star={1} stars={solvedCelebration.stars} />
            </div>
          )}
          {solvedCelebration.popi && (
            <div data-testid="popi-idea-check" aria-live="polite" className="flex items-start gap-3 rounded-[18px] bg-[#EAF5FC] p-3 text-start">
              {/* eslint-disable-next-line @next/next/no-img-element -- the guide's small cut-out */}
              <img src="/popi/popi.png" alt="" aria-hidden="true" className="h-14 w-auto shrink-0" />
              <div className="min-w-0">
                <p className="font-body text-sm font-bold text-challenge">{tStory('popi_says')}</p>
                <p className="font-body text-base font-semibold leading-snug text-ink">
                  {solvedCelebration.popi.state === 'loading'
                    ? tStory('popi_reading')
                    : solvedCelebration.popi.state === 'done'
                      ? solvedCelebration.popi.text
                      : tStory('popi_offline')}
                </p>
              </div>
            </div>
          )}
        </RewardPopup>
      )}

      {reward && (
        <RewardPopup
          testId={reward.key === 'define' ? 'quizzy-reward' : 'nature-reward'}
          badge={badgeOf(reward.key)}
          title={tStory(reward.key === 'define' ? 'quizzy_reward_title' : 'nature_reward_title')}
          text={tStory(reward.key === 'define' ? 'quizzy_reward_text' : 'nature_reward_text')}
          xp={reward.xp}
          primary={{
            label: tStory('reward_continue'),
            onClick: () => {
              const next = reward.key === 'define' ? 2 : 4;
              setReward(null);
              void goToStep(next);
            },
          }}
        />
      )}

      {solvedCelebration && !badgeMode && (
        <DefineCelebration
          variant="solved"
          xp={solvedCelebration.xp}
          popi={solvedCelebration.popi}
          again={solvedCelebration.again}
          // Back to the sketch to make the idea better (the XP is already theirs).
          onImprove={() => setSolvedCelebration(null)}
          // "That's Enough for Today": the idea is already saved; back to the Challenges page.
          onEnough={() => {
            setSolvedCelebration(null);
            if (story) updateGame((g) => ({ badges: g.badges.includes('solved') ? g.badges : [...g.badges, 'solved'] }));
            resumeLater();
            router.push('/challenges');
          }}
          onClose={() => {
            setSolvedCelebration(null);
            if (story) updateGame((g) => ({ badges: g.badges.includes('solved') ? g.badges : [...g.badges, 'solved'] }));
            goToStep(5);
          }}
        />
      )}

      {substCelebration && (
        <SubstCelebration
          badge={badgeOf('tool')}
          xp={substXp}
          toolName={substCelebration === 'tool' ? story?.tool.name ?? null : null}
          onKeepExploring={() => {
            setSubstCelebration(false);
            void goToStep(after(6));
          }}
          onEnough={() => {
            setSubstCelebration(false);
            resumeLater();
            router.push('/challenges');
          }}
        />
      )}

      {labCelebration && (
        <LabCelebration
          onPhoto={async (photo) => {
            setLabPhotoUrl(URL.createObjectURL(photo));
            if (!labCelebration.projectId) return null;
            const ok = await uploadProjectPhoto(labCelebration.projectId, photo)
              .then(() => true)
              .catch(() => false);
            if (!ok) return null;
            if (!badgeMode) return 0;
            const xp = (await givePhoto('build')) ?? 0;
            // Experiment finished and the prototype documented: the second star.
            const r = await giveStar(2);
            if (r?.is_new) setLabStars(r.stars);
            return xp;
          }}
          onDescribe={
            badgeMode
              ? async (text) => {
                  // No photo: the kid's own description documents the model instead (kept with the star).
                  const r = await giveStar(2, text);
                  if (r?.is_new) setLabStars(r.stars);
                  return !!r && r.stars.includes(2);
                }
              : undefined
          }
          star={labStars ? <StarNotice star={2} stars={labStars} /> : null}
          onKeepExploring={() => {
            setLabCelebration(null);
            setLabStars(null);
            void goToStep(6, 'tool');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onEnough={() => {
            setLabCelebration(null);
            resumeLater();
            router.push('/challenges');
          }}
        />
      )}

      {threeStar && (
        <ThreeStarCelebration xp={threeStar.xp} badges={threeStar.badges} story={story} onClose={() => setThreeStar(null)} />
      )}

      {visible && award && (
        <XpBurst
          award={award}
          stickerEmoji={story?.sticker.emoji ?? '⭐'}
          onDismiss={dismiss}
        />
      )}
    </div>
  );
}
