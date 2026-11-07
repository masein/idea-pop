'use client';

import { useContext, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import CaptureCard, { type CaptureData } from './CaptureCard';
import ToolSelector, { isToolKey } from './tool/ToolSelector';
import { attachSketchToIdea, createProject } from '@/lib/api/client';
import { uploadPhotoSafely } from '@/lib/photoUpload';
import PhotoUploadError from './PhotoUploadError';
import { showsSketchTutorial } from '@/lib/challenges/sketchTutorial';
import { GAME_BY_SLUG } from './gameEmbeds';
import { btnPrimary, btnText } from '@/components/challenge/buttons';
import AssetSlot, { AssetScope } from '@/components/AssetSlot';

type ChallengeDetail = import('@/lib/api/schema').components['schemas']['ChallengeDetail'];

/** A save that didn't finish: what is needed to retry it or to carry on. */
interface FailedSave {
  projectId: string | null;
  data: CaptureData;
  idea: string;
  saved: SavedIdea;
}

export interface SavedIdea {
  title: string;
  description: string;
  photo: File | null;
}

interface StepSketchProps {
  challenge: ChallengeDetail;
  ageMode: 'young' | 'older';
  /** `idea`: the kid's own words about the idea, for Popi's check; `saved`: what they
   *  saved (name, words, photo), so later steps can build on it. */
  onNext: (projectId: string | null, idea?: string, saved?: SavedIdea) => void;
  onBack: () => void;
  /** Story missions teach their tool in the chapter-5½ power-up instead. */
  hideTools?: boolean;
  /** Story sketch: what still needs doing before the idea can be saved (null when ready). */
  blockedHint?: string | null;
  /** Story challenges: the idea's name and submit wording, and the words of the idea so far. */
  guide?: { nameLabel: string; submitLabel: string; description: string; videoUrl?: string | null } | null;
}

export default function StepSketch({ challenge, ageMode, onNext, onBack, hideTools = false, blockedHint = null, guide = null }: StepSketchProps) {
  const t = useTranslations('mission');
  const scope = useContext(AssetScope);
  const game = GAME_BY_SLUG[challenge.slug];
  // The hook must run unconditionally; the namespace is only read when a game exists.
  const tg = useTranslations(game?.i18nNs ?? 'qtree');
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState<FailedSave | null>(null);
  // What was just saved: closing the popup and pressing Submit again doesn't save it twice.
  const lastSaved = useRef<{ title: string; photo: File | null; projectId: string; idea: string; saved: SavedIdea } | null>(null);

  async function handleSubmit(data: CaptureData) {
    const again = lastSaved.current;
    if (again && again.title === data.title && again.photo === (data.photo ?? null)) {
      onNext(again.projectId, again.idea, again.saved);
      return;
    }
    setSubmitting(true);
    setFailed(null);
    const description = guide ? guide.description.trim() || data.title : data.what_i_made;
    const idea = [data.title, description, data.what_i_used].map((x) => x?.trim()).filter(Boolean).join('. ');
    const saved: SavedIdea = { title: data.title, description, photo: data.photo ?? null };
    let projectId = failed?.projectId ?? null;
    try {
      // A retry reuses what already saved, so nothing is created twice.
      const project = projectId ? { id: projectId } : await createProject({
        title: data.title || t('default_sketch_title'),
        what_i_made: description,
        what_i_used: data.what_i_used,
        what_was_hard: '',
        what_id_improve: '',
        challenge_id: challenge.id,
        step_type: 'sketch',
      });
      projectId = project.id;
      // The sketch joins the kid's saved idea for this challenge: one record, no copy.
      if (challenge.story) await attachSketchToIdea(challenge.id, project.id, data.title).catch(() => {});
      // The photo is private and optional, but losing one is never silent: the kid can retry
      // or carry on without it.
      if (data.photo && !(await uploadPhotoSafely(project.id, data.photo))) {
        setFailed({ projectId: project.id, data, idea, saved });
        return;
      }
      lastSaved.current = { title: data.title, photo: data.photo ?? null, projectId: project.id, idea, saved };
      onNext(project.id, idea, saved);
    } catch {
      setFailed({ projectId, data, idea, saved });
    } finally {
      setSubmitting(false);
    }
  }

  /** Game missions: the "sketch" is the game state itself — save its text
   *  snapshot as the project (feeds the celebrate/Ideas-Wall flow) instead of
   *  a photo. Never blocks progression. */
  async function handleGameContinue() {
    if (!game) return;
    setSubmitting(true);
    const snapshot = game.buildSnapshot(tg);
    try {
      const project = await createProject({
        title: tg('project_title'),
        what_i_made: snapshot ?? tg('project_untried'),
        what_i_used: '',
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
  // Kinds without a tool UI yet (e.g. brainstorm) are skipped.
  const toolKinds = [...new Set(forAge.length > 0 ? forAge : allTools.map((t) => t.kind))].filter(isToolKey);

  return (
    <div data-testid="step-sketch" className="flex flex-col gap-4 px-4 py-6">
      <div>
        <h2 className="font-display text-2xl text-challenge">{t('sketch_heading')}</h2>
        <p className="mt-1 font-body text-lg font-semibold leading-snug text-ink">
          {challenge.story ? t('sketch_ready') : challenge.sketch_prompt?.trim() || t('sketch_prompt_fallback')}
        </p>
        {/* The paper-and-photo instruction contradicts the on-screen games. */}
        {!game && !challenge.story && (
          <p
            data-testid="sketch-instruction"
            className="mt-2 rounded-card bg-tint-blue px-3 py-2 font-body text-sm text-ink/80"
          >
            {t('sketch_instruction')}
          </p>
        )}
        {!challenge.story && challenge.sketch_guidance?.trim() && (
          <p
            data-testid="sketch-guidance"
            className="mt-2 rounded-card bg-tint-cream px-3 py-2 font-body text-sm text-ink/70"
          >
            <AssetSlot id="CHALLENGE-UI-003" variant="dot" />{challenge.sketch_guidance}
          </p>
        )}
      </div>

      {/* The tutorial, in the first few challenges: how to sketch on paper and add labels. */}
      {challenge.story && !game && showsSketchTutorial(challenge) && (
        <div data-testid="sketch-tutorial" className="aspect-video w-full max-w-xl self-center overflow-hidden rounded-[18px] bg-white">
          {guide?.videoUrl ? (
            <video src={guide.videoUrl} controls playsInline className="h-full w-full object-cover" />
          ) : (
            <AssetSlot id={`${scope ?? 'MAX'}-SKETCH-VIDEO-001`} />
          )}
        </div>
      )}

      {/* Creativity tools accordion — only when challenge includes tools */}
      {!hideTools && toolKinds.length > 0 && (
        <ToolSelector
          tools={toolKinds}
          topic={challenge.title}
          ageMode={ageMode}
        />
      )}

      {game ? (
        <>
          {/* The plan IS the game state — no photo capture here. */}
          <game.Panel defaultOpen />
          <button
            type="button"
            data-testid={`${game.testIdPrefix}-sketch-continue`}
            onClick={() => void handleGameContinue()}
            disabled={submitting}
            className={`${btnPrimary} w-full`}
          >
            {submitting ? t('saving') : tg('sketch_continue')}
          </button>
        </>
      ) : (
        <CaptureCard
          showExtendedFields={false}
          photoPrompt={challenge.story ? t('sketch_upload_prompt') : t('sketch_photo_prompt')}
          submitLabel={guide?.submitLabel ?? t('sketch_submit')}
          ageMode={ageMode}
          onSubmit={handleSubmit}
          submitting={submitting}
          helper={{ challengeId: challenge.id, step: 6 }}
          nameOnly={!!challenge.story}
          titleLabel={guide?.nameLabel ?? (challenge.story ? t('name_your_idea') : undefined)}
          ideaName={!!guide}
          blockedHint={blockedHint}
        />
      )}

      {failed && (
        <PhotoUploadError
          message={failed.data.photo ? undefined : t('sketch_save_failed')}
          busy={submitting}
          onRetry={() => void handleSubmit(failed.data)}
          onContinue={() => onNext(failed.projectId, failed.idea, { ...failed.saved, photo: null })}
          continueLabel={failed.data.photo ? t('sketch_continue_no_photo') : t('sketch_continue_anyway')}
        />
      )}

      <button
        type="button"
        onClick={onBack}
        className={`${btnText} mt-2 self-start`}
      >
        {t('back')}
      </button>
    </div>
  );
}
