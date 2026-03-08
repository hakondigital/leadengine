'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--le-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--le-bg-primary)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-[#2F3E4F] text-white hover:bg-[#3A4D60] shadow-[var(--le-shadow-sm)] hover:shadow-[var(--le-shadow-md)] active:scale-[0.98]',
        secondary:
          'bg-white text-[var(--le-text-primary)] border border-[var(--le-border-default)] hover:bg-[var(--le-bg-tertiary)] hover:border-[var(--le-border-strong)] active:scale-[0.98]',
        ghost:
          'text-[var(--le-text-secondary)] hover:text-[var(--le-text-primary)] hover:bg-[var(--le-bg-tertiary)]',
        destructive:
          'bg-[#E8636C]/8 text-[#E8636C] border border-[#E8636C]/15 hover:bg-[#E8636C]/15 hover:border-[#E8636C]/25',
        outline:
          'border border-[var(--le-border-default)] text-[var(--le-text-secondary)] hover:text-[var(--le-text-primary)] hover:bg-[var(--le-bg-tertiary)] hover:border-[var(--le-border-strong)]',
        accent:
          'bg-[var(--le-accent-muted)] text-[var(--le-accent-text)] border border-[rgba(79,209,229,0.2)] hover:bg-[rgba(79,209,229,0.15)] hover:border-[rgba(79,209,229,0.3)]',
        link: 'text-[var(--le-accent-text)] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-[var(--le-radius-sm)]',
        md: 'h-9 px-4 text-sm rounded-[var(--le-radius-md)]',
        lg: 'h-11 px-6 text-sm rounded-[var(--le-radius-md)]',
        xl: 'h-12 px-8 text-base rounded-[var(--le-radius-lg)]',
        icon: 'h-9 w-9 rounded-[var(--le-radius-md)]',
        'icon-sm': 'h-7 w-7 rounded-[var(--le-radius-sm)]',
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
