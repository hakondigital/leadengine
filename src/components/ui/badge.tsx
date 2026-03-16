'use client';

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-[var(--od-bg-tertiary)] text-[var(--od-text-secondary)] border border-[var(--od-border-subtle)]',
        accent: 'bg-[var(--od-accent-muted)] text-[var(--od-accent-text)] border border-[rgba(79,209,229,0.22)]',
        success: 'bg-[#42D48B]/12 text-[#85F0B6] border border-[#42D48B]/22',
        warning: 'bg-[#E8A652]/12 text-[#FFD08B] border border-[#E8A652]/22',
        error: 'bg-[#F07F86]/12 text-[#FFB4BA] border border-[#F07F86]/22',
        info: 'bg-[#70A0FF]/12 text-[#B7D0FF] border border-[#70A0FF]/22',
        new: 'bg-[#70A0FF]/12 text-[#B7D0FF] border border-[#70A0FF]/22',
        reviewed: 'bg-[#A78BFA]/12 text-[#D8C9FF] border border-[#A78BFA]/22',
        contacted: 'bg-[#4FD1E5]/12 text-[#A9F0FB] border border-[#4FD1E5]/22',
        quote_sent: 'bg-[#F0B04F]/12 text-[#FFD694] border border-[#F0B04F]/22',
        won: 'bg-[#42D48B]/12 text-[#85F0B6] border border-[#42D48B]/22',
        lost: 'bg-[#F07F86]/12 text-[#FFB4BA] border border-[#F07F86]/22',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0.5 rounded-[4px]',
        md: 'text-xs px-2 py-0.5 rounded-[var(--od-radius-sm)]',
        lg: 'text-xs px-2.5 py-1 rounded-[var(--od-radius-sm)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-current shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
