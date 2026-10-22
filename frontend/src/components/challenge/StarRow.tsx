'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * The three challenge stars: solid gold when earned, an outline when not. A star that turns
 * gold while on screen pops gently. Its label says which stars are earned, so colour is
 * never the only signal.
 */
export default function StarRow({
  stars,
  size = 22,
  className = '',
  pop = [],
}: {
  /** The star numbers earned (1–3). */
  stars: number[];
  size?: number;
  className?: string;
  /** Stars to celebrate as soon as they show (a star just earned). */
  pop?: number[];
}) {
  const t = useTranslations('stars');
  const seen = useRef<number[] | null>(null);
  const [fresh, setFresh] = useState<number[]>(pop);
  const key = [...stars].sort().join(',');
  useEffect(() => {
    const now = key ? key.split(',').map(Number) : [];
    // The first render only shows; later ones pop the stars that are new.
    if (seen.current) setFresh(now.filter((s) => !seen.current!.includes(s)));
    seen.current = now;
  }, [key]);
  const count = stars.filter((s) => s >= 1 && s <= 3).length;
  return (
    <span
      role="img"
      aria-label={t('aria', { count })}
      data-testid="star-row"
      data-stars={count}
      className={`inline-flex items-center gap-0.5 ${className}`}
    >
      {[1, 2, 3].map((n) => {
        const on = stars.includes(n);
        return (
          <svg
            key={n}
            data-testid={`star-${n}`}
            data-earned={on}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={on && fresh.includes(n) ? 'star-earn' : ''}
          >
            <path
              d="M12 2.6l2.84 5.76 6.36.92-4.6 4.49 1.08 6.33L12 17.1l-5.68 2.99 1.08-6.33-4.6-4.49 6.36-.92z"
              fill={on ? '#FFC21A' : 'none'}
              stroke={on ? '#D99A00' : '#8A99A8'}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}
