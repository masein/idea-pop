'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import CaptureCard, { type CaptureData } from './CaptureCard';
import ClassifierPanel from '@/components/ai/ClassifierPanel';
import AnimationPanel from '@/components/ai/AnimationPanel';
import QuestionTreePanel from '@/components/ai/QuestionTreePanel';
import MissionHints from './MissionHints';
import MissionHelper from './MissionHelper';
import { ANIMATION_SLUGS, CLASSIFIER_SLUGS, QTREE_SLUG } from './toolSlugs';
import { snapshotText } from '@/lib/ai/questionTreeStorage';

// Dark-launch flag for the scoped AI helper (server enforces the real gates).
const HELPER_ON = process.env.NEXT_PUBLIC_MISSION_HELPER === 'true';
import { createProject } from '@/lib/api/client';

type ChallengeDetail = import('@/lib/api/schema').components['schemas']['ChallengeDetail'];

interface StepBuildProps {
  challenge: ChallengeDetail;
  ageMode: 'young' | 'older';
  sketchProjectId: string | null;
  onNext: () => void;
  onBack: () => void;
}

const CHECKLIST_KEYS = ['build_check_1', 'build_check_2', 'build_check_3'] as const;

type TestResult = 'worked' | 'needs_fix' | null;

export default function StepBuild({
  challenge,
  ageMode,
  sketchProjectId,
  onNext,
  onBack,
}: StepBuildProps) {
  const t = useTranslations('mission');
  const tq = useTranslations('qtree');
  const isQtree = challenge.slug === QTREE_SLUG;
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [testResult, setTestResult] = useState<TestResult>(null);
  // Brainstorm-with-Popi CTA opens this step's helper and scrolls to it.
  const [helperSignal, setHelperSignal] = useState(0);
  const helperRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggleCheck(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  async function handleSubmit(data: CaptureData) {
    setSubmitting(true);
    try {
      await createProject({
        title: data.title || 'My build',
        what_i_made: data.what_i_made,
        what_i_used: data.what_i_used,
        what_was_hard: data.what_was_hard ?? '',
        what_id_improve: data.what_id_improve ?? '',
        challenge_id: challenge.id,
        step_type: 'build',
      });
    } catch {
      // never block progression
    } finally {
      setSubmitting(false);
      onNext();
    }
  }

  /** Guess-who mission: "Mission complete" saves the tree's text snapshot as
   *  the build project (no photo) — same never-block shape as handleSubmit. */
  async function handleQtreeComplete() {
    setSubmitting(true);
    const snapshot = snapshotText({
      question: (q) => tq(`q_${q}`),
      animal: (id) => tq(`animal_${id}`),
      bestLine: (count) => tq('best_line', { count }),
    });
    try {
      await createProject({
        title: tq('project_title'),
        what_i_made: snapshot ?? tq('project_untried'),
        what_i_used: '',
        what_was_hard: '',
        what_id_improve: '',
        challenge_id: challenge.id,
        step_type: 'build',
      });
    } catch {
      // never block progression
    } finally {
      setSubmitting(false);
      onNext();
    }
  }

  return (
    <div data-testid="step-build" className="flex flex-col gap-4 px-4 py-6">
      <div>
        <h2 className="font-display text-2xl text-challenge">{t('build_heading')}</h2>
      </div>

      {/* Checklist card */}
      <div data-testid="build-checklist" className="bg-white rounded-card p-4 mb-4">
        <p className="font-display text-base text-ink mb-3">{t('build_checklist_title')}</p>
        <div className="flex flex-col gap-2">
          {CHECKLIST_KEYS.map((key, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer font-body text-sm text-ink">
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() => toggleCheck(i)}
                className="accent-challenge w-4 h-4 rounded"
              />
              <span className={checked.has(i) ? 'line-through text-ink/40' : ''}>{t(key)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* On-device image classifier for the AI missions */}
      {CLASSIFIER_SLUGS.has(challenge.slug) && (
        <div className="mb-4">
          <ClassifierPanel defaultOpen />
        </div>
      )}

      {/* On-device Animation Studio for the animation mission */}
      {ANIMATION_SLUGS.has(challenge.slug) && (
        <div className="mb-4">
          <AnimationPanel defaultOpen />
        </div>
      )}

      {/* On-device Question Tree game for the guess-who mission */}
      {isQtree && (
        <div className="mb-4">
          <QuestionTreePanel defaultOpen />
        </div>
      )}

      <div ref={helperRef} className="mb-4 flex flex-col gap-4">
        <MissionHints hints={challenge.build_hints ?? []} />
        {HELPER_ON && (
          <MissionHelper challengeId={challenge.id} step={7} openSignal={helperSignal} />
        )}
      </div>

      {/* Test question card */}
      <div className="bg-tint-blue rounded-card p-4 text-center mb-4">
        <p className="font-display text-base text-ink mb-3">{t('test_question')}</p>
        <div className="flex gap-3 justify-center">
          <button
            data-testid="test-worked"
            type="button"
            onClick={() => setTestResult('worked')}
            className={`font-body text-sm px-4 py-2 rounded-card border-2 transition-all ${
              testResult === 'worked'
                ? 'bg-explore text-white border-explore'
                : 'bg-white text-ink border-explore/40'
            }`}
          >
            {t('test_worked')}
          </button>
          <button
            data-testid="test-needs-fix"
            type="button"
            onClick={() => setTestResult('needs_fix')}
            className={`font-body text-sm px-4 py-2 rounded-card border-2 transition-all ${
              testResult === 'needs_fix'
                ? 'bg-amber-400 text-white border-amber-400'
                : 'bg-white text-ink border-amber-300'
            }`}
          >
            {t('test_needs_fix')}
          </button>
        </div>
        {testResult === 'worked' && (
          <p className="font-body text-sm text-ink/70 mt-3">{t('test_worked_note')}</p>
        )}
        {testResult === 'needs_fix' && (
          <p className="font-body text-sm text-ink/70 mt-3">
            {t('test_needs_fix_note')}
          </p>
        )}
      </div>

      {/* Capture card — the guess-who mission shares its TREE, not a photo:
          completing saves the tree's text snapshot as the project instead. */}
      {isQtree ? (
        <button
          type="button"
          data-testid="qtree-mission-complete"
          disabled={testResult === null || submitting}
          onClick={() => void handleQtreeComplete()}
          className="bg-challenge text-white font-display text-lg px-6 py-3 rounded-card w-full disabled:opacity-40"
        >
          {submitting ? t('saving') : t('build_submit')}
        </button>
      ) : (
        <CaptureCard
          showExtendedFields={true}
          photoPrompt={t('build_photo_prompt')}
          submitLabel={t('build_submit')}
          ageMode={ageMode}
          onSubmit={handleSubmit}
          submitting={submitting}
          onBrainstorm={() => {
            setHelperSignal((s) => s + 1);
            helperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        />
      )}

      <button
        type="button"
        onClick={onBack}
        className="font-body text-sm text-ink/50 text-left mt-2"
      >
        {t('back')}
      </button>
    </div>
  );
}
