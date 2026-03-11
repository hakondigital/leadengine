'use client';

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-[var(--od-bg-tertiary)] text-[var(--od-text-secondary)] border border-[var(--od-border-subtle)]',
        accent: 'bg-[var(--od-accent-muted)] text-[var(--od-accent-text)] border border-[rgba(79,209,229,0.2)]',
        success: 'bg-[#34C77B]/8 text-[#1F9B5A] border border-[#34C77B]/15',
        warning: 'bg-[#E8963C]/8 text-[#C47A2C] border border-[#E8963C]/15',
        error: 'bg-[#E8636C]/8 text-[#C44E56] border border-[#E8636C]/15',
        info: 'bg-[#5B8DEF]/8 text-[#4070D0] border border-[#5B8DEF]/15',
        new: 'bg-[#5B8DEF]/8 text-[#4070D0] border border-[#5B8DEF]/15',
        reviewed: 'bg-[#8B7CF6]/8 text-[#6B5CD6] border border-[#8B7CF6]/15',
        contacted: 'bg-[#4FD1E5]/8 text-[#2DA8BC] border border-[#4FD1E5]/15',
        quote_sent: 'bg-[#F0A030]/8 text-[#C48020] border border-[#F0A030]/15',
        won: 'bg-[#34C77B]/8 text-[#1F9B5A] border border-[#34C77B]/15',
        lost: 'bg-[#E8636C]/8 text-[#C44E56] border border-[#E8636C]/15',
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
