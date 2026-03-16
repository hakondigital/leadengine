'use client';

import { useMemo, useState, type ElementType } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { pipelineStages } from '@/lib/design-tokens';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  ChevronRight,
  Clock,
  Filter,
  Mail,
  MapPin,
  Phone,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type { Lead, LeadPriority, LeadStatus } from '@/lib/database.types';

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

  const queueSummary = useMemo(() => {
    return {
      readyNow: filteredLeads.filter((lead) => (lead.ai_score || 0) >= 70).length,
      newLeads: filteredLeads.filter((lead) => lead.status === 'new').length,
      needsFollowUp: filteredLeads.filter((lead) => {
        if (['won', 'lost', 'new'].includes(lead.status)) return false;
        return !lead.follow_up_date;
      }).length,
    };
  }, [filteredLeads]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="skeleton h-28 rounded-[var(--od-radius-lg)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
              Queue controls
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-[var(--od-text-primary)]">
              Keep the lead queue obvious and actionable.
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--od-text-tertiary)]">
              Search fast, filter by state, then open a lead straight into the operator workflow.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
            <QueueSummaryStat label="Ready now" value={`${queueSummary.readyNow}`} />
            <QueueSummaryStat label="New" value={`${queueSummary.newLeads}`} />
            <QueueSummaryStat
              label="Needs follow-up"
              value={`${queueSummary.needsFollowUp}`}
              tone={queueSummary.needsFollowUp > 0 ? 'warning' : 'default'}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--od-text-muted)]" />
            <input
              type="text"
              placeholder="Search the queue..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-11 w-full rounded-[var(--od-radius-md)] border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] pl-10 pr-10 text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] transition-all focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--od-text-muted)] transition-colors hover:text-[var(--od-text-secondary)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <Button
            variant={showFilters ? 'accent' : 'secondary'}
            size="md"
            onClick={() => setShowFilters((current) => !current)}
            className="xl:min-w-[140px]"
          >
            <Filter className="h-3.5 w-3.5" />
            {showFilters ? 'Hide filters' : 'Filter queue'}
          </Button>
        </div>

        <AnimatePresence initial={false}>
          {showFilters ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusFilterChip
                  active={statusFilter === 'all'}
                  label="All stages"
                  onClick={() => setStatusFilter('all')}
                />
                {pipelineStages.map((stage) => (
                  <StatusFilterChip
                    key={stage.id}
                    active={statusFilter === stage.id}
                    label={stage.label}
                    color={stage.color}
                    onClick={() => setStatusFilter(stage.id)}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      {filteredLeads.length === 0 ? (
        <EmptyState
          icon={Users}
          title={searchQuery ? 'No queue matches' : 'No leads in the queue'}
          description={
            searchQuery
              ? 'Try another search term or clear the stage filter.'
              : 'As soon as leads enter Odyssey they will appear here ready for the agent workflow.'
          }
          action={
            searchQuery || statusFilter !== 'all'
              ? {
                  label: 'Clear filters',
                  onClick: () => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredLeads.map((lead, index) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                index={index}
                onClick={() => onLeadClick(lead)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {filteredLeads.length > 0 ? (
        <p className="text-xs text-[var(--od-text-muted)]">
          Showing {filteredLeads.length} of {leads.length} leads
        </p>
      ) : null}
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
  const stage = pipelineStages.find((item) => item.id === lead.status);
  const priority = priorityConfig[lead.priority] || priorityConfig.medium;
  const agentSignal = getAgentSignal(lead);
  const lastTouch = lead.last_contacted_at
    ? `Last touch ${formatRelativeTime(lead.last_contacted_at)}`
    : 'No contact logged yet';
  const followUpMoment = lead.follow_up_date
    ? `Follow up ${formatRelativeTime(lead.follow_up_date)}`
    : 'No follow-up scheduled';

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      onClick={onClick}
      className="group w-full rounded-[24px] border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] p-4 text-left transition-all hover:border-[var(--od-border-default)] hover:bg-[rgba(255,255,255,0.03)] sm:p-5"
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={lead.status as LeadStatus} size="sm">
              {stage?.label ?? 'Active'}
            </Badge>
            <Badge variant={priority.variant} size="sm">
              {priority.label} priority
            </Badge>
            {lead.ai_score !== null && lead.ai_score !== undefined ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(79,209,229,0.2)] bg-[var(--od-accent-muted)] px-2.5 py-1 text-[11px] font-medium text-[var(--od-accent-text)]">
                <Sparkles className="h-3 w-3" />
                AI score {lead.ai_score}
              </span>
            ) : null}
            <span className="text-[11px] text-[var(--od-text-muted)]">
              Added {formatRelativeTime(lead.created_at)}
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h3 className="text-base font-semibold tracking-tight text-[var(--od-text-primary)]">
                {lead.first_name} {lead.last_name}
              </h3>
              <p className="mt-1 text-sm text-[var(--od-text-tertiary)]">
                {[lead.company, lead.service_type, lead.location].filter(Boolean).join(' / ') || 'Lead ready for review'}
              </p>
            </div>

            <div className="rounded-full border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] px-3 py-1.5 text-xs text-[var(--od-text-secondary)]">
              {lastTouch}
            </div>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[20px] border border-[rgba(79,209,229,0.16)] bg-[var(--od-accent-muted)] p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[var(--od-accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-accent-text)]">
                  Agent recommendation
                </span>
              </div>
              <p className="mt-3 text-sm font-medium leading-7 text-[var(--od-text-secondary)]">{agentSignal}</p>
              {lead.ai_summary ? (
                <p className="mt-2 line-clamp-2 text-xs leading-6 text-[var(--od-text-tertiary)]">
                  {lead.ai_summary}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <LeadMetaCard
                icon={lead.phone ? Phone : Mail}
                label="Contact"
                value={lead.phone || lead.email}
              />
              <LeadMetaCard
                icon={lead.follow_up_date ? Clock : MapPin}
                label={lead.follow_up_date ? 'Next follow-up' : 'Location'}
                value={lead.follow_up_date ? followUpMoment : lead.location || 'No location set'}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 xl:min-w-[130px] xl:flex-col xl:items-end xl:justify-start">
          <span className="text-xs text-[var(--od-text-muted)]">{lead.source || 'Manual entry'}</span>
          <span className="inline-flex items-center gap-2 text-sm font-medium text-[var(--od-text-primary)]">
            Open workspace
            <ChevronRight className="h-4 w-4 text-[var(--od-text-muted)] transition-colors group-hover:text-[var(--od-text-secondary)]" />
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function LeadMetaCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[18px] border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-[var(--od-text-muted)]" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--od-text-muted)]">
          {label}
        </span>
      </div>
      <p className="mt-2 truncate text-sm text-[var(--od-text-secondary)]">{value}</p>
    </div>
  );
}

function QueueSummaryStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'warning';
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border p-3',
        tone === 'warning'
          ? 'border-[#E8A652]/20 bg-[#E8A652]/10'
          : 'border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)]'
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--od-text-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-[var(--od-text-primary)]">{value}</p>
    </div>
  );
}

function StatusFilterChip({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
        active
          ? 'bg-[var(--od-text-primary)] text-[var(--od-bg-primary)]'
          : 'bg-[var(--od-bg-tertiary)] text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-elevated)]'
      )}
      style={active && color ? { backgroundColor: color, color: '#07111B' } : undefined}
    >
      {color ? <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: active ? '#07111B' : color }} /> : null}
      {label}
    </button>
  );
}

function getAgentSignal(lead: Lead) {
  if (lead.ai_recommended_action) return lead.ai_recommended_action;

  switch (lead.status) {
    case 'new':
      return 'Make first contact and qualify intent while response speed is still high.';
    case 'reviewed':
      return 'Confirm fit, gather missing context, and move the lead into active contact.';
    case 'contacted':
      return 'Keep momentum alive with a concrete next step instead of another passive check-in.';
    case 'quote_sent':
      return 'Protect the quote. Follow up with urgency, objection handling, and a clear close path.';
    case 'won':
      return 'This lead is already closed. Shift the agent toward review, referral, and lifecycle follow-up.';
    case 'lost':
      return 'Treat this as a recovery candidate only if there is a compelling re-entry angle.';
    default:
      return 'Open the workspace and decide the next operator action.';
  }
}
