'use client';

import { useTranslations } from 'next-intl';

/**
 * The one X for every popup, in the corner of the popup (its parent needs `relative`). Closing
 * only hides the popup: nothing saved is touched and the page underneath stays as it was.
 */
export default function ModalClose({ onClose, testId = 'modal-close' }: { onClose: () => void; testId?: string }) {
  const t = useTranslations('story');
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClose}
      aria-label={t('modal_close')}
      className="absolute end-3 top-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-[#8FA3B8] bg-white text-lg font-bold text-[#1F2A33] shadow-sm transition-colors hover:bg-[#EAF5FC] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63]"
    >
      <span aria-hidden="true">✕</span>
    </button>
  );
}
