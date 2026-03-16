'use client';

import { useState } from 'react';
import { PipelineBoard } from '@/components/dashboard/pipeline-board';
import { LeadDetailDrawer } from '@/components/dashboard/lead-detail-drawer';
import { useOrganization } from '@/hooks/use-organization';
import { useLeads } from '@/hooks/use-leads';
import { Skeleton } from '@/components/ui/skeleton';
import type { Lead, LeadWithRelations, LeadStatus } from '@/lib/database.types';

export default function PipelinePage() {
  const { organization, loading: orgLoading } = useOrganization();
  const { leads, loading: leadsLoading, updateLeadStatus, updateLeadPriority, fetchLeadDetail, addNote } = useLeads(organization?.id);
  const [selectedLead, setSelectedLead] = useState<LeadWithRelations | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const loading = orgLoading || leadsLoading;

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
    const updated = await fetchLeadDetail(leadId);
    if (updated) setSelectedLead(updated);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
            Pipeline
          </h1>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
            Drag leads between stages to update their status
          </p>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6">
        {loading ? (
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : (
          <PipelineBoard
            leads={leads}
            onLeadClick={handleLeadClick}
            onStatusChange={handleStatusChange}
          />
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
