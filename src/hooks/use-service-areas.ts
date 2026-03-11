'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ServiceAreaRecord {
  id: string;
  name: string;
  postcodes: string[];
  suburbs: string[];
  assigned_to: string | null;
  is_active: boolean;
  auto_reject_outside: boolean;
  created_at: string;
}

interface ServiceAreasState {
  areas: ServiceAreaRecord[];
  loading: boolean;
  error: string | null;
}

export function useServiceAreas(organizationId: string | undefined) {
  const [state, setState] = useState<ServiceAreasState>({
    areas: [],
    loading: true,
    error: null,
  });

  const fetchAreas = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(`/api/service-areas?organization_id=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch service areas');
      const data = await res.json();
      setState({ areas: data.service_areas || [], loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchAreas();
  }, [fetchAreas]);

  const createArea = useCallback(
    async (area: {
      name: string;
      postcodes: string[];
      suburbs: string[];
      assigned_to?: string | null;
    }) => {
      if (!organizationId) return null;
      const res = await fetch('/api/service-areas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...area, organization_id: organizationId }),
      });
      if (res.ok) {
        const created = await res.json();
        setState((s) => ({ ...s, areas: [...s.areas, created] }));
        return created;
      }
      return null;
    },
    [organizationId]
  );

  const deleteArea = useCallback(async (id: string) => {
    const res = await fetch(`/api/service-areas/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setState((s) => ({ ...s, areas: s.areas.filter((a) => a.id !== id) }));
      return true;
    }
    return false;
  }, []);

  return { ...state, refetch: fetchAreas, createArea, deleteArea };
}
