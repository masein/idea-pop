'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { btnSecondary, btnText } from '@/components/challenge/buttons';
import RewardPopup from './RewardPopup';

interface Props {
  /** Adds the photo to the kid's saved lab project; resolves the photo XP (or null if it
   *  couldn't be saved). */
  onPhoto: (photo: File) => Promise<number | null>;
  onKeepExploring: () => void;
  onEnough: () => void;
}

/** The lab is done: "What Did You Build?", an optional photo of the model (private, never
 *  published by itself), then keep exploring or stop for today. Same reward popup as the
 *  badges; the photo earns its XP once. */
export default function LabCelebration({ onPhoto, onKeepExploring, onEnough }: Props) {
  const t = useTranslations('story');
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<'none' | 'saving' | 'saved' | 'failed'>('none');
  const [xp, setXp] = useState<number | null>(null);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  return (
    <RewardPopup
      testId="lab-celebration"
      title={t('lab_cel_title')}
      text={t('lab_cel_text')}
      xp={xp}
      primary={{ label: t('lab_keep_exploring'), onClick: onKeepExploring, disabled: state === 'saving' }}
      secondary={{ label: t('enough_today'), onClick: onEnough, disabled: state === 'saving' }}
    >
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
            setState('saving');
            const got = await onPhoto(f);
            setState(got === null ? 'failed' : 'saved');
            if (got !== null) setXp((x) => (x === null ? got : x));
          }}
        />
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- the kid's own photo, a blob URL */}
            <img src={preview} alt="" data-testid="lab-photo-preview" className="max-h-40 rounded-xl object-contain" />
            <p aria-live="polite" className="font-body text-sm font-semibold text-[#1E7A44]">
              {state === 'saving' ? t('lab_photo_saving') : state === 'saved' ? t('lab_photo_saved') : state === 'failed' ? t('lab_photo_failed') : ''}
            </p>
            <button type="button" onClick={() => fileRef.current?.click()} className={btnText}>
              {t('lab_change_photo')}
            </button>
          </>
        ) : (
          <button type="button" data-testid="lab-add-photo" onClick={() => fileRef.current?.click()} className={btnSecondary}>
            📷 {t('lab_add_photo')}
          </button>
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
