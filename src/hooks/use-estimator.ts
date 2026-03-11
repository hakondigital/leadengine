'use client';

import { useState, useEffect, useCallback } from 'react';

export interface EstimatorConfig {
  id: string;
  service_type: string;
  min_price: number;
  max_price: number;
  unit: string;
  is_active: boolean;
  created_at: string;
}

interface EstimatorState {
  configs: EstimatorConfig[];
  loading: boolean;
  error: string | null;
}

export function useEstimator(organizationId: string | undefined) {
  const [state, setState] = useState<EstimatorState>({
    configs: [],
    loading: true,
    error: null,
  });

  const fetchConfigs = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(`/api/estimator?organization_id=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch estimator configs');
      const data = await res.json();
      setState({ configs: data.configs || [], loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const createConfig = useCallback(
    async (config: { service_type: string; min_price: number; max_price: number; unit: string }) => {
      if (!organizationId) return null;
      const res = await fetch('/api/estimator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, organization_id: organizationId }),
      });
      if (res.ok) {
        const created = await res.json();
        setState((s) => ({ ...s, configs: [...s.configs, created] }));
        return created;
      }
      return null;
    },
    [organizationId]
  );

  const deleteConfig = useCallback(async (id: string) => {
    const res = await fetch(`/api/estimator/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setState((s) => ({ ...s, configs: s.configs.filter((c) => c.id !== id) }));
      return true;
    }
    return false;
  }, []);

  return { ...state, refetch: fetchConfigs, createConfig, deleteConfig };
}
