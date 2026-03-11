'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  Phone,
  Mail,
  MapPin,
  Sparkles,
  ArrowUpDown,
  Search,
  Filter,
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

export function LeadTable({ leads, onLeadClick, isLoading }: LeadTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

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
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-[var(--od-radius-lg)]" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Controls bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--od-text-muted)]" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-[var(--od-radius-md)] border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)]"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <Button
          variant={showFilters ? 'accent' : 'secondary'}
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
        </Button>
      </div>

      {/* Status filter pills */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className="flex flex-wrap gap-2 pb-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  statusFilter === 'all'
                    ? 'bg-[var(--od-text-primary)] text-[var(--od-bg-primary)]'
                    : 'bg-[var(--od-bg-tertiary)] text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-elevated)]'
                )}
              >
                All
              </button>
              {pipelineStages.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => setStatusFilter(stage.id)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5',
                    statusFilter === stage.id
                      ? 'text-[var(--od-bg-primary)]'
                      : 'bg-[var(--od-bg-tertiary)] text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-elevated)]'
                  )}
                  style={
                    statusFilter === stage.id
                      ? { backgroundColor: stage.color }
                      : undefined
                  }
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  {stage.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leads list */}
      {filteredLeads.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'No matches found' : 'No leads yet'}
          description={
            searchQuery
              ? 'Try a different search term or clear filters.'
              : 'When leads come through your forms, they will appear here.'
          }
          action={
            searchQuery
              ? { label: 'Clear search', onClick: () => { setSearchQuery(''); setStatusFilter('all'); } }
              : undefined
          }
        />
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filteredLeads.map((lead, index) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                onClick={() => onLeadClick(lead)}
                index={index}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Results count */}
      {filteredLeads.length > 0 && (
        <p className="text-xs text-[var(--od-text-muted)] mt-4 text-center">
          Showing {filteredLeads.length} of {leads.length} leads
        </p>
      )}
    </div>
  );
}

function LeadRow({
  lead,
  onClick,
  index,
}: {
  lead: Lead;
  onClick: () => void;
  index: number;
}) {
  const stage = pipelineStages.find((s) => s.id === lead.status);
  const priority = priorityConfig[lead.priority] || priorityConfig.medium;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={onClick}
      className="w-full text-left rounded-[var(--od-radius-lg)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] p-4 hover:border-[var(--od-border-default)] hover:bg-[var(--od-bg-secondary)]/80 transition-all duration-200 group cursor-pointer"
    >
      <div className="flex items-center gap-4">
        {/* Status indicator */}
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: stage?.color }}
        />

        {/* Lead info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-[var(--od-text-primary)] truncate">
              {lead.first_name} {lead.last_name}
            </h3>
            <Badge variant={lead.status as LeadStatus} size="sm">
              {stage?.label}
            </Badge>
            <Badge variant={priority.variant} size="sm">
              {priority.label}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-[var(--od-text-tertiary)]">
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              <span className="truncate max-w-[140px]">{lead.email}</span>
            </span>
            {lead.phone && (
              <span className="hidden sm:flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {lead.phone}
              </span>
            )}
            {lead.location && (
              <span className="hidden md:flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {lead.location}
              </span>
            )}
          </div>

          {/* AI summary preview */}
          {lead.ai_summary && (
            <div className="flex items-start gap-1.5 mt-2">
              <Sparkles className="w-3 h-3 text-[var(--od-accent)] mt-0.5 shrink-0" />
              <p className="text-xs text-[var(--od-text-tertiary)] line-clamp-1">
                {lead.ai_summary}
              </p>
            </div>
          )}
        </div>

        {/* Right side */}
        <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-[var(--od-text-muted)]">
            {formatRelativeTime(lead.created_at)}
          </span>
          {lead.ai_score !== null && lead.ai_score !== undefined && (
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-1.5 rounded-full bg-[var(--od-bg-elevated)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${lead.ai_score}%`,
                    backgroundColor:
                      lead.ai_score >= 70 ? '#4ADE80' : lead.ai_score >= 40 ? '#F59E0B' : '#EF6C6C',
                  }}
                />
              </div>
              <span className="text-[10px] text-[var(--od-text-muted)] w-5 text-right">
                {lead.ai_score}
              </span>
            </div>
          )}
        </div>

        <ChevronRight className="w-4 h-4 text-[var(--od-text-muted)] group-hover:text-[var(--od-text-tertiary)] transition-colors shrink-0" />
      </div>
    </motion.button>
  );
}

