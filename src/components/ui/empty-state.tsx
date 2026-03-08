'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Button } from './button';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--le-bg-tertiary)] border border-[var(--le-border-subtle)] mb-5">
        <Icon className="w-6 h-6 text-[var(--le-text-muted)]" />
      </div>
      <h3 className="text-base font-semibold text-[var(--le-text-primary)] mb-1.5 tracking-tight">
        {title}
      </h3>
      <p className="text-sm text-[var(--le-text-tertiary)] max-w-sm mb-5">
        {description}
      </p>
      {action && (
        <Button variant="accent" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}
