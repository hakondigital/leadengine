'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--od-accent)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-[#111827] text-white hover:bg-[#1F2937] shadow-sm active:scale-[0.98]',
        secondary:
          'bg-white text-[#374151] border border-[#E5E7EB] hover:bg-[#F9FAFB] hover:border-[#D1D5DB] shadow-sm active:scale-[0.98]',
        ghost:
          'text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6]',
        destructive:
          'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA] hover:bg-[#FEE2E2] hover:border-[#FCA5A5]',
        outline:
          'border border-[#E5E7EB] text-[#374151] hover:text-[#111827] hover:bg-[#F9FAFB] hover:border-[#D1D5DB]',
        accent:
          'bg-[var(--od-accent)] text-white hover:bg-[var(--od-accent-hover)] shadow-sm active:scale-[0.98]',
        link: 'text-[var(--od-accent-text)] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-[13px] rounded-lg',
        md: 'h-9 px-4 text-[13px] rounded-lg',
        lg: 'h-11 px-5 text-sm rounded-xl',
        xl: 'h-12 px-6 text-sm rounded-xl',
        icon: 'h-9 w-9 rounded-lg',
        'icon-sm': 'h-7 w-7 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
