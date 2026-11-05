'use client';

import { useTranslations } from 'next-intl';
import { btnText } from '@/components/challenge/buttons';

/** A photo didn't upload: the one message for every image upload, with Try Again. */
export default function PhotoUploadError({
  message,
  busy = false,
  onRetry,
  onContinue,
  continueLabel,
}: {
  /** Replaces the photo message when what failed was saving the rest of the work. */
  message?: string;
  busy?: boolean;
  onRetry: () => void;
  /** Carry on anyway: a choice the kid makes, never a silent skip. */
  onContinue?: () => void;
  continueLabel?: string;
}) {
  const t = useTranslations('mission');
  return (
    <div role="alert" data-testid="photo-upload-failed" className="flex flex-col gap-2 rounded-xl bg-[#FFF7E0] px-4 py-3">
      <p className="font-body text-base font-semibold text-[#5a4300]">{message ?? t('photo_upload_failed')}</p>
      <div className="flex flex-wrap gap-4">
        <button type="button" data-testid="photo-upload-retry" disabled={busy} onClick={onRetry} className={`${btnText} !px-0`}>
          {busy ? t('saving') : t('photo_try_again')}
        </button>
        {onContinue && (
          <button type="button" data-testid="photo-upload-continue" disabled={busy} onClick={onContinue} className={`${btnText} !px-0`}>
            {continueLabel ?? t('sketch_continue_no_photo')}
          </button>
        )}
      </div>
    </div>
  );
}
