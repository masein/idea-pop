'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { btnLime } from '@/components/ui/kit';
import { PUBLIC_PREVIEW, makeInert } from '@/lib/publicPreview';

/** Which screen: Explore and Library get their own line and a way to the missions; the
 *  signed-in homes (My Profile, the dashboards) get "We're upgrading". */
type Kind = 'explore' | 'library' | 'profile';

/**
 * Public preview: an unfinished section stays in the page, faded and out of reach, under the
 * approved Coming Soon panel (fixed, no close button). The site menu stays usable, and on
 * Explore and Library a button leads to the missions. On localhost (no preview) the page shows
 * exactly as before.
 *
 * The approved artwork keeps its logo, drawings and big heading. Its smaller lines are set as
 * live text in IDEA POP's rounded body font, the same on every Coming Soon screen.
 */
export default function ComingSoonGate({ kind, children }: { kind: Kind; children: ReactNode }) {
  if (!PUBLIC_PREVIEW) return <>{children}</>;
  return (
    <div className="relative min-h-[100dvh]" data-testid={`coming-soon-${kind}`}>
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
          <ComingSoonPanel kind={kind} />
        </div>
      </div>
    </div>
  );
}

/** IDEA POP's rounded body face (Nunito; Playpen Sans Arabic in Persian, via the :lang rule). */
const BODY_TEXT = '[font-family:var(--font-nunito)] font-semibold leading-snug text-[#2E5A3C]';
/** Covers the artwork's own small lines, in the panel's off-white. */
const COVER = 'absolute flex flex-col items-center justify-center rounded-[2em] bg-[#FEFDF9] px-[2%] text-center';

export function ComingSoonPanel({ kind }: { kind: Kind }) {
  const locale = useLocale();
  const t = useTranslations('preview');
  const fa = locale === 'fa';
  const profile = kind === 'profile';
  const title = profile ? t('profile_title') : t('section_title');
  const body = profile ? t('profile_body') : t('section_body');
  const note = kind === 'explore' ? t('explore_note') : kind === 'library' ? t('library_note') : null;
  return (
    <section
      role="status"
      aria-label={title}
      className="flex flex-col items-center gap-3 md:gap-4"
      // A bit smaller than the page, and short enough that the button below always fits.
      style={{ width: 'min(84vw, 820px, calc((100dvh - 15rem) * 1.5))' }}
    >
      <div
        className="relative w-full drop-shadow-[0_18px_40px_rgba(60,80,20,0.18)]"
        style={{ containerType: 'inline-size' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- the approved artwork, shown as it is */}
        <img
          src={fa ? '/coming-soon/coming-soon-fa.webp' : '/coming-soon/coming-soon-en.webp'}
          alt=""
          width={1536}
          height={1024}
          className="block h-auto w-full select-none"
          draggable={false}
        />
        {profile ? <ProfileWords fa={fa} title={title} body={body} /> : <SectionWords fa={fa} title={title} body={body} />}
      </div>
      {note && (
        <>
          <p
            dir={fa ? 'rtl' : 'ltr'}
            className={`max-w-[42rem] text-center ${BODY_TEXT}`}
            style={{ fontSize: 'clamp(0.9375rem, 1.6vw, 1.25rem)' }}
            data-testid="coming-soon-note"
          >
            {note}
          </p>
          <Link href="/challenges" className={btnLime} data-testid="coming-soon-missions">
            {t('explore_missions')}
          </Link>
        </>
      )}
    </section>
  );
}

// Where each artwork has its words, as a share of the picture (measured from the files).

/** Explore and Library: the artwork's heading stays; its small lines become live text. */
function SectionWords({ fa, title, body }: { fa: boolean; title: string; body: string }) {
  const area = fa
    ? { left: '9%', right: '9%', top: '58.5%', height: '16%' }
    : { left: '13.5%', right: '13.5%', top: '58.5%', height: '12%' };
  return (
    <div dir={fa ? 'rtl' : 'ltr'} className={COVER} style={{ ...area, fontSize: '1cqw' }} data-testid="coming-soon-words">
      {/* The heading is in the picture; say it for screen readers too. */}
      <h2 className="sr-only">{title}</h2>
      <p className={BODY_TEXT} style={{ fontSize: '2.7em' }}>
        {body}
      </p>
    </div>
  );
}

/** My Profile: its own heading and lines over the artwork's text area. */
function ProfileWords({ fa, title, body }: { fa: boolean; title: string; body: string }) {
  const titleEl = (size: string) => (
    <h2 className="font-display font-bold leading-tight text-[#215B34]" style={{ fontSize: size }}>
      {title}
    </h2>
  );
  const bodyEl = (
    <p className={BODY_TEXT} style={{ fontSize: '2.7em' }}>
      {body}
    </p>
  );
  // Persian: the heading and the lines below sit apart, between the light bulb and the
  // mountains, so each gets its own spot.
  if (fa) {
    return (
      <div dir="rtl" data-testid="coming-soon-words" style={{ fontSize: '1cqw' }} className="absolute inset-0">
        <div className={COVER} style={{ left: '31%', right: '25%', top: '36%', height: '18.5%' }}>
          {titleEl('3.4em')}
        </div>
        <div className={COVER} style={{ left: '9%', right: '9%', top: '58.5%', height: '16%' }}>
          {bodyEl}
        </div>
      </div>
    );
  }
  return (
    <div
      dir="ltr"
      className={`${COVER} gap-[0.6em]`}
      style={{ left: '13.5%', right: '13.5%', top: '42.5%', height: '28.5%', fontSize: '1cqw' }}
      data-testid="coming-soon-words"
    >
      {titleEl('4.4em')}
      {bodyEl}
    </div>
  );
}
