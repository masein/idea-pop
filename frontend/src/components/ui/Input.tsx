'use client';

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({
  label,
  error,
  icon,
  id,
  className = '',
  ...inputProps
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1 font-body">
      {label && (
        <label htmlFor={inputId} className="text-sm font-semibold text-ink/80">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute inset-y-0 ltr:left-3 rtl:right-3 flex items-center text-ink/40">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          aria-invalid={!!error}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          className={[
            'w-full rounded-card border bg-white py-3 text-ink placeholder:text-ink/40',
            'transition-shadow duration-150',
            'focus:outline-none focus:ring-2 focus:ring-explore focus:ring-offset-1',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-ink/20',
            icon ? 'ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4' : 'px-4',
            className,
          ].join(' ')}
          {...inputProps}
        />
      </div>
      {error && (
        <p
          id={inputId ? `${inputId}-error` : undefined}
          role="alert"
          className="text-xs text-red-500 ltr:pl-1 rtl:pr-1"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default Input;
