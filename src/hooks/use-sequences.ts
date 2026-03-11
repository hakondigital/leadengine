'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SequenceStep {
  id: string;
  type: 'email' | 'sms' | 'wait';
  delay_days: number;
  subject?: string;
  body?: string;
  template_id?: string;
}

export interface Sequence {
  id: string;
  organization_id: string;
  name: string;
  description?: string;
  steps: SequenceStep[];
  trigger: 'new_lead' | 'quote_sent' | 'no_response' | 'appointment_completed' | 'status_change' | 'job_completed' | 'manual';
  trigger_conditions?: Record<string, unknown>;
  is_active: boolean;
  enrolled_count: number;
  completed_count: number;
  created_at: string;
  updated_at: string;
}

interface SequencesState {
  sequences: Sequence[];
  loading: boolean;
  error: string | null;
}

export function useSequences(organizationId: string | undefined) {
  const [state, setState] = useState<SequencesState>({
    sequences: [],
    loading: true,
    error: null,
  });

  const fetchSequences = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    try {
      const res = await fetch(`/api/sequences?organization_id=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch sequences');
      const data = await res.json();
      setState({ sequences: data.sequences || [], loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const createSequence = useCallback(async (sequence: {
    name: string;
    description?: string;
    steps: SequenceStep[];
    trigger: 'new_lead' | 'quote_sent' | 'no_response' | 'appointment_completed' | 'status_change' | 'job_completed' | 'manual';
    trigger_conditions?: Record<string, unknown>;
  }) => {
    if (!organizationId) return null;

    const res = await fetch('/api/sequences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...sequence, organization_id: organizationId }),
    });

    if (res.ok) {
      const created = await res.json();
      setState((s) => ({
        ...s,
        sequences: [created, ...s.sequences],
      }));
      return created;
    }
    return null;
  }, [organizationId]);

  const toggleSequence = useCallback(async (sequenceId: string, isActive: boolean) => {
    const res = await fetch(`/api/sequences/${sequenceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive }),
    });

    if (res.ok) {
      const updated = await res.json();
      setState((s) => ({
        ...s,
        sequences: s.sequences.map((seq) =>
          seq.id === sequenceId ? { ...seq, is_active: isActive, ...updated } : seq
        ),
      }));
      return updated;
    }
    return null;
  }, []);

  const enrollLead = useCallback(async (sequenceId: string, leadId: string) => {
    const res = await fetch('/api/sequences/enroll', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sequence_id: sequenceId, lead_id: leadId }),
    });

    if (res.ok) {
      const result = await res.json();
      setState((s) => ({
        ...s,
        sequences: s.sequences.map((seq) =>
          seq.id === sequenceId
            ? { ...seq, enrolled_count: seq.enrolled_count + 1 }
            : seq
        ),
      }));
      return result;
    }
    return null;
  }, []);

  return {
    ...state,
    refetch: fetchSequences,
    createSequence,
    toggleSequence,
    enrollLead,
  };
}
