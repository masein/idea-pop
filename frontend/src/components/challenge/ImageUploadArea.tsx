'use client';

import { useRef, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import AssetSlot from '@/components/AssetSlot';
import { btnText } from '@/components/challenge/buttons';

/** Existing picture files only. There is no `capture` attribute: this never opens the camera. */
const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * The one image upload area for every challenge: large, clearly clickable, with a spot for the
 * upload illustration. The parent decides what choosing a file does (keep it for later, or send
 * it straight away) and shows saving, saved and failed under the picture through `children`.
 */
export default function ImageUploadArea({
  prompt,
  heading,
  description,
  previewUrl,
  onSelect,
  onRemove,
  busy = false,
  testId = 'photo',
  children,
}: {
  prompt: string;
  heading?: string;
  description?: string;
  previewUrl: string | null;
  onSelect: (file: File) => void;
  onRemove?: () => void;
  busy?: boolean;
  testId?: string;
  children?: ReactNode;
}) {
  const t = useTranslations('story');
  const inputRef = useRef<HTMLInputElement>(null);
  const [wrongType, setWrongType] = useState(false);

  function choose(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Cleared each time, so choosing the same picture again still counts.
    e.target.value = '';
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      setWrongType(true);
      return;
    }
    setWrongType(false);
    onSelect(file);
  }

  return (
    <section data-testid={`${testId}-area`} className="flex flex-col gap-3 rounded-[20px] bg-white p-4 shadow-sm">
      {heading && <h3 className="font-display text-2xl text-challenge">{heading}</h3>}
      {description && <p className="font-body text-base font-semibold text-ink">{description}</p>}
      <input
        ref={inputRef}
        autoComplete="off"
        type="file"
        accept={ACCEPT.join(',')}
        aria-label={prompt}
        data-testid={`${testId}-input`}
        onChange={choose}
        className="sr-only"
      />
      {previewUrl ? (
        <div className="flex flex-col items-center gap-3 rounded-[18px] border-2 border-[#9CC9E6] bg-tint-blue p-4">
          {/* A blob preview of the chosen picture: next/image can't size a blob. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="" data-testid={`${testId}-preview`} className="max-h-72 w-full rounded-xl object-contain" />
          <div className="flex flex-wrap justify-center gap-5">
            <button type="button" disabled={busy} data-testid={`${testId}-change`} onClick={() => inputRef.current?.click()} className={btnText}>
              {t('upload_change')}
            </button>
            {onRemove && (
              <button type="button" disabled={busy} data-testid={`${testId}-remove`} onClick={onRemove} className={btnText}>
                {t('upload_remove')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          data-testid={`${testId}-choose`}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex min-h-64 w-full flex-col items-center justify-center gap-3 rounded-[18px] border-[3px] border-dashed border-[#1A6FA6] bg-tint-blue p-6 transition-colors hover:bg-[#A9E6FB] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63]"
        >
          <span className="block h-24 w-24 shrink-0">
            <AssetSlot id="CHALLENGE-UI-UPLOAD-001" />
          </span>
          <span className="max-w-md text-center font-body text-lg font-bold leading-snug text-ink">{prompt}</span>
          <span className="rounded-pill bg-[#1A6FA6] px-6 py-2.5 font-body text-base font-extrabold text-white">{t('upload_choose')}</span>
        </button>
      )}
      {wrongType && (
        <p role="alert" data-testid={`${testId}-wrong-type`} className="rounded-xl bg-[#FFF7E0] px-4 py-3 font-body text-base font-semibold text-[#5a4300]">
          {t('upload_wrong_type')}
        </p>
      )}
      {children}
    </section>
  );
}
