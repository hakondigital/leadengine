'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Appointment {
  id: string;
  organization_id: string;
  lead_id: string;
  lead_name?: string;
  lead_email?: string;
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface AppointmentsState {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
}

export function useAppointments(organizationId: string | undefined) {
  const [state, setState] = useState<AppointmentsState>({
    appointments: [],
    loading: true,
    error: null,
  });

  const fetchAppointments = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    try {
      const res = await fetch(`/api/appointments?organization_id=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch appointments');
      const data = await res.json();
      setState({ appointments: data.appointments || [], loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const createAppointment = useCallback(async (appointment: {
    lead_id: string;
    title: string;
    description?: string;
    scheduled_at: string;
    duration_minutes: number;
    location?: string;
    notes?: string;
  }) => {
    if (!organizationId) return null;

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...appointment, organization_id: organizationId }),
    });

    if (res.ok) {
      const created = await res.json();
      setState((s) => ({
        ...s,
        appointments: [created, ...s.appointments],
      }));
      return created;
    }
    return null;
  }, [organizationId]);

  const updateAppointment = useCallback(async (
    appointmentId: string,
    status: 'confirmed' | 'completed' | 'cancelled'
  ) => {
    const res = await fetch(`/api/appointments/${appointmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (res.ok) {
      const updated = await res.json();
      setState((s) => ({
        ...s,
        appointments: s.appointments.map((a) =>
          a.id === appointmentId ? { ...a, ...updated } : a
        ),
      }));
      return updated;
    }
    return null;
  }, []);

  return {
    ...state,
    refetch: fetchAppointments,
    createAppointment,
    updateAppointment,
  };
}
