'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--od-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--od-bg-primary)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-[linear-gradient(135deg,#73DFF0,#3DB8D0)] text-[var(--od-bg-dark)] hover:brightness-105 shadow-[var(--od-shadow-sm)] hover:shadow-[var(--od-shadow-md)] active:scale-[0.98]',
        secondary:
          'bg-[var(--od-bg-tertiary)] text-[var(--od-text-primary)] border border-[var(--od-border-default)] hover:bg-[var(--od-bg-elevated)] hover:border-[var(--od-border-strong)] active:scale-[0.98]',
        ghost:
          'text-[var(--od-text-secondary)] hover:text-[var(--od-text-primary)] hover:bg-[var(--od-bg-tertiary)]',
        destructive:
          'bg-[#F07F86]/10 text-[#FFB4BA] border border-[#F07F86]/20 hover:bg-[#F07F86]/16 hover:border-[#F07F86]/32',
        outline:
          'border border-[var(--od-border-default)] text-[var(--od-text-secondary)] hover:text-[var(--od-text-primary)] hover:bg-[var(--od-bg-tertiary)] hover:border-[var(--od-border-strong)]',
        accent:
          'bg-[var(--od-accent-muted)] text-[var(--od-accent-text)] border border-[rgba(79,209,229,0.22)] hover:bg-[rgba(79,209,229,0.18)] hover:border-[rgba(79,209,229,0.36)]',
        link: 'text-[var(--od-accent-text)] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-[var(--od-radius-sm)]',
        md: 'h-9 px-4 text-sm rounded-[var(--od-radius-md)]',
        lg: 'h-11 px-6 text-sm rounded-[var(--od-radius-md)]',
        xl: 'h-12 px-8 text-base rounded-[var(--od-radius-lg)]',
        icon: 'h-9 w-9 rounded-[var(--od-radius-md)]',
        'icon-sm': 'h-7 w-7 rounded-[var(--od-radius-sm)]',
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
