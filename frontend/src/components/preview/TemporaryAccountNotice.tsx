'use client';

import { useTranslations } from 'next-intl';
import { PUBLIC_PREVIEW } from '@/lib/publicPreview';

/** Public preview: at the bottom of sign-up, before the account is made. Information only:
 *  nothing deletes or expires the account. Not shown on localhost. */
export default function TemporaryAccountNotice({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const t = useTranslations('preview');
  if (!PUBLIC_PREVIEW) return null;
  return (
    <p
      data-testid="temporary-account-notice"
      className={`mt-4 rounded-xl px-4 py-3 text-center font-body text-sm font-semibold leading-relaxed ${
        tone === 'dark' ? 'bg-white/10 text-white/85' : 'bg-[#F7FFD9] text-[#2E5A3C] ring-1 ring-[#C9E07A]'
      }`}
    >
      {t('signup_temp_notice')}
    </p>
  );
}
