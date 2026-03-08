'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--le-text-secondary)] tracking-wide"
          >
            {label}
            {props.required && (
              <span className="text-[var(--le-accent)] ml-1">*</span>
            )}
          </label>
        )}
        <input
          type={type}
          id={inputId}
          className={cn(
            'flex h-11 w-full rounded-[var(--le-radius-md)] border bg-[var(--le-bg-tertiary)] px-4 text-sm text-[var(--le-text-primary)] placeholder:text-[var(--le-text-muted)] transition-all duration-200',
            'border-[var(--le-border-default)] hover:border-[var(--le-border-strong)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--le-accent)]/30 focus:border-[var(--le-accent)]/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[#EF6C6C]/50 focus:ring-[#EF6C6C]/30 focus:border-[#EF6C6C]/50',
            className
          )}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[#EF6C6C] mt-1" role="alert">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-[var(--le-text-muted)]">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
