'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { FormStep } from '@/lib/database.types';

interface FormProgressProps {
  steps: FormStep[];
  currentStep: number;
  className?: string;
}

export function FormProgress({ steps, currentStep, className }: FormProgressProps) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {steps.map((step, index) => {
        const stepNum = index + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;

        return (
          <div key={step.id} className="flex items-center gap-1 flex-1">
            {/* Step indicator */}
            <div className="flex items-center gap-2.5 min-w-0">
              <motion.div
                className={cn(
                  'flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0 transition-colors duration-300',
                  isCompleted && 'bg-[var(--le-accent)] text-white',
                  isActive && 'bg-[var(--le-accent)]/15 text-[var(--le-accent)] ring-2 ring-[var(--le-accent)]/30',
                  !isActive && !isCompleted && 'bg-[var(--le-bg-elevated)] text-[var(--le-text-muted)]'
                )}
                layout
              >
                {isCompleted ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </motion.div>
                ) : (
                  stepNum
                )}
              </motion.div>
              <div className="hidden sm:block min-w-0">
                <p className={cn(
                  'text-xs font-medium truncate transition-colors duration-200',
                  isActive ? 'text-[var(--le-text-primary)]' : 'text-[var(--le-text-muted)]'
                )}>
                  {step.title}
                </p>
              </div>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-px bg-[var(--le-border-subtle)] mx-2 relative overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-[var(--le-accent)]"
                  initial={{ width: '0%' }}
                  animate={{ width: isCompleted ? '100%' : '0%' }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
