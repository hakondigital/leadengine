'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-[var(--od-text-secondary)] tracking-wide"
          >
            {label}
            {props.required && (
              <span className="text-[var(--od-accent)] ml-1">*</span>
            )}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[100px] w-full rounded-[var(--od-radius-md)] border bg-[var(--od-bg-tertiary)] px-4 py-3 text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] transition-all duration-200 resize-y',
            'border-[var(--od-border-default)] hover:border-[var(--od-border-strong)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30 focus:border-[var(--od-accent)]/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-[#EF6C6C]/50',
            className
          )}
          ref={ref}
          aria-invalid={!!error}
          {...props}
        />
        {error && (
          <p className="text-xs text-[#EF6C6C] mt-1" role="alert">{error}</p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
