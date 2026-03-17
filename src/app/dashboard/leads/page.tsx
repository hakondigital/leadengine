'use client';

import { useState } from 'react';
import { LeadTable } from '@/components/dashboard/lead-table';
import { LeadDetailDrawer } from '@/components/dashboard/lead-detail-drawer';
import { useOrganization } from '@/hooks/use-organization';
import { useLeads } from '@/hooks/use-leads';
import { Skeleton } from '@/components/ui/skeleton';
import type { Lead, LeadWithRelations, LeadStatus } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function LeadsPage() {
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
                All Leads
              </h1>
              <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
                {loading ? '...' : `${leads.length} total leads`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const res = await fetch('/api/leads/export');
                  if (res.ok) {
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : (
          <div data-tour="leads-table">
            <LeadTable leads={leads} onLeadClick={handleLeadClick} />
          </div>
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
