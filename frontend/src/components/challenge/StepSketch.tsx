'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import CaptureCard, { type CaptureData } from './CaptureCard';
import ToolSelector from './tool/ToolSelector';
import { createProject } from '@/lib/api/client';

type ChallengeDetail = import('@/lib/api/schema').components['schemas']['ChallengeDetail'];

interface StepSketchProps {
  challenge: ChallengeDetail;
  ageMode: 'young' | 'older';
  onNext: (projectId: string | null) => void;
  onBack: () => void;
}

export default function StepSketch({ challenge, ageMode, onNext, onBack }: StepSketchProps) {
  const t = useTranslations('mission');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(data: CaptureData) {
    setSubmitting(true);
    try {
      const project = await createProject({
        title: data.title || 'My sketch',
        what_i_made: data.what_i_made,
        what_i_used: data.what_i_used,
        what_was_hard: '',
        what_id_improve: '',
        challenge_id: challenge.id,
        step_type: 'sketch',
      });
      onNext(project.id);
    } catch {
      onNext(null);
    } finally {
      setSubmitting(false);
    }
  }


  // Real DTO tools are {kind, age_mode} pairs; pick this kid's age mode,
  // falling back to every authored kind if none match.
  const allTools = challenge.tools ?? [];
  const forAge = allTools.filter((t) => t.age_mode === ageMode).map((t) => t.kind);
  const toolKinds = [...new Set(forAge.length > 0 ? forAge : allTools.map((t) => t.kind))];

  return (
    <div data-testid="step-sketch" className="flex flex-col gap-4 px-4 py-6">
      <div>
        <h2 className="font-display text-2xl text-challenge">{t('sketch_heading')}</h2>
        <p className="font-body text-sm text-ink/50 mt-1">
          {challenge.sketch_prompt?.trim() || t('sketch_prompt_fallback')}
        </p>
        {challenge.sketch_guidance?.trim() && (
          <p
            data-testid="sketch-guidance"
            className="mt-2 rounded-card bg-tint-cream px-3 py-2 font-body text-sm text-ink/70"
          >
            💡 {challenge.sketch_guidance}
          </p>
        )}
      </div>

      {/* Creativity tools accordion — only when challenge includes tools */}
      {toolKinds.length > 0 && (
        <ToolSelector
          tools={toolKinds}
          topic={challenge.title}
          ageMode={ageMode}
        />
      )}

      <CaptureCard
        showExtendedFields={false}
        photoPrompt={t('sketch_photo_prompt')}
        submitLabel={t('sketch_submit')}
        ageMode={ageMode}
        onSubmit={handleSubmit}
        submitting={submitting}
        helper={{ challengeId: challenge.id, step: 6 }}
      />

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
