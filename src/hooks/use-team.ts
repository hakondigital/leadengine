'use client';

import { useCallback, useEffect, useState } from 'react';
import { useOrganization } from './use-organization';

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  job_title: string | null;
  phone: string | null;
  specializations: string[] | null;
  is_available: boolean;
  is_active: boolean;
  max_leads_per_day: number | null;
  created_at: string;
}

export function useTeam() {
  const { organization } = useOrganization();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/team');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (organization?.id) {
      fetchMembers();
    }
  }, [organization?.id, fetchMembers]);

  const inviteMember = useCallback(async (data: {
    email: string;
    full_name: string;
    role?: string;
    job_title?: string;
  }) => {
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (res.ok) {
      await fetchMembers();
    }
    return { ok: res.ok, error: result.error };
  }, [fetchMembers]);

  const updateMember = useCallback(async (memberId: string, updates: Record<string, unknown>) => {
    const res = await fetch('/api/team', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: memberId, ...updates }),
    });
    if (res.ok) {
      await fetchMembers();
    }
    return res.ok;
  }, [fetchMembers]);

  const removeMember = useCallback(async (memberId: string) => {
    const res = await fetch(`/api/team?member_id=${memberId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      await fetchMembers();
    }
    return res.ok;
  }, [fetchMembers]);

  return {
    members,
    loading,
    inviteMember,
    updateMember,
    removeMember,
    refetch: fetchMembers,
  };
}
