'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import MissionHints from './MissionHints';
import MissionHelper from './MissionHelper';

// Dark-launch flag for the scoped AI helper (server enforces the real gates).
const HELPER_ON = process.env.NEXT_PUBLIC_MISSION_HELPER === 'true';

type ChallengeDetail = import('@/lib/api/schema').components['schemas']['ChallengeDetail'];

interface StepSkillProps {
  challenge: ChallengeDetail;
  ageMode: 'young' | 'older';
  onNext: () => void;
  onBack: () => void;
}

export default function StepSkill({
  challenge,
  ageMode: _ageMode,
  onNext,
  onBack,
}: StepSkillProps) {
  const t = useTranslations('mission');
  const [toastVisible, setToastVisible] = useState(false);

  const handleOpenLesson = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  return (
    <div data-testid="step-skill" className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-2xl text-challenge">{t('skill_heading')}</h2>
        <p className="font-body text-sm text-ink/50">{t('skill_optional')}</p>
      </div>

      {challenge.skill_lesson_id ? (
        <div
          data-testid="skill-lesson-card"
          className="bg-white rounded-card shadow-sm p-4 flex items-center gap-4"
        >
          <span className="text-4xl shrink-0">📚</span>

          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <p className="font-display text-base text-ink">{t('skill_lesson_title')}</p>
            <span dir="ltr" className="bg-library/10 text-library text-xs px-2 py-0.5 rounded-full w-fit">
              {t('xp_chip', { xp: 10 })}
            </span>
          </div>

          <button
            onClick={handleOpenLesson}
            className="shrink-0 bg-library text-white font-body text-sm font-semibold px-4 py-2 rounded-card hover:opacity-90 active:opacity-80 transition-opacity"
          >
            {t('skill_lesson_btn')}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-card shadow-sm p-4">
          <p className="font-body text-sm text-ink/50">
            {t('skill_none')}
          </p>
        </div>
      )}

      <MissionHints hints={challenge.skill_hints ?? []} />

      {HELPER_ON && <MissionHelper challengeId={challenge.id} step={5} />}

      {toastVisible && (
        <div
          role="status"
          aria-live="polite"
          className="bg-white rounded-card shadow-md border border-library/20 p-3 text-center"
        >
          <p className="font-body text-sm text-ink">
            {t('skill_toast')}
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 pt-2">
        <button
          onClick={onNext}
          className="w-full sm:w-auto bg-challenge text-white font-body text-sm font-semibold px-6 py-3 rounded-card shadow-sm hover:opacity-90 active:opacity-80 transition-opacity"
        >
          {t('continue_sketch')}
        </button>

        <button
          data-testid="skip-skill"
          onClick={onNext}
          className="text-challenge font-body text-sm hover:underline transition-all"
        >
          {t('skip_to_idea')}
        </button>

        <button
          onClick={onBack}
          className="font-body text-sm text-ink/50 hover:text-ink transition-colors"
        >
          {t('back')}
        </button>
      </div>
    </div>
  );
}
