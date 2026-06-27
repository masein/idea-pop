import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';

export default async function ParentOnboardingPage() {
  const t = await getTranslations('onboarding.parent');

  return (
    <div
      data-testid="parent-onboarding"
      className="flex flex-col items-center w-full"
    >
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md mt-6 flex flex-col items-center text-center">
        <div className="w-16 h-16 rounded-full bg-explore flex items-center justify-center mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="white"
            className="w-8 h-8"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <h1 className="font-display text-2xl text-ink mb-2">{t('heading')}</h1>
        <p className="text-sm text-ink/60 font-body mb-8">{t('subhead')}</p>

        <Link
          href="/dashboard/parent"
          className="inline-flex items-center justify-center gap-2 rounded-pill font-body font-semibold transition-all duration-150 bg-explore text-white hover:brightness-110 active:scale-95 px-8 py-3.5 text-lg w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2"
        >
          {t('cta')}
        </Link>
      </div>
    </div>
  );
}
