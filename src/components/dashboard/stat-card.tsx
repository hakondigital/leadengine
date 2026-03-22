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
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-2xl bg-white p-6 group
                 border border-[rgba(0,0,0,0.06)]
                 hover:border-[rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]
                 transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          <p className="text-[13px] font-medium text-[#737373]">
            {label}
          </p>
        </div>
        <Icon className="w-4 h-4 text-[#A3A3A3] group-hover:text-[#737373] transition-colors" />
      </div>

      <div className="flex items-end gap-2.5">
        <p className="text-[2rem] font-semibold text-[#0A0A0A] tracking-[-0.03em] leading-none"
           style={{ fontFamily: 'var(--font-display, inherit)' }}>
          {value}
        </p>
        {change && (
          <span
            className={cn(
              'text-[11px] font-semibold px-1.5 py-0.5 rounded-md mb-1',
              change.value >= 0
                ? 'text-[#059669] bg-[#ECFDF5]'
                : 'text-[#DC2626] bg-[#FEF2F2]'
            )}
          >
            {change.value >= 0 ? '+' : ''}{change.value}%
          </span>
        )}
      </div>

      {change && (
        <p className="text-[11px] text-[#A3A3A3] mt-1.5">{change.label}</p>
      )}
    </motion.div>
  );
}
