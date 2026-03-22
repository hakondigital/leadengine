'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  X,
  Users,
} from 'lucide-react';
import type { Lead, LeadStatus, LeadPriority } from '@/lib/database.types';
import { pipelineStages } from '@/lib/design-tokens';
import { EmptyState } from '@/components/ui/empty-state';

interface LeadTableProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  isLoading?: boolean;
}

const priorityConfig: Record<LeadPriority, { label: string; variant: 'error' | 'warning' | 'info' | 'default' }> = {
  critical: { label: 'Critical', variant: 'error' },
  high: { label: 'High', variant: 'warning' },
  medium: { label: 'Medium', variant: 'info' },
  low: { label: 'Low', variant: 'default' },
};

function ScorePopover({ lead }: { lead: Lead }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const scoreColor =
    lead.ai_score! >= 70 ? '#22C55E' : lead.ai_score! >= 40 ? '#F59E0B' : '#EF4444';
  const scoreLabel =
    lead.ai_score! >= 70 ? 'High' : lead.ai_score! >= 40 ? 'Medium' : 'Low';

  const updatePos = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // Clamp left so the 256px popover doesn't go off-screen
    const popoverWidth = 256;
    let left = rect.left + rect.width / 2;
    if (left + popoverWidth / 2 > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth / 2 - 16;
    }
    if (left - popoverWidth / 2 < 16) {
      left = popoverWidth / 2 + 16;
    }
    setPos({ top: rect.top - 8, left });
  };

  return (
    <div
      ref={triggerRef}
      className="relative flex items-center gap-1.5"
      onMouseEnter={() => { updatePos(); setOpen(true); }}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => { e.stopPropagation(); updatePos(); setOpen((v) => !v); }}
    >
      <div className="w-8 h-1 rounded-full bg-[#F5F5F5] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${lead.ai_score}%`,
            backgroundColor: scoreColor,
          }}
        />
      </div>
      <span className="text-[11px] text-[#A3A3A3] tabular-nums">{lead.ai_score}</span>

      <AnimatePresence>
        {open && (lead.ai_summary || lead.ai_recommended_action) && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[100] w-64 bg-white rounded-xl shadow-xl border border-[rgba(0,0,0,0.08)] p-3"
            style={{ top: pos.top, left: pos.left, transform: 'translate(-50%, -100%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${scoreColor}20` }}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: scoreColor }} />
              </div>
              <span className="text-[12px] font-semibold text-[#0A0A0A]">
                {scoreLabel} Quality — {lead.ai_score}/100
              </span>
            </div>

            {lead.ai_summary && (
              <p className="text-[12px] text-[#404040] leading-relaxed mb-2">{lead.ai_summary}</p>
            )}

            {lead.ai_recommended_action && (
              <div className="bg-[#F5F5F5] rounded-lg px-2.5 py-2">
                <p className="text-[11px] font-medium text-[#737373] uppercase tracking-wider mb-0.5">
                  Recommended action
                </p>
                <p className="text-[12px] text-[#0A0A0A] leading-relaxed">
                  {lead.ai_recommended_action}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function LeadTable({ leads, onLeadClick, isLoading }: LeadTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch =
      !searchQuery ||
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-16 border-b border-[rgba(0,0,0,0.04)] last:border-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + filter row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A3A3A3]" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-xl bg-[#F5F5F5] text-[13px] text-[#0A0A0A] placeholder:text-[#A3A3A3] border-0 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 transition-all"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A3A3A3] hover:text-[#404040]">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              'px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all',
              statusFilter === 'all' ? 'bg-[#0A0A0A] text-white' : 'text-[#737373] hover:bg-[#F5F5F5]'
            )}
          >
            All
          </button>
          {pipelineStages.slice(0, 4).map((stage) => (
            <button
              key={stage.id}
              onClick={() => setStatusFilter(statusFilter === stage.id ? 'all' : stage.id)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all hidden sm:block',
                statusFilter === stage.id ? 'bg-[#0A0A0A] text-white' : 'text-[#737373] hover:bg-[#F5F5F5]'
              )}
            >
              {stage.label}
            </button>
          ))}
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'No matches' : 'No leads yet'}
          description={searchQuery ? 'Try a different search.' : 'Leads will appear here when they come through your forms.'}
          action={searchQuery ? { label: 'Clear', onClick: () => { setSearchQuery(''); setStatusFilter('all'); } } : undefined}
        />
      ) : (
        /* Table container */
        <div className="rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] overflow-hidden">
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_100px_100px_80px] sm:grid-cols-[1fr_120px_140px_120px_100px_80px] lg:grid-cols-[1fr_140px_180px_140px_100px_100px_80px] gap-4 px-5 py-3 border-b border-[rgba(0,0,0,0.06)] bg-[#FAFAFA]">
            <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">Name</span>
            <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider hidden sm:block">Phone</span>
            <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider hidden lg:block">Email</span>
            <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider hidden sm:block">Location</span>
            <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">Status</span>
            <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider">Score</span>
            <span className="text-[11px] font-semibold text-[#A3A3A3] uppercase tracking-wider text-right">Time</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-[rgba(0,0,0,0.04)]">
            <AnimatePresence>
              {filteredLeads.map((lead, index) => {
                const stage = pipelineStages.find((s) => s.id === lead.status);
                const priority = priorityConfig[lead.priority] || priorityConfig.medium;

                return (
                  <motion.button
                    key={lead.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                    onClick={() => onLeadClick(lead)}
                    className="w-full text-left grid grid-cols-[1fr_100px_100px_80px] sm:grid-cols-[1fr_120px_140px_120px_100px_80px] lg:grid-cols-[1fr_140px_180px_140px_100px_100px_80px] gap-4 px-5 py-3.5 hover:bg-[rgba(0,0,0,0.015)] transition-colors duration-150 cursor-pointer items-center"
                  >
                    {/* Name + company */}
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#0A0A0A] truncate">
                        {lead.first_name} {lead.last_name}
                      </p>
                      {lead.company && (
                        <p className="text-[12px] text-[#A3A3A3] truncate mt-0.5">{lead.company}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <p className="text-[13px] text-[#737373] truncate hidden sm:block">{lead.phone || '—'}</p>

                    {/* Email */}
                    <p className="text-[13px] text-[#737373] truncate hidden lg:block">{lead.email}</p>

                    {/* Location */}
                    <p className="text-[13px] text-[#737373] truncate hidden sm:block">{lead.location || '—'}</p>

                    {/* Status */}
                    <div>
                      <Badge variant={lead.status as LeadStatus} size="sm">
                        {stage?.label}
                      </Badge>
                    </div>

                    {/* Score */}
                    <div>
                      {lead.ai_score !== null && lead.ai_score !== undefined ? (
                        <ScorePopover lead={lead} />
                      ) : (
                        <span className="text-[11px] text-[#D4D4D4]">—</span>
                      )}
                    </div>

                    {/* Time */}
                    <span className="text-[12px] text-[#A3A3A3] text-right tabular-nums">
                      {formatRelativeTime(lead.created_at)}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {filteredLeads.length > 0 && (
            <div className="px-5 py-2.5 border-t border-[rgba(0,0,0,0.04)] bg-[#FAFAFA]">
              <p className="text-[11px] text-[#A3A3A3]">
                {filteredLeads.length} of {leads.length} leads
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
