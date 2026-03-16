'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { DailyGamePlan } from '@/components/dashboard/daily-game-plan';
import { GettingStartedChecklist } from '@/components/dashboard/getting-started';
import { LeadDetailDrawer } from '@/components/dashboard/lead-detail-drawer';
import { LeadTable } from '@/components/dashboard/lead-table';
import { RevenueGapCloser } from '@/components/dashboard/revenue-gap-closer';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLeads } from '@/hooks/use-leads';
import { useOrganization } from '@/hooks/use-organization';
import type { Lead, LeadStatus, LeadWithRelations } from '@/lib/database.types';
import { pipelineStages } from '@/lib/design-tokens';
import {
  ArrowRight,
  Brain,
  Calendar,
  Inbox,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export default function DashboardPage() {
  const { organization, loading: orgLoading } = useOrganization();
  const {
    leads,
    loading: leadsLoading,
    updateLeadStatus,
    updateLeadPriority,
    fetchLeadDetail,
    addNote,
  } = useLeads(organization?.id);
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loading = orgLoading || leadsLoading;

  const stats = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter((lead) => lead.status === 'new').length;
    const active = leads.filter((lead) => !['won', 'lost'].includes(lead.status)).length;
    const avgScore = Math.round(
      leads.reduce((sum, lead) => sum + (lead.ai_score || 0), 0) / (total || 1)
    );
    const revenue = leads
      .filter((lead) => lead.status === 'won' && lead.won_value)
      .reduce((sum, lead) => sum + (lead.won_value || 0), 0);
    const hotLeads = leads.filter((lead) => (lead.ai_score || 0) >= 70).length;
    const needsFollowUp = leads.filter((lead) => {
      if (['won', 'lost', 'new'].includes(lead.status)) return false;
      return !lead.follow_up_date;
    }).length;

    return { total, newLeads, active, avgScore, revenue, hotLeads, needsFollowUp };
  }, [leads]);

  const queueLeads = useMemo(() => {
    return [...leads]
      .sort((a, b) => {
        const scoreDelta = (b.ai_score || 0) - (a.ai_score || 0);
        if (scoreDelta !== 0) return scoreDelta;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      })
      .slice(0, 12);
  }, [leads]);

  const stageSummary = useMemo(() => {
    return pipelineStages.map((stage) => ({
      ...stage,
      count: leads.filter((lead) => lead.status === stage.id).length,
    }));
  }, [leads]);

  const handleLeadClick = async (lead: Lead) => {
    const fullLead = await fetchLeadDetail(lead.id);
    if (fullLead) {
      setSelectedLead(fullLead);
      setDrawerOpen(true);
    }
  };

  const handleLeadIdClick = async (leadId: string) => {
    const fullLead = await fetchLeadDetail(leadId);
    if (fullLead) {
      setSelectedLead(fullLead);
      setDrawerOpen(true);
    }
  };

  const handleStatusChange = async (leadId: string, status: LeadStatus, wonValue?: number) => {
    await updateLeadStatus(leadId, status, wonValue);
    if (selectedLead?.id === leadId) {
      const updated = await fetchLeadDetail(leadId);
      if (updated) setSelectedLead(updated);
    }
  };

  const handlePriorityChange = async (leadId: string, priority: string) => {
    await updateLeadPriority(leadId, priority);
  };

  const handleAddNote = async (leadId: string, content: string) => {
    await addNote(leadId, content);
    const updated = await fetchLeadDetail(leadId);
    if (updated) setSelectedLead(updated);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--od-border-subtle)] bg-[rgba(7,17,27,0.82)] backdrop-blur-xl">
        <div className="px-4 py-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--od-accent-text)]">
                24/7 Agent Command
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-[var(--od-text-primary)] lg:text-3xl">
                Odyssey should open on action, not information.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--od-text-tertiary)]">
                Prioritise what the agent is handling now, what needs a human decision,
                and which leads are most likely to move. The interface should feel like
                an active operating surface from the first screen.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-full border border-[rgba(79,209,229,0.24)] bg-[var(--od-accent-muted)] px-3 py-2 text-xs font-semibold text-[var(--od-accent-text)]">
                <Sparkles className="h-3.5 w-3.5" />
                Agent active
              </div>
              <Button asChild size="sm">
                <Link href="/dashboard/tools/strategy">
                  Open Agent Console
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="sm">
                <Link href="/dashboard/leads">
                  Open Lead Queue
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-6 px-4 py-6 lg:px-6">
        {loading ? (
          <div className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
            <Skeleton className="h-[320px] rounded-[var(--od-radius-xl)]" />
            <Skeleton className="h-[320px] rounded-[var(--od-radius-xl)]" />
          </div>
        ) : (
          <>
            <section className="grid gap-4 xl:grid-cols-[1.35fr_0.95fr]">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[28px] border border-[var(--od-border-default)] bg-[linear-gradient(180deg,rgba(79,209,229,0.14),transparent_38%),var(--od-bg-secondary)] p-6 shadow-[var(--od-shadow-md)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--od-accent-text)]">
                      Agent brief
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--od-text-primary)]">
                      {stats.newLeads > 0
                        ? `${stats.newLeads} new leads need active handling right now.`
                        : 'The queue is stable, but the agent should keep pressure on the pipeline.'}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--od-text-secondary)]">
                      Odyssey should direct the user into the next best action immediately:
                      open the agent console, process the queue, and move high-value leads
                      before momentum drops.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
                      Live posture
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--od-text-primary)]">
                      {organization?.name || 'Odyssey workspace'}
                    </p>
                    <p className="mt-1 text-xs text-[var(--od-text-tertiary)]">
                      Assisted agent workflow with human decision points.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--od-text-muted)]">
                      New queue
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--od-text-primary)]">
                      {stats.newLeads}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-[var(--od-text-tertiary)]">
                      Leads waiting for first contact or qualification.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--od-text-muted)]">
                      High-intent leads
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--od-text-primary)]">
                      {stats.hotLeads}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-[var(--od-text-tertiary)]">
                      Scored 70+ and should be routed through the agent fast.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--od-text-muted)]">
                      Closed revenue
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--od-text-primary)]">
                      ${stats.revenue.toLocaleString()}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-[var(--od-text-tertiary)]">
                      Revenue already captured through the current queue.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href="/dashboard/tools/strategy">
                      <Brain className="h-3.5 w-3.5" />
                      Ask the agent what to do next
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/dashboard/inbox">
                      <Inbox className="h-3.5 w-3.5" />
                      Open conversations
                    </Link>
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/dashboard/appointments">
                      <Calendar className="h-3.5 w-3.5" />
                      View schedule
                    </Link>
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 }}
                className="rounded-[28px] border border-[var(--od-border-default)] bg-[var(--od-bg-secondary)] p-6 shadow-[var(--od-shadow-sm)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
                      Operational lanes
                    </p>
                    <h2 className="mt-2 text-lg font-semibold tracking-tight text-[var(--od-text-primary)]">
                      Queue pressure by state
                    </h2>
                  </div>
                  <div className="rounded-full border border-[rgba(240,127,134,0.18)] bg-[rgba(240,127,134,0.08)] px-3 py-1.5 text-xs font-semibold text-[#FFB4BA]">
                    {stats.needsFollowUp} need follow-up
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {stageSummary.map((stage) => (
                    <div
                      key={stage.id}
                      className="rounded-2xl border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: stage.color }}
                          />
                          <p className="text-sm font-medium text-[var(--od-text-primary)]">
                            {stage.label}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-[var(--od-text-secondary)]">
                          {stage.count}
                        </span>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-2xl border border-[rgba(79,209,229,0.16)] bg-[var(--od-accent-muted)] p-4">
                    <div className="flex items-start gap-3">
                      <ShieldAlert className="mt-0.5 h-4 w-4 text-[var(--od-accent)]" />
                      <div>
                        <p className="text-sm font-semibold text-[var(--od-text-primary)]">
                          Agent signal
                        </p>
                        <p className="mt-1 text-xs leading-6 text-[var(--od-text-secondary)]">
                          {stats.avgScore >= 60
                            ? 'Lead quality is healthy. Keep the agent focused on speed-to-contact and quote momentum.'
                            : 'Lead quality is mixed. Push the agent toward qualification, re-engagement, and queue cleanup.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </section>

            {organization?.id && (
              <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                <DailyGamePlan organizationId={organization.id} onLeadClick={handleLeadIdClick} />
                <RevenueGapCloser organizationId={organization.id} onLeadClick={handleLeadIdClick} />
              </section>
            )}

            <GettingStartedChecklist />

            <section className="rounded-[28px] border border-[var(--od-border-default)] bg-[var(--od-bg-secondary)] p-5 shadow-[var(--od-shadow-sm)]">
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
                    Attention queue
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--od-text-primary)]">
                    Work the queue like an operator, not a report reader.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--od-text-tertiary)]">
                    The highest-intent leads surface first. Open any lead to jump straight
                    into agent actions, follow-up, and status progression.
                  </p>
                </div>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/dashboard/leads">
                    Open full queue
                    <TrendingUp className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>

              <LeadTable leads={queueLeads} onLeadClick={handleLeadClick} />
            </section>
          </>
        )}
      </div>

      <LeadDetailDrawer
        key={`${selectedLead?.id ?? 'empty'}-${drawerOpen ? 'open' : 'closed'}`}
        lead={selectedLead}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onStatusChange={handleStatusChange}
        onPriorityChange={handlePriorityChange}
        onAddNote={handleAddNote}
      />
    </div>
  );
}
