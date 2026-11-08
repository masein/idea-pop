'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { PUBLIC_PREVIEW, makeInert } from '@/lib/publicPreview';

type Variant = 'section' | 'profile';

/**
 * Public preview: an unfinished section stays in the page, faded and out of reach, under the
 * approved Coming Soon panel (fixed, no close button). The site menu stays usable. On localhost
 * (no preview) the page shows exactly as before.
 *
 * Explore and Library show the approved artwork as it is. My Profile (and the other signed-in
 * homes) shows the same artwork with its own words set in the artwork's text area.
 */
export default function ComingSoonGate({ variant = 'section', children }: { variant?: Variant; children: ReactNode }) {
  if (!PUBLIC_PREVIEW) return <>{children}</>;
  return (
    <div className="relative min-h-[100dvh]" data-testid={`coming-soon-${variant}`}>
      {/* The page behind: faded, softened, and unreachable by mouse, touch and keyboard. */}
      <div
        ref={makeInert}
        aria-hidden="true"
        className="pointer-events-none select-none opacity-40 blur-[1.5px] saturate-50"
      >
        {children}
      </div>
      <div className="absolute inset-0 bg-[#F7FFD9]/55" aria-hidden="true" />
      <div className="absolute inset-0">
        <div className="sticky top-0 flex h-[100dvh] items-center justify-center p-4 md:p-8">
          <ComingSoonPanel variant={variant} />
        </div>
      </div>
    </div>
  );
}

export function ComingSoonPanel({ variant }: { variant: Variant }) {
  const locale = useLocale();
  const t = useTranslations('preview');
  const fa = locale === 'fa';
  const title = variant === 'profile' ? t('profile_title') : t('section_title');
  const body = variant === 'profile' ? t('profile_body') : t('section_body');
  return (
    <section
      role="status"
      aria-label={title}
      className="relative w-full max-w-[min(92vw,960px)] drop-shadow-[0_18px_40px_rgba(60,80,20,0.18)]"
      style={{ containerType: 'inline-size' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- the approved artwork, shown as it is */}
      <img
        src={fa ? '/coming-soon/coming-soon-fa.webp' : '/coming-soon/coming-soon-en.webp'}
        alt={variant === 'profile' ? '' : `${title} ${body}`}
        width={1536}
        height={1024}
        className="block h-auto w-full select-none"
        draggable={false}
      />
      {variant === 'profile' && <ProfileWords fa={fa} title={title} body={body} />}
    </section>
  );
}

/** My Profile's own words over the artwork's text area, in the artwork's colours. */
function ProfileWords({ fa, title, body }: { fa: boolean; title: string; body: string }) {
  // Where each artwork has its words (as a share of the picture), measured from the files.
  // English: one block. Persian: the title and the lines below sit apart, between the
  // light bulb and the mountains, so each gets its own spot.
  const box = 'absolute flex flex-col items-center justify-center rounded-[2em] bg-[#FEFDF9] px-[2%] text-center';
  const titleEl = (size: string) => (
    <h2 className="font-display font-bold leading-tight text-[#215B34]" style={{ fontSize: size }}>
      {title}
    </h2>
  );
  const bodyEl = (
    <p className="font-body font-semibold leading-snug text-[#2E5A3C]" style={{ fontSize: '2.3em' }}>
      {body}
    </p>
  );
  if (fa) {
    return (
      <div dir="rtl" data-testid="coming-soon-profile-words" style={{ fontSize: '1cqw' }} className="absolute inset-0">
        <div className={box} style={{ left: '31%', right: '25%', top: '36%', height: '18.5%' }}>
          {titleEl('3.4em')}
        </div>
        <div className={box} style={{ left: '9%', right: '9%', top: '58.5%', height: '16%' }}>
          {bodyEl}
        </div>
      </div>
    );
  }
  return (
    <div
      dir="ltr"
      className={`${box} gap-[0.6em]`}
      style={{ left: '13.5%', right: '13.5%', top: '42.5%', height: '28.5%', fontSize: '1cqw' }}
      data-testid="coming-soon-profile-words"
    >
      {titleEl('4.4em')}
      {bodyEl}
    </div>
  );
}
