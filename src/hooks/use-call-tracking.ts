'use client';

import { useState, useEffect, useCallback } from 'react';

export interface TrackingNumber {
  id: string;
  organization_id: string;
  phone_number: string;
  forwarding_number: string;
  label: string;
  source: string;
  is_active: boolean;
  total_calls: number;
  created_at: string;
}

export interface CallLog {
  id: string;
  tracking_number_id: string;
  tracking_label?: string;
  caller_number: string;
  caller_name?: string;
  duration_seconds: number;
  status: 'answered' | 'missed' | 'voicemail' | 'busy';
  recording_url?: string;
  lead_id?: string;
  lead_name?: string;
  transcript?: string;
  ai_summary?: string;
  transcribed_at?: string;
  created_at: string;
}

interface CallTrackingState {
  trackingNumbers: TrackingNumber[];
  callLogs: CallLog[];
  loading: boolean;
  error: string | null;
}

export function useCallTracking(organizationId: string | undefined) {
  const [state, setState] = useState<CallTrackingState>({
    trackingNumbers: [],
    callLogs: [],
    loading: true,
    error: null,
  });

  const fetchCallTracking = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    try {
      const res = await fetch(
        `/api/call-tracking?organization_id=${organizationId}&include_logs=true`
      );
      if (!res.ok) throw new Error('Failed to fetch call tracking data');
      const data = await res.json();
      setState({
        trackingNumbers: data.tracking_numbers || [],
        callLogs: data.call_logs || [],
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchCallTracking();
  }, [fetchCallTracking]);

  const createTrackingNumber = useCallback(async (trackingNumber: {
    phone_number: string;
    forwarding_number: string;
    label: string;
    source: string;
  }) => {
    if (!organizationId) return null;

    const res = await fetch('/api/call-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...trackingNumber, organization_id: organizationId }),
    });

    if (res.ok) {
      const created = await res.json();
      setState((s) => ({
        ...s,
        trackingNumbers: [created, ...s.trackingNumbers],
      }));
      return created;
    }
    return null;
  }, [organizationId]);

  return {
    ...state,
    refetch: fetchCallTracking,
    createTrackingNumber,
  };
}
