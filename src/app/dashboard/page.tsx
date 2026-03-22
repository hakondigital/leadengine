'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { StatCard } from '@/components/dashboard/stat-card';
import { LeadTable } from '@/components/dashboard/lead-table';
import { LeadDetailDrawer } from '@/components/dashboard/lead-detail-drawer';
import { useOrganization } from '@/hooks/use-organization';
import { useLeads } from '@/hooks/use-leads';
// pipelineStages removed — pipeline bar now only on Pipeline page
import { Skeleton } from '@/components/ui/skeleton';
import type { Lead, LeadWithRelations, LeadStatus } from '@/lib/database.types';
import {
  Users,
  UserPlus,
  Clock,
  Trophy,
  TrendingUp,
} from 'lucide-react';
import { GettingStartedChecklist } from '@/components/dashboard/getting-started';
import { DailyGamePlan } from '@/components/dashboard/daily-game-plan';
import { RevenueGapCloser } from '@/components/dashboard/revenue-gap-closer';

export default function DashboardPage() {
  const { organization, loading: orgLoading } = useOrganization();
  const { leads, loading: leadsLoading, updateLeadStatus, updateLeadPriority, fetchLeadDetail, addNote } = useLeads(organization?.id);
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loading = orgLoading || leadsLoading;

  const stats = useMemo(() => {
    const total = leads.length;
    const newLeads = leads.filter((l) => l.status === 'new').length;
    const active = leads.filter((l) => !['won', 'lost'].includes(l.status)).length;
    const won = leads.filter((l) => l.status === 'won').length;
    const avgScore = leads.reduce((acc, l) => acc + (l.ai_score || 0), 0) / (total || 1);
    const hotLeads = leads.filter((l) => (l.ai_score || 0) >= 70).length;
    const revenue = leads
      .filter((l) => l.status === 'won' && l.won_value)
      .reduce((acc, l) => acc + (l.won_value || 0), 0);

    return { total, newLeads, active, won, avgScore: Math.round(avgScore), hotLeads, revenue };
  }, [leads]);

  const handleLeadClick = async (lead: Lead) => {
    const fullLead = await fetchLeadDetail(lead.id);
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
    // Refresh lead detail
    const updated = await fetchLeadDetail(leadId);
    if (updated) setSelectedLead(updated);
  };

  const handleLeadIdClick = async (leadId: string) => {
    const fullLead = await fetchLeadDetail(leadId);
    if (fullLead) {
      setSelectedLead(fullLead);
      setDrawerOpen(true);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--od-text-primary)] tracking-tight">
                Dashboard
              </h1>
              <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
                {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-6 lg:px-8 py-8 space-y-8">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {/* Getting started checklist */}
            <GettingStartedChecklist />

            <div data-tour="dashboard-stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Leads" value={stats.total} icon={Users} color="#6C8EEF" index={0} />
              <StatCard label="New" value={stats.newLeads} icon={UserPlus} color="#4ADE80" index={1} />
              <StatCard label="Active Pipeline" value={stats.active} icon={Clock} color="#4FD1E5" index={2} />
              <StatCard label="Won" value={stats.won} icon={Trophy} color="#34C77B" index={3} />
            </div>

            {/* AI Game Plan + Revenue Gap */}
            {organization?.id && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <DailyGamePlan organizationId={organization.id} onLeadClick={handleLeadIdClick} />
                <RevenueGapCloser organizationId={organization.id} onLeadClick={handleLeadIdClick} />
              </div>
            )}

            {/* Recent leads */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-[var(--od-text-primary)] tracking-tight">
                  Recent Leads
                </h2>
                <a
                  href="/dashboard/leads"
                  className="text-xs font-medium text-[var(--od-accent)] hover:underline"
                >
                  View all
                </a>
              </div>
              <LeadTable leads={leads.slice(0, 10)} onLeadClick={handleLeadClick} />
            </div>
          </>
        )}
      </div>

      <LeadDetailDrawer
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
