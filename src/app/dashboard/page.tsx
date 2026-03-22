'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LeadTable } from '@/components/dashboard/lead-table';
import { LeadDetailDrawer } from '@/components/dashboard/lead-detail-drawer';
import { useOrganization } from '@/hooks/use-organization';
import { useLeads } from '@/hooks/use-leads';
import type { Lead, LeadWithRelations, LeadStatus } from '@/lib/database.types';
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Users,
  Zap,
  Target,
} from 'lucide-react';
import { GettingStartedChecklist } from '@/components/dashboard/getting-started';
import { DailyGamePlan } from '@/components/dashboard/daily-game-plan';
import { RevenueGapCloser } from '@/components/dashboard/revenue-gap-closer';
import Link from 'next/link';

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
    const revenue = leads
      .filter((l) => l.status === 'won' && l.won_value)
      .reduce((acc, l) => acc + (l.won_value || 0), 0);
    const convRate = total > 0 ? Math.round((won / total) * 100) : 0;

    return { total, newLeads, active, won, revenue, convRate };
  }, [leads]);

  const handleLeadClick = async (lead: Lead) => {
    const fullLead = await fetchLeadDetail(lead.id);
    if (fullLead) { setSelectedLead(fullLead); setDrawerOpen(true); }
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

  const handleLeadIdClick = async (leadId: string) => {
    const fullLead = await fetchLeadDetail(leadId);
    if (fullLead) { setSelectedLead(fullLead); setDrawerOpen(true); }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen">
      {/* Header — clean, no border */}
      <div className="px-8 lg:px-10 pt-8 pb-2">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-[28px] font-semibold text-[#0A0A0A] tracking-[-0.035em]"
              style={{ fontFamily: 'var(--font-display, inherit)' }}>
            {greeting()}{organization?.name ? `, ${organization.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-[15px] text-[#737373] mt-1">
            {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </motion.div>
      </div>

      <div className="px-8 lg:px-10 py-6 space-y-8">
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-[100px] rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <GettingStartedChecklist />

            {/* Stats — integrated row, not separate cards */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
              className="rounded-2xl bg-white border border-[rgba(0,0,0,0.06)] overflow-hidden"
            >
              <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-[rgba(0,0,0,0.06)]">
                {[
                  { label: 'Total leads', value: stats.total, icon: Users, change: null, color: '#6366F1' },
                  { label: 'New this week', value: stats.newLeads, icon: Zap, change: null, color: '#0EA5E9' },
                  { label: 'In pipeline', value: stats.active, icon: Target, change: null, color: '#F59E0B' },
                  { label: 'Conversion rate', value: `${stats.convRate}%`, icon: TrendingUp, change: stats.convRate > 20 ? 'up' : stats.convRate > 0 ? 'neutral' : null, color: '#22C55E' },
                ].map((stat, i) => (
                  <div key={i} className="px-6 py-5 group">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[13px] text-[#737373] font-medium">{stat.label}</span>
                      <stat.icon className="w-4 h-4 text-[#A3A3A3]" />
                    </div>
                    <div className="flex items-end gap-2">
                      <span className="text-[28px] font-semibold text-[#0A0A0A] tracking-[-0.03em] leading-none"
                            style={{ fontFamily: 'var(--font-display, inherit)' }}>
                        {stat.value}
                      </span>
                      {stat.change === 'up' && (
                        <span className="flex items-center gap-0.5 text-[11px] font-medium text-[#059669] mb-1">
                          <ArrowUpRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Two-column: AI insights + Pipeline snapshot */}
            {organization?.id && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* AI Game Plan — wider */}
                <div className="lg:col-span-3">
                  <DailyGamePlan organizationId={organization.id} onLeadClick={handleLeadIdClick} />
                </div>
                {/* Revenue tracker — narrower */}
                <div className="lg:col-span-2">
                  <RevenueGapCloser organizationId={organization.id} onLeadClick={handleLeadIdClick} />
                </div>
              </div>
            )}

            {/* Recent leads — proper table */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-[17px] font-semibold text-[#0A0A0A] tracking-[-0.02em]"
                      style={{ fontFamily: 'var(--font-display, inherit)' }}>
                    Recent leads
                  </h2>
                  <p className="text-[13px] text-[#A3A3A3] mt-0.5">
                    {leads.length} total · {stats.newLeads} unreviewed
                  </p>
                </div>
                <Link
                  href="/dashboard/leads"
                  className="text-[13px] font-medium text-[#6366F1] hover:text-[#4F46E5] transition-colors"
                >
                  View all →
                </Link>
              </div>
              <LeadTable leads={leads.slice(0, 8)} onLeadClick={handleLeadClick} />
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
