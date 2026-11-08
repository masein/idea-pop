'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { NextIntlClientProvider, useLocale, useMessages, useNow, useTimeZone } from 'next-intl';
import { isGuest } from '@/lib/api/guest';

type Messages = { [key: string]: string | Messages };

function merge(base: Messages, extra: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const b = out[k];
    out[k] = typeof v === 'object' && b && typeof b === 'object' ? merge(b, v) : v;
  }
  return out;
}

/**
 * Template challenges use a few lines of their own (messages.template_overrides). Only template
 * challenges' pages are wrapped, so the rest of the app keeps its wording.
 *
 * A guest on the public preview also gets messages.preview.guest_overrides: nothing they make
 * is saved for good, so no line may say it was.
 */
export default function GuideNameMessages({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const messages = useMessages() as unknown as Messages;
  const locale = useLocale();
  const now = useNow();
  const timeZone = useTimeZone();
  // Known only in the browser (it reads the sign-in state), so it is set after the first paint.
  const [guest, setGuest] = useState(false);
  useEffect(() => setGuest(isGuest()), []);
  // Always the same provider (only its words change), so the page never remounts.
  const swapped = useMemo(() => {
    let out = messages;
    if (enabled) out = merge(out, (messages.template_overrides as Messages | undefined) ?? {});
    if (guest) out = merge(out, ((messages.preview as Messages | undefined)?.guest_overrides as Messages | undefined) ?? {});
    return out;
  }, [enabled, guest, messages]);
  return (
    <NextIntlClientProvider locale={locale} messages={swapped} now={now} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
