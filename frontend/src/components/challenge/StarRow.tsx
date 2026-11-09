'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

/** Each star keeps its own colour, in the mission's level order: green, orange, red. */
const STAR_COLOR: Record<number, { fill: string; line: string; empty: string }> = {
  1: { fill: '#3BAA5C', line: '#22804A', empty: '#7FD4A0' },
  2: { fill: '#F2994A', line: '#B85A12', empty: '#F5B57A' },
  3: { fill: '#E5574B', line: '#A8352B', empty: '#F29A8F' },
};

/**
 * The three challenge stars: filled in its own colour when earned, an outline when not. A
 * star that fills while on screen pops gently. Its label says which stars are earned, so colour is
 * never the only signal.
 */
export default function StarRow({
  stars,
  size = 22,
  className = '',
  pop = [],
  slots = false,
}: {
  /** The star numbers earned (1–3). */
  stars: number[];
  size?: number;
  className?: string;
  /** Stars to celebrate as soon as they show (a star just earned). */
  pop?: number[];
  /** The achievement bar's stars: each is a landing spot for a star that was just earned. */
  slots?: boolean;
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
            data-achievement-slot={slots ? `star-${n}` : undefined}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={on && fresh.includes(n) ? 'star-earn' : ''}
          >
            <path
              d="M12 2.6l2.84 5.76 6.36.92-4.6 4.49 1.08 6.33L12 17.1l-5.68 2.99 1.08-6.33-4.6-4.49 6.36-.92z"
              fill={on ? STAR_COLOR[n].fill : 'none'}
              stroke={on ? STAR_COLOR[n].line : STAR_COLOR[n].empty}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
          </svg>
        );
      })}
    </span>
  );
}
