'use client';

import { useState, useEffect, useCallback } from 'react';

export interface InboxMessage {
  id: string;
  organization_id: string;
  lead_id?: string;
  lead_name?: string;
  lead_email?: string;
  channel: 'email' | 'sms' | 'form' | 'chat';
  direction: 'inbound' | 'outbound';
  subject?: string;
  body: string;
  is_read: boolean;
  replied_at?: string;
  created_at: string;
}

interface InboxState {
  messages: InboxMessage[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

export function useInbox(organizationId: string | undefined) {
  const [state, setState] = useState<InboxState>({
    messages: [],
    unreadCount: 0,
    loading: true,
    error: null,
  });

  const fetchMessages = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    try {
      const res = await fetch(`/api/inbox?organization_id=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      const data = await res.json();
      const messages: InboxMessage[] = data.messages || [];
      const unreadCount = messages.filter((m) => !m.is_read).length;
      setState({ messages, unreadCount, loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const markAsRead = useCallback(async (messageId: string) => {
    const res = await fetch(`/api/inbox/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_read: true }),
    });

    if (res.ok) {
      setState((s) => {
        const updated = s.messages.map((m) =>
          m.id === messageId ? { ...m, is_read: true } : m
        );
        return {
          ...s,
          messages: updated,
          unreadCount: updated.filter((m) => !m.is_read).length,
        };
      });
      return true;
    }
    return false;
  }, []);

  const sendReply = useCallback(async (messageId: string, body: string) => {
    if (!organizationId) return null;

    const res = await fetch(`/api/inbox/${messageId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body, organization_id: organizationId }),
    });

    if (res.ok) {
      const reply = await res.json();
      setState((s) => ({
        ...s,
        messages: [reply, ...s.messages].map((m) =>
          m.id === messageId ? { ...m, is_read: true, replied_at: new Date().toISOString() } : m
        ),
      }));
      return reply;
    }
    return null;
  }, [organizationId]);

  return {
    ...state,
    refetch: fetchMessages,
    markAsRead,
    sendReply,
  };
}
