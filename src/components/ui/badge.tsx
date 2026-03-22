'use client';

import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-[#F3F4F6] text-[#374151]',
        accent: 'bg-[#EEF2FF] text-[#4F46E5]',
        success: 'bg-[#ECFDF5] text-[#059669]',
        warning: 'bg-[#FFFBEB] text-[#D97706]',
        error: 'bg-[#FEF2F2] text-[#DC2626]',
        info: 'bg-[#EEF2FF] text-[#4F46E5]',
        new: 'bg-[#EEF2FF] text-[#4F46E5]',
        reviewed: 'bg-[#F5F3FF] text-[#7C3AED]',
        contacted: 'bg-[#ECFEFF] text-[#0891B2]',
        quote_sent: 'bg-[#FFFBEB] text-[#D97706]',
        won: 'bg-[#ECFDF5] text-[#059669]',
        lost: 'bg-[#FEF2F2] text-[#DC2626]',
      },
      size: {
        sm: 'text-[10px] px-1.5 py-0.5 rounded-md',
        md: 'text-[11px] px-2 py-0.5 rounded-md',
        lg: 'text-xs px-2.5 py-1 rounded-lg',
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
