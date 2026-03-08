'use client';

import { useState, useEffect, useCallback } from 'react';

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Quote {
  id: string;
  organization_id: string;
  lead_id: string;
  lead_name?: string;
  lead_email?: string;
  quote_number: string;
  title: string;
  line_items: QuoteLineItem[];
  subtotal: number;
  tax_rate?: number;
  tax_amount?: number;
  total: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'declined' | 'expired';
  valid_until?: string;
  notes?: string;
  sent_at?: string;
  created_at: string;
  updated_at: string;
}

interface QuotesState {
  quotes: Quote[];
  loading: boolean;
  error: string | null;
}

export function useQuotes(organizationId: string | undefined) {
  const [state, setState] = useState<QuotesState>({
    quotes: [],
    loading: true,
    error: null,
  });

  const fetchQuotes = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    try {
      const res = await fetch(`/api/quotes?organization_id=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch quotes');
      const data = await res.json();
      setState({ quotes: data.quotes || [], loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const createQuote = useCallback(async (quote: {
    lead_id: string;
    title: string;
    line_items: QuoteLineItem[];
    tax_rate?: number;
    valid_until?: string;
    notes?: string;
  }) => {
    if (!organizationId) return null;

    const res = await fetch('/api/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...quote, organization_id: organizationId }),
    });

    if (res.ok) {
      const created = await res.json();
      setState((s) => ({
        ...s,
        quotes: [created, ...s.quotes],
      }));
      return created;
    }
    return null;
  }, [organizationId]);

  const updateQuote = useCallback(async (
    quoteId: string,
    updates: Partial<Pick<Quote, 'title' | 'line_items' | 'tax_rate' | 'valid_until' | 'notes' | 'status'>>
  ) => {
    const res = await fetch(`/api/quotes/${quoteId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      const updated = await res.json();
      setState((s) => ({
        ...s,
        quotes: s.quotes.map((q) => (q.id === quoteId ? { ...q, ...updated } : q)),
      }));
      return updated;
    }
    return null;
  }, []);

  const sendQuote = useCallback(async (quoteId: string) => {
    const res = await fetch(`/api/quotes/${quoteId}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      const updated = await res.json();
      setState((s) => ({
        ...s,
        quotes: s.quotes.map((q) =>
          q.id === quoteId ? { ...q, status: 'sent' as const, sent_at: new Date().toISOString(), ...updated } : q
        ),
      }));
      return updated;
    }
    return null;
  }, []);

  return {
    ...state,
    refetch: fetchQuotes,
    createQuote,
    updateQuote,
    sendQuote,
  };
}
