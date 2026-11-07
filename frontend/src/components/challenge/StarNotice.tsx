'use client';

import { useTranslations } from 'next-intl';
import StarRow from './StarRow';

/** "You earned star N!" with a one-line reason, shown where the star was earned. */
export default function StarNotice({ star, stars }: { star: 1 | 2 | 3; stars: number[] }) {
  const t = useTranslations('stars');
  return (
    <div
      data-testid={`star-notice-${star}`}
      role="status"
      className="story-pop flex items-center gap-3 rounded-[18px] bg-[#FFF7D6] px-4 py-3 text-start"
    >
      <StarRow stars={stars} size={26} pop={[star]} className="shrink-0" />
      <div className="min-w-0">
        <p className="font-body text-base font-extrabold text-[#7A5A00]">{t('earned_title', { star })}</p>
        <p className="font-body text-sm font-semibold text-ink">{t(`earned_${star}`)}</p>
      </div>
    </div>
  );
}
