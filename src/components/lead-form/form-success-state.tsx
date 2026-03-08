'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormSuccessStateProps {
  title: string;
  message: string;
  className?: string;
}

export function FormSuccessState({ title, message, className }: FormSuccessStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex flex-col items-center justify-center py-12 px-6 text-center', className)}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        className="flex items-center justify-center w-16 h-16 rounded-full bg-[#4ADE80]/10 border border-[#4ADE80]/20 mb-6"
      >
        <CheckCircle2 className="w-8 h-8 text-[#4ADE80]" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className="text-2xl font-semibold text-[var(--le-text-primary)] tracking-tight mb-2"
      >
        {title}
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="text-sm text-[var(--le-text-tertiary)] max-w-md leading-relaxed"
      >
        {message}
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.3 }}
        className="mt-8 flex items-center gap-2 text-xs text-[var(--le-text-muted)]"
      >
        <div className="w-1.5 h-1.5 rounded-full bg-[#4ADE80] animate-pulse" />
        Confirmation email sent
      </motion.div>
    </motion.div>
  );
}
