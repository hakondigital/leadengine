'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: { value: number; label: string };
  icon: LucideIcon;
  color: string;
  index?: number;
}

export function StatCard({ label, value, change, icon: Icon, color, index = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-[var(--od-radius-lg)] border border-[var(--od-border-default)] bg-white p-5 hover:shadow-[0_4px_12px_rgba(28,42,58,0.08)] transition-all duration-200 group"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl border transition-transform duration-200 group-hover:scale-105"
          style={{
            backgroundColor: `${color}10`,
            borderColor: `${color}20`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {change && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full',
              change.value >= 0
                ? 'text-[#4ADE80] bg-[#4ADE80]/10'
                : 'text-[#EF6C6C] bg-[#EF6C6C]/10'
            )}
          >
            {change.value >= 0 ? '+' : ''}
            {change.value}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-[var(--od-text-primary)] tracking-tight">
          {value}
        </p>
        <p className="text-xs text-[var(--od-text-tertiary)] mt-0.5">
          {label}
          {change && (
            <span className="text-[var(--od-text-muted)]"> &middot; {change.label}</span>
          )}
        </p>
      </div>
    </motion.div>
  );
}
