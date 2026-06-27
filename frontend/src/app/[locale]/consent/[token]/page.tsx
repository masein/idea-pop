'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Logo from '@/components/Logo';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { verifyConsent } from '@/lib/api/client';

type ConsentStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'error_invalid'
  | 'error_generic';

interface ConsentPageProps {
  params: Promise<{ token: string }>;
}

export default function ConsentPage({ params }: ConsentPageProps) {
  const t = useTranslations('consent');
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string>('');
  const [status, setStatus] = useState<ConsentStatus>('idle');

  const rawNickname = searchParams.get('nickname') ?? '';
  const nickname = rawNickname
    ? decodeURIComponent(rawNickname)
    : 'your child';

  useEffect(() => {
    params.then(({ token: t }) => setToken(t));
  }, [params]);

  async function handleGrant() {
    if (!token) return;
    setStatus('loading');
    try {
      await verifyConsent(token);
      setStatus('success');
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      if (message.includes('invalid') || message.includes('expired')) {
        setStatus('error_invalid');
      } else {
        setStatus('error_generic');
      }
    }
  }

  function handleRetry() {
    setStatus('idle');
  }

  return (
    <div
      className="min-h-screen bg-tint-lime flex flex-col items-center px-4 pb-12"
      data-testid="consent-page"
    >
      {/* Logo */}
      <div className="mt-8 mb-4">
        <Link href="/" aria-label="Go to Idea Pop home">
          <Logo size="md" />
        </Link>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full mx-auto mt-4">
        {/* ── Success state ─────────────────────────────────────────── */}
        {status === 'success' && (
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="font-display font-bold text-2xl text-ink mb-2">
              {t('success_heading', { nickname })}
            </h1>
            <p className="font-body text-ink/70 mb-6">{t('success_body')}</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-pill font-body font-semibold transition-all duration-150 focus-visible:outline-none select-none px-8 py-3.5 text-lg bg-explore text-white hover:brightness-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2 w-full"
            >
              Go to the app
            </Link>
          </div>
        )}

        {/* ── Invalid token error state ──────────────────────────────── */}
        {status === 'error_invalid' && (
          <div className="text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="font-display font-bold text-xl text-ink mb-2">
              Link expired
            </h1>
            <p className="font-body text-ink/70">{t('error_invalid')}</p>
          </div>
        )}

        {/* ── Generic error state ────────────────────────────────────── */}
        {status === 'error_generic' && (
          <div className="text-center">
            <div className="text-5xl mb-4">😕</div>
            <h1 className="font-display font-bold text-xl text-ink mb-2">
              Something went wrong
            </h1>
            <p className="font-body text-ink/70 mb-6">{t('error_generic')}</p>
            <Button variant="primary" className="w-full" onClick={handleRetry}>
              Try again
            </Button>
          </div>
        )}

        {/* ── Idle / loading state ───────────────────────────────────── */}
        {(status === 'idle' || status === 'loading') && (
          <div className="text-center">
            <div className="text-5xl mb-4">🌟</div>
            <h1 className="font-display font-bold text-2xl text-ink mb-2">
              {t('heading', { nickname })}
            </h1>
            <p className="font-body text-ink/70 mb-6">
              {t('body', { nickname })}
            </p>
            <Button
              variant="primary"
              size="lg"
              className="w-full mb-4"
              disabled={status === 'loading'}
              onClick={handleGrant}
              data-testid="consent-grant-btn"
            >
              {status === 'loading' ? t('granting') : t('grant')}
            </Button>
            <Link
              href="/"
              className="font-body text-sm text-ink/50 hover:text-ink transition-colors underline-offset-2 hover:underline"
            >
              {t('decline')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
