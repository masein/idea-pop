import React from 'react';

export type LogoSize = 'sm' | 'md' | 'lg';

export interface LogoProps {
  size?: LogoSize;
  showWordmark?: boolean;
}

const sizeMap: Record<LogoSize, { badge: string; text: string }> = {
  sm: { badge: 'w-8 h-8 text-xl', text: 'text-base' },
  md: { badge: 'w-11 h-11 text-2xl', text: 'text-xl' },
  lg: { badge: 'w-16 h-16 text-4xl', text: 'text-3xl' },
};

export default function Logo({ size = 'md', showWordmark = true }: LogoProps) {
  const { badge, text } = sizeMap[size];

  return (
    <div className="inline-flex items-center gap-2" data-testid="logo">
      <div
        className={`${badge} rounded-full bg-explore flex items-center justify-center flex-shrink-0`}
        aria-hidden="true"
      >
        <span className="select-none">🌳</span>
      </div>
      {showWordmark && (
        <span className={`font-display font-bold text-ink tracking-wide ${text}`}>
          IDEA POP
        </span>
      )}
    </div>
  );
}
