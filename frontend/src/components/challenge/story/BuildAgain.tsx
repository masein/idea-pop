'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createProject } from '@/lib/api/client';
import { uploadPhotoSafely } from '@/lib/photoUpload';
import { btnPrimary, btnSecondary, btnText } from '@/components/challenge/buttons';
import ImageUploadArea from '../ImageUploadArea';
import MissionHints from '../MissionHints';
import PhotoUploadError from '../PhotoUploadError';
import { discoveryOf } from './discovery';
import { HeroReminder, IdeaHistory } from './JourneyParts';
import { Popi } from './StoryBits';
import type { ChallengeDetail, MissionStory } from './types';
import type { MissionJourney } from './useMissionJourney';

const CHECKS = ['build_check_1', 'build_check_2', 'build_check_3', 'build_check_4'] as const;
const inputClass =
  'w-full min-w-0 rounded-xl border border-[#8FA3B8] bg-white px-3 py-2 font-body text-base text-ink placeholder:text-ink/40 focus:border-challenge focus:outline-none';

/**
 * Page 8, Build, Test and Improve: what the kid has made so far, a reminder of their Nature Hero,
 * the preparation checklist, and a new version to add. A new version can build on any earlier one,
 * and each is saved as its own record, so nothing earlier is ever changed.
 */
export default function BuildAgain({
  challenge,
  story,
  partner,
  journey,
  improvedNote,
  blobUrls,
  onVersionSaved,
  onContinue,
  onBack,
}: {
  challenge: ChallengeDetail;
  story: MissionStory;
  partner: number | null | undefined;
  journey: MissionJourney;
  improvedNote: string | null;
  blobUrls: { model: string | null; sketch: string | null };
  /** A new version is saved: its words, and whether a picture went with it. */
  onVersionSaved: (note: string, withPhoto: boolean) => void;
  onContinue: () => Promise<void> | void;
  onBack: () => void;
}) {
  const t = useTranslations('story');
  const tm = useTranslations('mission');
  const disc = discoveryOf(story);
  const [checked, setChecked] = useState<number[]>([]);
  const [name, setName] = useState('');
  const [diff, setDiff] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  // A save that didn't finish: retrying reuses the record, so nothing is created twice.
  const [failed, setFailed] = useState<{ projectId: string | null } | null>(null);
  const ready = name.trim().length >= 2 && diff.trim().length >= 3;
  const hasVersions = journey.versions.length > 0 || justSaved;

  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  function pick(f: File | null) {
    setPhoto(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function finishSave(withPhoto: boolean) {
    onVersionSaved(`${name.trim()}: ${diff.trim()}`, withPhoto);
    setName('');
    setDiff('');
    pick(null);
    setFailed(null);
    setJustSaved(true);
  }

  async function save() {
    if (!ready || saving) return;
    setSaving(true);
    setJustSaved(false);
    let projectId = failed?.projectId ?? null;
    try {
      if (!projectId) {
        const p = await createProject({
          title: name.trim(),
          what_i_made: diff.trim(),
          what_i_used: '',
          what_was_hard: '',
          what_id_improve: '',
          challenge_id: challenge.id,
          step_type: 'build',
        });
        projectId = p.id;
      }
      if (photo && !(await uploadPhotoSafely(projectId, photo))) {
        setFailed({ projectId });
        return;
      }
      finishSave(!!photo);
    } catch {
      setFailed({ projectId });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div data-testid="build-again" className="flex flex-col gap-5 py-4">
      <Popi text={story.guide.build_and_test} keepLines />

      <IdeaHistory journey={journey} improvedTitle={disc?.improved_idea?.title ?? t('journey_improved')} improvedNote={improvedNote} blobUrls={blobUrls} />

      <HeroReminder story={story} partner={partner} heroName={journey.idea?.heroName} />

      <p data-testid="build-invite" className="font-display text-2xl leading-snug text-challenge">{t('build_again_invite')}</p>

      <section data-testid="build-checklist" className="flex flex-col gap-3 rounded-[20px] bg-white p-5 shadow-sm">
        {disc?.checklist_intro && <p className="font-body text-base font-semibold text-ink">{disc.checklist_intro}</p>}
        <p className="font-body text-base font-bold text-ink">{tm('build_checklist_title')}</p>
        <div className="flex flex-col gap-2">
          {CHECKS.map((key, i) => (
            <label key={key} className="flex cursor-pointer items-center gap-3 font-body text-base text-ink">
              <input
                autoComplete="off"
                type="checkbox"
                checked={checked.includes(i)}
                onChange={() => setChecked((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))}
                className="h-5 w-5 rounded accent-challenge"
              />
              <span className={checked.includes(i) ? 'text-ink/50 line-through' : ''}>{tm(key)}</span>
            </label>
          ))}
        </div>
      </section>

      <MissionHints hints={challenge.build_hints ?? []} />

      <section data-testid="new-version" className="flex flex-col gap-3">
        <h2 className="font-display text-2xl text-challenge">{t('version_heading')}</h2>
        <ImageUploadArea
          testId="version-photo"
          prompt={t('version_photo_prompt')}
          previewUrl={preview}
          busy={saving}
          onSelect={pick}
          onRemove={() => pick(null)}
        />
        <div className="flex flex-col gap-3 rounded-[20px] bg-white p-5 shadow-sm">
          <label htmlFor="version-name" className="font-body text-base font-bold text-ink">{t('version_name_label')}</label>
          <input
            id="version-name"
            data-testid="version-name"
            autoComplete="off"
            dir="auto"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <label htmlFor="version-diff" className="font-body text-base font-bold text-ink">{t('version_diff_label')}</label>
          <input
            id="version-diff"
            data-testid="version-diff"
            autoComplete="off"
            dir="auto"
            maxLength={240}
            value={diff}
            onChange={(e) => setDiff(e.target.value)}
            className={inputClass}
          />
          <button type="button" data-testid="version-save" disabled={!ready || saving} onClick={() => void save()} className={`${btnSecondary} self-start`}>
            {saving ? t('saving_short') : t('version_save')}
          </button>
          {justSaved && (
            <p data-testid="version-saved" aria-live="polite" className="rounded-xl bg-[#F3FBF5] px-3 py-2 font-body text-base font-semibold text-[#1E7A44]">
              ✓ {t('version_saved')}
            </p>
          )}
          {failed && (
            <PhotoUploadError
              message={photo ? undefined : t('version_failed')}
              busy={saving}
              onRetry={() => void save()}
              onContinue={photo && failed.projectId ? () => finishSave(false) : undefined}
            />
          )}
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className={btnText}>
          {t('back')}
        </button>
        <button
          type="button"
          data-testid="build-continue"
          disabled={saving || leaving}
          onClick={async () => {
            setLeaving(true);
            await onContinue();
            setLeaving(false);
          }}
          className={hasVersions ? btnPrimary : btnText}
        >
          {leaving ? t('saving_short') : hasVersions ? t('build_continue') : t('build_continue_skip')}
        </button>
      </div>
    </div>
  );
}
