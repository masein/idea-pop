'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { requestApprovalEmail, submitIdea } from '@/lib/api/client';
import { btnPrimary, btnSecondary } from '@/components/challenge/buttons';

type Phase = 'idle' | 'working' | 'in_review' | 'email_sent' | 'not_sent' | 'no_contact';

/**
 * "Share on the Idea Wall" never publishes straight away: an adult approves first. A kid whose
 * sharing is already approved sends the idea for review; otherwise we email their adult and
 * only say "sent" when the server confirms the email went out. The idea stays private (and
 * saved) whatever happens.
 */
export default function ShareForApproval({
  challengeId,
  projectId,
  onSubmitted,
}: {
  challengeId: string;
  projectId: string | null;
  onSubmitted: () => void;
}) {
  const t = useTranslations('story');
  const key = `wallPending_${challengeId}`;
  const [phase, setPhase] = useState<Phase>('idle');
  const [caption, setCaption] = useState('');
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key) as Phase | null;
      if (saved === 'in_review' || saved === 'email_sent') setPhase(saved);
    } catch {
      /* ignore */
    }
  }, [key]);
  const remember = (p: Phase) => {
    setPhase(p);
    try {
      if (p === 'in_review' || p === 'email_sent') localStorage.setItem(key, p);
    } catch {
      /* ignore */
    }
  };

  async function share() {
    setPhase('working');
    if (projectId) {
      try {
        await submitIdea(challengeId, projectId, caption);
        remember('in_review');
        onSubmitted();
        return;
      } catch (err: unknown) {
        const restricted = err instanceof Error && (err as Error & { code?: string }).code === 'restricted';
        if (!restricted) {
          setPhase('not_sent');
          return;
        }
      }
    }
    const status = await requestApprovalEmail();
    if (status === 'sent') remember('email_sent');
    else if (status === 'no_contact') setPhase('no_contact');
    else setPhase('not_sent');
  }

  const waiting = phase === 'in_review' || phase === 'email_sent';
  return (
    <section data-testid="share-for-approval" className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-sm">
      <p className="font-body text-base font-bold text-ink">{t('share_title')}</p>
      <p className="font-body text-base text-ink/80">{t('share_explain')}</p>

      {!waiting && (
        <>
          <textarea
            data-testid="wall-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder={t('share_caption')}
            rows={2}
            dir="auto"
            className="w-full resize-none rounded-card border border-ink/20 px-3 py-2 font-body text-base focus:outline-none focus:ring-2 focus:ring-challenge"
          />
          <button type="button" data-testid="wall-submit-btn" onClick={() => void share()} disabled={phase === 'working'} className={btnPrimary}>
            {phase === 'working' ? t('saving_short') : t('share_button')}
          </button>
        </>
      )}

      <div aria-live="polite" className="flex flex-col gap-2">
        {phase === 'email_sent' && (
          <p data-testid="share-email-sent" className="rounded-xl bg-[#F3FBF5] px-3 py-2 font-body text-base font-semibold text-[#1E7A44]">
            {t('share_email_sent')}
          </p>
        )}
        {phase === 'in_review' && (
          <p data-testid="share-in-review" className="rounded-xl bg-[#F3FBF5] px-3 py-2 font-body text-base font-semibold text-[#1E7A44]">
            {t('share_in_review')}
          </p>
        )}
        {waiting && (
          <p data-testid="share-awaiting" className="self-start rounded-pill bg-[#FFF5D1] px-3 py-1 font-body text-sm font-extrabold text-[#6b4d00]">
            {t('share_awaiting')}
          </p>
        )}
        {phase === 'not_sent' && (
          <div data-testid="share-not-sent" className="flex flex-col gap-2 rounded-xl bg-[#FFF7E0] px-3 py-2">
            <p className="font-body text-base text-[#5a4300]">{t('share_not_sent')}</p>
            <button type="button" data-testid="share-retry" onClick={() => void share()} className={`${btnSecondary} self-start`}>
              {t('share_retry')}
            </button>
          </div>
        )}
        {phase === 'no_contact' && (
          <p data-testid="share-no-contact" className="rounded-xl bg-[#FFF7E0] px-3 py-2 font-body text-base text-[#5a4300]">
            {t('share_no_contact')}
          </p>
        )}
      </div>
    </section>
  );
}
