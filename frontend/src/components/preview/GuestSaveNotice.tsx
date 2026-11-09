'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { GUEST_SAVE_EVENT, isGuest } from '@/lib/api/guest';
import { markPopupOpen } from '@/lib/characters';

/**
 * Public preview, guest play: when a guest saves an idea (or anything else), this explains
 * once that it is kept only for this browser session, then the mission carries on. The save
 * itself waits until the guest taps OK, so no "saved" message ever shows before it.
 */
export default function GuestSaveNotice() {
  const t = useTranslations('preview');
  const [done, setDone] = useState<(() => void) | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isGuest()) return;
    const onSave = (e: Event) => {
      const detail = (e as CustomEvent<{ done: () => void }>).detail;
      e.preventDefault(); // we show it: the save waits for the OK
      setDone(() => detail.done);
    };
    window.addEventListener(GUEST_SAVE_EVENT, onSave);
    return () => window.removeEventListener(GUEST_SAVE_EVENT, onSave);
  }, []);

  useEffect(() => {
    if (done) okRef.current?.focus();
  }, [done]);
  // No character introduction over this notice.
  useEffect(() => {
    if (!done) return;
    markPopupOpen(true);
    return () => markPopupOpen(false);
  }, [done]);

  if (!done) return null;
  const ok = () => {
    done();
    setDone(null);
  };
  // On the body, so no transformed parent can pull the fixed backdrop out of place.
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/50 p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="guest-save-text"
      data-testid="guest-save-notice"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
        <p id="guest-save-text" className="mb-6 font-body text-lg font-bold leading-relaxed text-ink">
          {t('guest_save_notice')}
        </p>
        <button
          ref={okRef}
          type="button"
          onClick={ok}
          data-testid="guest-save-ok"
          className="min-h-11 rounded-pill bg-[#1A6FA6] px-8 py-2.5 font-body text-base font-extrabold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63] focus-visible:ring-offset-2"
        >
          {t('guest_save_ok')}
        </button>
      </div>
    </div>,
    document.body,
  );
}
