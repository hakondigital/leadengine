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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-2xl bg-white border border-[#E5E9F0] p-6 group
                 hover:border-[#D1D5DB] hover:shadow-[0_4px_16px_rgba(16,24,40,0.06)]
                 transition-all duration-300"
    >
      {/* Subtle gradient accent at top */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}40)` }}
      />

      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-medium text-[#6B7280] tracking-wide uppercase">
          {label}
        </p>
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl transition-transform duration-200 group-hover:scale-110"
          style={{ backgroundColor: `${color}0D` }}
        >
          <Icon className="w-[18px] h-[18px]" style={{ color }} />
        </div>
      </div>

      <div className="flex items-end gap-2">
        <p className="text-3xl font-bold text-[#111827] tracking-tight leading-none">
          {value}
        </p>
        {change && (
          <span
            className={cn(
              'text-xs font-semibold px-2 py-0.5 rounded-full mb-1',
              change.value >= 0
                ? 'text-[#059669] bg-[#D1FAE5]'
                : 'text-[#DC2626] bg-[#FEE2E2]'
            )}
          >
            {change.value >= 0 ? '+' : ''}
            {change.value}%
          </span>
        )}
      </div>

      {change && (
        <p className="text-[11px] text-[#9CA3AF] mt-1">{change.label}</p>
      )}
    </motion.div>
  );
}
