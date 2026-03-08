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
            className="block text-sm font-medium text-[var(--le-text-secondary)] tracking-wide"
          >
            {label}
            {props.required && (
              <span className="text-[var(--le-accent)] ml-1">*</span>
            )}
          </label>
        )}
        <textarea
          id={textareaId}
          className={cn(
            'flex min-h-[100px] w-full rounded-[var(--le-radius-md)] border bg-[var(--le-bg-tertiary)] px-4 py-3 text-sm text-[var(--le-text-primary)] placeholder:text-[var(--le-text-muted)] transition-all duration-200 resize-y',
            'border-[var(--le-border-default)] hover:border-[var(--le-border-strong)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--le-accent)]/30 focus:border-[var(--le-accent)]/50',
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
