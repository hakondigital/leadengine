'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { label: string; value: string }[];
  placeholder?: string;
}

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-[var(--od-text-secondary)] tracking-wide"
          >
            {label}
            {props.required && (
              <span className="text-[var(--od-accent)] ml-1">*</span>
            )}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            className={cn(
              'flex h-11 w-full appearance-none rounded-[var(--od-radius-md)] border bg-[var(--od-bg-tertiary)] px-4 pr-10 text-sm text-[var(--od-text-primary)] transition-all duration-200',
              'border-[var(--od-border-default)] hover:border-[var(--od-border-strong)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30 focus:border-[var(--od-accent)]/50',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-[#EF6C6C]/50',
              className
            )}
            ref={ref}
            aria-invalid={!!error}
            {...props}
          >
            {placeholder && (
              <option value="" className="text-[var(--od-text-muted)]">
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--od-text-muted)] pointer-events-none" />
        </div>
        {error && (
          <p className="text-xs text-[#EF6C6C] mt-1" role="alert">{error}</p>
        )}
      </div>
    );
  }
);
SelectField.displayName = 'SelectField';

export { SelectField };
