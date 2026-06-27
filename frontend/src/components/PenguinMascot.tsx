'use client';

import React from 'react';

export interface PenguinMascotProps {
  label?: string;
  onClick?: () => void;
  className?: string;
}

export default function PenguinMascot({
  label = 'Ask Me',
  onClick,
  className = '',
}: PenguinMascotProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={[
        'flex items-center gap-2 rounded-full bg-challenge text-white shadow-lg',
        'px-4 py-3 font-body font-semibold text-sm',
        'hover:brightness-110 active:scale-95 transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-challenge focus-visible:ring-offset-2',
        className,
      ].join(' ')}
    >
      <span className="text-xl select-none" aria-hidden="true">🐧</span>
      <span>{label}</span>
    </button>
  );
}
