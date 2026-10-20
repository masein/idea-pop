'use client';

import { useMemo, type ReactNode } from 'react';
import { NextIntlClientProvider, useLocale, useMessages, useNow, useTimeZone } from 'next-intl';

type Messages = { [key: string]: string | Messages };

function rename(value: string | Messages): string | Messages {
  if (typeof value === 'string') return value.replace(/Popi/g, 'PopAI').replace(/پاپی|پوپی/g, 'پاپ‌آی');
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, rename(v)]));
}

function merge(base: Messages, extra: Messages): Messages {
  const out: Messages = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const b = out[k];
    out[k] = typeof v === 'object' && b && typeof b === 'object' ? merge(b, v) : v;
  }
  return out;
}

/**
 * Max's challenge calls its guide PopAI (پاپ‌آی) everywhere — labels, messages, popups and
 * accessibility text — and uses a few lines of its own (messages.max_overrides). Only this
 * challenge's page is wrapped, so the rest of the app keeps its wording.
 */
export default function GuideNameMessages({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const messages = useMessages() as unknown as Messages;
  const locale = useLocale();
  const now = useNow();
  const timeZone = useTimeZone();
  // Always the same provider (only its words change), so the page never remounts.
  const swapped = useMemo(() => {
    if (!enabled) return messages;
    const overrides = (messages.max_overrides as Messages | undefined) ?? {};
    return merge(rename(messages) as Messages, overrides);
  }, [enabled, messages]);
  return (
    <NextIntlClientProvider locale={locale} messages={swapped} now={now} timeZone={timeZone}>
      {children}
    </NextIntlClientProvider>
  );
}
