'use client';

import { useState } from 'react';
import CaptureCard, { type CaptureData } from './CaptureCard';
import ClassifierPanel from '@/components/ai/ClassifierPanel';
import MissionHints from './MissionHints';
import MissionHelper from './MissionHelper';

// Dark-launch flag for the scoped AI helper (server enforces the real gates).
const HELPER_ON = process.env.NEXT_PUBLIC_MISSION_HELPER === 'true';
import { createProject } from '@/lib/api/client';

// Missions whose Build & test step embeds the on-device Machine Trainer.
// Keyed off the slug to avoid a backend/schema change; a cleaner long-term
// option is an `embedded_tool` field on the BuildAndTest step (future PR).
const CLASSIFIER_SLUGS = new Set(['teach-the-machine-to-see', 'spot-the-fake']);

type ChallengeDetail = import('@/lib/api/schema').components['schemas']['ChallengeDetail'];

interface StepBuildProps {
  challenge: ChallengeDetail;
  ageMode: 'young' | 'older';
  sketchProjectId: string | null;
  onNext: () => void;
  onBack: () => void;
}

const CHECKLIST_ITEMS = [
  'Gather what you need',
  'Ask a grown-up if you need scissors or tools',
  'Find a safe place to work and test',
];

type TestResult = 'worked' | 'needs_fix' | null;

export default function StepBuild({
  challenge,
  ageMode,
  sketchProjectId,
  onNext,
  onBack,
}: StepBuildProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [testResult, setTestResult] = useState<TestResult>(null);
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

  return (
    <div data-testid="step-build" className="flex flex-col gap-4 px-4 py-6">
      <div>
        <h2 className="font-display text-2xl text-challenge">Build it &amp; test it! 🔧</h2>
      </div>

      {/* Checklist card */}
      <div data-testid="build-checklist" className="bg-white rounded-card p-4 mb-4">
        <p className="font-display text-base text-ink mb-3">Gather your materials</p>
        <div className="flex flex-col gap-2">
          {CHECKLIST_ITEMS.map((item, i) => (
            <label key={i} className="flex items-center gap-3 cursor-pointer font-body text-sm text-ink">
              <input
                type="checkbox"
                checked={checked.has(i)}
                onChange={() => toggleCheck(i)}
                className="accent-challenge w-4 h-4 rounded"
              />
              <span className={checked.has(i) ? 'line-through text-ink/40' : ''}>{item}</span>
            </label>
          ))}
        </div>
      </div>

      {/* On-device image classifier for the AI missions */}
      {CLASSIFIER_SLUGS.has(challenge.slug) && (
        <div className="mb-4">
          <ClassifierPanel />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-4">
        <MissionHints hints={challenge.build_hints ?? []} />
        {HELPER_ON && <MissionHelper challengeId={challenge.id} step={7} />}
      </div>

      {/* Test question card */}
      <div className="bg-tint-blue rounded-card p-4 text-center mb-4">
        <p className="font-display text-base text-ink mb-3">Can it do the job? 🧪</p>
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
            ✅ It worked!
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
            🔁 Needs a fix
          </button>
        </div>
        {testResult === 'worked' && (
          <p className="font-body text-sm text-ink/70 mt-3">Amazing! Now document it 📸</p>
        )}
        {testResult === 'needs_fix' && (
          <p className="font-body text-sm text-ink/70 mt-3">
            That&apos;s okay — every inventor iterates!
          </p>
        )}
      </div>

      {/* Capture card */}
      <CaptureCard
        showExtendedFields={true}
        photoPrompt="📷 Show us what you made"
        submitLabel="Mission complete! →"
        ageMode={ageMode}
        onSubmit={handleSubmit}
        submitting={submitting}
      />

      <button
        type="button"
        onClick={onBack}
        className="font-body text-sm text-ink/50 text-left mt-2"
      >
        ← Back
      </button>
    </div>
  );
}
