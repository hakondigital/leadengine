'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Invoice } from '@/lib/database.types';

interface InvoicesState {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  total: number;
}

export function useInvoices(organizationId: string | undefined, clientId?: string) {
  const [state, setState] = useState<InvoicesState>({
    invoices: [],
    loading: true,
    error: null,
    total: 0,
  });

  const fetchInvoices = useCallback(async (orgId?: string, filterClientId?: string) => {
    const org = orgId || organizationId;
    if (!org) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    try {
      let url = `/api/invoices?organization_id=${org}&limit=100`;
      const cid = filterClientId ?? clientId;
      if (cid) url += `&client_id=${cid}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch invoices');
      const data = await res.json();
      setState({ invoices: data.invoices || [], total: data.total || 0, loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId, clientId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const createInvoice = useCallback(async (data: {
    organization_id: string;
    client_id?: string;
    lead_id?: string;
    line_items: Array<{ description: string; quantity: number; unit_price: number }>;
    tax_rate?: number;
    notes?: string;
    due_date?: string;
  }): Promise<Invoice | null> => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to create invoice');
      const invoice = await res.json();

      setState((s) => ({
        ...s,
        invoices: [invoice, ...s.invoices],
        total: s.total + 1,
      }));

      return invoice;
    } catch (err) {
      console.error('Create invoice error:', err);
      return null;
    }
  }, []);

  const updateInvoice = useCallback(async (
    id: string,
    data: Partial<Invoice>
  ): Promise<Invoice | null> => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to update invoice');
      const updated = await res.json();

      setState((s) => ({
        ...s,
        invoices: s.invoices.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)),
      }));

      return updated;
    } catch (err) {
      console.error('Update invoice error:', err);
      return null;
    }
  }, []);

  const deleteInvoice = useCallback(async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete invoice');

      setState((s) => ({
        ...s,
        invoices: s.invoices.filter((inv) => inv.id !== id),
        total: s.total - 1,
      }));

      return true;
    } catch (err) {
      console.error('Delete invoice error:', err);
      return false;
    }
  }, []);

  const sendInvoice = useCallback(async (id: string): Promise<Invoice | null> => {
    try {
      const res = await fetch(`/api/invoices/${id}/send`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to send invoice');
      }
      const updated = await res.json();

      setState((s) => ({
        ...s,
        invoices: s.invoices.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)),
      }));

      return updated;
    } catch (err) {
      console.error('Send invoice error:', err);
      throw err;
    }
  }, []);

  return {
    ...state,
    fetchInvoices,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
  };
}
