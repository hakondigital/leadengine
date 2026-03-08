'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Lead, LeadWithRelations, LeadStatus } from '@/lib/database.types';

interface LeadsState {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  total: number;
}

export function useLeads(organizationId: string | undefined) {
  const [state, setState] = useState<LeadsState>({
    leads: [],
    loading: true,
    error: null,
    total: 0,
  });

  const fetchLeads = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    try {
      const res = await fetch(`/api/leads?organization_id=${organizationId}&limit=100`);
      if (!res.ok) throw new Error('Failed to fetch leads');
      const data = await res.json();
      setState({ leads: data.leads || [], total: data.total || 0, loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const updateLeadStatus = useCallback(async (leadId: string, status: LeadStatus, wonValue?: number) => {
    const body: Record<string, unknown> = { status };
    if (status === 'won' && wonValue !== undefined) {
      body.won_value = wonValue;
    }

    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const updated = await res.json();
      setState((s) => ({
        ...s,
        leads: s.leads.map((l) => (l.id === leadId ? { ...l, ...updated } : l)),
      }));
      return updated;
    }
    return null;
  }, []);

  const updateLeadPriority = useCallback(async (leadId: string, priority: string) => {
    const res = await fetch(`/api/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    });

    if (res.ok) {
      setState((s) => ({
        ...s,
        leads: s.leads.map((l) => (l.id === leadId ? { ...l, priority: priority as Lead['priority'] } : l)),
      }));
    }
  }, []);

  const fetchLeadDetail = useCallback(async (leadId: string): Promise<LeadWithRelations | null> => {
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const addNote = useCallback(async (leadId: string, content: string) => {
    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return res.ok;
  }, []);

  return {
    ...state,
    fetchLeads,
    updateLeadStatus,
    updateLeadPriority,
    fetchLeadDetail,
    addNote,
  };
}
