'use client';

import { useMemo, type ReactNode } from 'react';
import { NextIntlClientProvider, useLocale, useMessages, useNow, useTimeZone } from 'next-intl';

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
 */
export default function GuideNameMessages({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const messages = useMessages() as unknown as Messages;
  const locale = useLocale();
  const now = useNow();
  const timeZone = useTimeZone();
  // Always the same provider (only its words change), so the page never remounts.
  const swapped = useMemo(() => {
    if (!enabled) return messages;
    const overrides = (messages.template_overrides as Messages | undefined) ?? {};
    return merge(messages, overrides);
  }, [enabled, messages]);
  return (
    <NextIntlClientProvider locale={locale} messages={swapped} now={now} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
