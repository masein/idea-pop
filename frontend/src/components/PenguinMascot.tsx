'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import PopiAvatar from './PopiAvatar';

export interface PenguinMascotProps {
  label?: string;
  onClick?: () => void;
  className?: string;
}

export default function PenguinMascot({
  label,
  onClick,
  className = '',
}: PenguinMascotProps) {
  const t = useTranslations('mascot');
  const text = label ?? t('ask_me');
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={text}
      data-testid="floating-popi"
      className={[
        'relative flex h-14 w-14 items-end justify-center rounded-full bg-white shadow-lg ring-2 ring-challenge',
        'hover:brightness-105 active:scale-95 transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#0F3F63] focus-visible:ring-offset-2',
        className,
      ].join(' ')}
    >
      <span className="flex h-full w-full items-end justify-center overflow-hidden rounded-full" aria-hidden="true">
        <PopiAvatar size={48} />
      </span>
      <span
        aria-hidden="true"
        className="absolute -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-challenge font-body text-sm font-extrabold text-white shadow ltr:-right-1 rtl:-left-1"
      >
        ?
      </span>
    </button>
  );
}
