'use client';

import { useState, useEffect, useCallback } from 'react';

export interface RoutingRuleRecord {
  id: string;
  name: string;
  type: 'round_robin' | 'service_type' | 'location' | 'availability';
  conditions: string;
  assignedMembers: string[];
  active: boolean;
}

interface RoutingState {
  rules: RoutingRuleRecord[];
  loading: boolean;
  error: string | null;
}

function mapFromDB(raw: Record<string, unknown>): RoutingRuleRecord {
  const cond = (raw.conditions as Record<string, unknown>) || {};
  return {
    id: raw.id as string,
    name: raw.name as string,
    type: (raw.rule_type as RoutingRuleRecord['type']) || 'round_robin',
    conditions: (cond.description as string) || '',
    assignedMembers: (cond.assigned_names as string[]) || [],
    active: raw.is_active as boolean,
  };
}

export function useRoutingRules(organizationId: string | undefined) {
  const [state, setState] = useState<RoutingState>({
    rules: [],
    loading: true,
    error: null,
  });

  const fetchRules = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(`/api/assignments?organization_id=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch routing rules');
      const data = await res.json();
      setState({
        rules: (data.rules || []).map(mapFromDB),
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const createRule = useCallback(
    async (rule: {
      name: string;
      type: string;
      conditions_text: string;
      assigned_names: string[];
    }) => {
      if (!organizationId) return null;
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          name: rule.name,
          type: rule.type,
          conditions_text: rule.conditions_text,
          assigned_names: rule.assigned_names,
          is_active: true,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setState((s) => ({ ...s, rules: [...s.rules, mapFromDB(created)] }));
        return created;
      }
      return null;
    },
    [organizationId]
  );

  const toggleRule = useCallback(async (id: string, active: boolean) => {
    const res = await fetch(`/api/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: active }),
    });
    if (res.ok) {
      setState((s) => ({
        ...s,
        rules: s.rules.map((r) => (r.id === id ? { ...r, active } : r)),
      }));
      return true;
    }
    return false;
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    const res = await fetch(`/api/assignments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setState((s) => ({ ...s, rules: s.rules.filter((r) => r.id !== id) }));
      return true;
    }
    return false;
  }, []);

  return { ...state, refetch: fetchRules, createRule, toggleRule, deleteRule };
}
