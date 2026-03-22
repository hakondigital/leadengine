'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Client, ClientWithRelations, ClientStatus } from '@/lib/database.types';

interface ClientsState {
  clients: Client[];
  loading: boolean;
  error: string | null;
  total: number;
}

export function useClients(organizationId: string | undefined) {
  const [state, setState] = useState<ClientsState>({
    clients: [],
    loading: true,
    error: null,
    total: 0,
  });

  const fetchClients = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    try {
      const res = await fetch(`/api/clients?organization_id=${organizationId}&limit=100`);
      if (!res.ok) throw new Error('Failed to fetch clients');
      const data = await res.json();
      setState({ clients: data.clients || [], total: data.total || 0, loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const createClient = useCallback(async (data: Partial<Client>) => {
    const res = await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, organization_id: organizationId }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create client' }));
      throw new Error(err.error || 'Failed to create client');
    }

    const created: Client = await res.json();
    setState((s) => ({
      ...s,
      clients: [created, ...s.clients],
      total: s.total + 1,
    }));
    return created;
  }, [organizationId]);

  const updateClient = useCallback(async (clientId: string, data: Partial<Client>) => {
    const res = await fetch(`/api/clients/${clientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update client' }));
      throw new Error(err.error || 'Failed to update client');
    }

    const updated: Client = await res.json();
    setState((s) => ({
      ...s,
      clients: s.clients.map((c) => (c.id === clientId ? { ...c, ...updated } : c)),
    }));
    return updated;
  }, []);

  const deleteClient = useCallback(async (clientId: string) => {
    const res = await fetch(`/api/clients/${clientId}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete client' }));
      throw new Error(err.error || 'Failed to delete client');
    }

    setState((s) => ({
      ...s,
      clients: s.clients.filter((c) => c.id !== clientId),
      total: s.total - 1,
    }));
  }, []);

  const fetchClientDetail = useCallback(async (clientId: string): Promise<ClientWithRelations | null> => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const searchClients = useCallback(async (query: string) => {
    if (!organizationId) return;
    setState((s) => ({ ...s, loading: true }));

    try {
      const res = await fetch(
        `/api/clients?organization_id=${organizationId}&search=${encodeURIComponent(query)}&limit=100`
      );
      if (!res.ok) throw new Error('Failed to search clients');
      const data = await res.json();
      setState({ clients: data.clients || [], total: data.total || 0, loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  return {
    ...state,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    fetchClientDetail,
    searchClients,
  };
}
