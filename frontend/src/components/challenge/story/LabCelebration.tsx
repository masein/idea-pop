'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { btnSecondary, btnText } from '@/components/challenge/buttons';
import PhotoUploadError from '../PhotoUploadError';
import RewardPopup from './RewardPopup';

interface Props {
  /** Adds the photo to the kid's saved lab project; resolves the photo XP (or null if it
   *  couldn't be saved). */
  onPhoto: (photo: File) => Promise<number | null>;
  onKeepExploring: () => void;
  onEnough: () => void;
  /** No photo? The kid describes the model in words instead (resolves true when saved). */
  onDescribe?: (text: string) => Promise<boolean>;
  /** The star this documentation earned, shown once it is given. */
  star?: ReactNode;
}

/** The lab is done: "What Did You Build?", an optional photo of the model (private, never
 *  published by itself), then keep exploring or stop for today. Same reward popup as the
 *  badges; the photo earns its XP once. */
export default function LabCelebration({ onPhoto, onKeepExploring, onEnough, onDescribe, star = null }: Props) {
  const t = useTranslations('story');
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<'none' | 'saving' | 'saved' | 'failed'>('none');
  const [xp, setXp] = useState<number | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  // The words-instead-of-a-photo box (only when the page offers it).
  const [describing, setDescribing] = useState(false);
  const [words, setWords] = useState('');
  const [wordsState, setWordsState] = useState<'none' | 'saving' | 'saved' | 'failed'>('none');
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function send(f: File) {
    setState('saving');
    const got = await onPhoto(f);
    setState(got === null ? 'failed' : 'saved');
    if (got !== null) setXp((x) => (x === null ? got : x));
  }

  return (
    <RewardPopup
      testId="lab-celebration"
      title={t('lab_cel_title')}
      text={t('lab_cel_text')}
      xp={xp}
      primary={{ label: t('lab_keep_exploring'), onClick: onKeepExploring, disabled: state === 'saving' }}
      secondary={{ label: t('enough_today'), onClick: onEnough, disabled: state === 'saving' }}
    >
      {star && <div className="mb-3">{star}</div>}
      <div className="flex flex-col items-center gap-2 rounded-[18px] bg-[#EAF5FC] p-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t('lab_add_photo')}
          data-testid="lab-photo-input"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setPreview(URL.createObjectURL(f));
            setPhoto(f);
            await send(f);
          }}
        />
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- the kid's own photo, a blob URL */}
            <img src={preview} alt="" data-testid="lab-photo-preview" className="max-h-40 rounded-xl object-contain" />
            <p aria-live="polite" className="font-body text-sm font-semibold text-[#1E7A44]">
              {state === 'saving' ? t('lab_photo_saving') : state === 'saved' ? t('lab_photo_saved') : ''}
            </p>
            {state === 'failed' && photo && <PhotoUploadError onRetry={() => void send(photo)} />}
            <button type="button" disabled={state === 'saving'} onClick={() => fileRef.current?.click()} className={btnText}>
              {t('lab_change_photo')}
            </button>
          </>
        ) : (
          <button type="button" data-testid="lab-add-photo" onClick={() => fileRef.current?.click()} className={btnSecondary}>
            {t('lab_add_photo')}
          </button>
        )}
        {onDescribe && !preview && wordsState !== 'saved' && (
          describing ? (
            <form
              data-testid="lab-describe"
              className="flex w-full flex-col gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (words.trim().length < 3) return;
                setWordsState('saving');
                setWordsState((await onDescribe(words.trim())) ? 'saved' : 'failed');
              }}
            >
              <label htmlFor="lab-describe-input" className="font-body text-sm font-bold text-ink">
                {t('lab_describe_label')}
              </label>
              <textarea
                id="lab-describe-input"
                rows={3}
                maxLength={600}
                dir="auto"
                value={words}
                onChange={(e) => setWords(e.target.value)}
                placeholder={t('lab_describe_placeholder')}
                className="w-full resize-none rounded-lg border border-[#8FA3B8] bg-white px-3 py-2 font-body text-base text-ink focus:border-challenge focus:outline-none"
              />
              <button type="submit" data-testid="lab-describe-save" disabled={words.trim().length < 3 || wordsState === 'saving'} className={btnSecondary}>
                {wordsState === 'saving' ? t('lab_photo_saving') : t('lab_describe_save')}
              </button>
              {wordsState === 'failed' && <p className="font-body text-sm font-semibold text-[#9A3328]">{t('lab_describe_failed')}</p>}
            </form>
          ) : (
            <button type="button" data-testid="lab-describe-open" onClick={() => setDescribing(true)} className={btnText}>
              {t('lab_no_photo')}
            </button>
          )
        )}
        {wordsState === 'saved' && (
          <p data-testid="lab-describe-saved" aria-live="polite" className="font-body text-sm font-semibold text-[#1E7A44]">
            ✓ {t('lab_describe_saved')}
          </p>
        )}
        <p className="font-body text-xs text-[#4A5560]">{t('photo_private_note')}</p>
        <p className="font-body text-xs font-semibold text-[#4A5560]">{t('photo_bonus_note')}</p>
      </div>
      <p data-testid="lab-cel-message" className="mt-3 font-body text-base font-bold leading-relaxed text-ink">
        {t('lab_cel_done_1')}
        <br />
        {t('lab_cel_done_2')}
        <br />
        {t('lab_cel_done_3')}
      </p>
    </RewardPopup>
  );
}
