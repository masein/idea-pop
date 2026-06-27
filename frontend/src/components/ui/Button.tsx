'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-sm',
  md: 'px-6 py-2.5 text-base',
  lg: 'px-8 py-3.5 text-lg',
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-explore text-white font-semibold hover:brightness-110 active:scale-95 disabled:bg-explore/40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2',
  secondary:
    'border-2 border-ink/20 text-ink font-semibold bg-transparent hover:bg-ink/5 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-ink/40 focus-visible:ring-offset-2',
  tertiary:
    'text-explore underline-offset-2 hover:underline bg-transparent font-semibold disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-explore focus-visible:ring-offset-2 rounded-pill',
};

export function Button({
  variant = 'primary',
  size = 'md',
  disabled,
  children,
  className = '',
  ...buttonProps
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-pill font-body transition-all duration-150 focus-visible:outline-none select-none';

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${base} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...buttonProps}
    >
      {children}
    </button>
  );
}

export default Button;
