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
  // UI-friendly aliases — mapped from DB start_time / end_time
  scheduled_at: string;
  duration_minutes: number;
  // Raw DB fields (also present)
  start_time: string;
  end_time: string;
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

/** Map a raw DB row to the Appointment interface */
function mapRow(row: Record<string, unknown>): Appointment {
  const start = (row.start_time as string) || (row.scheduled_at as string) || new Date().toISOString();
  const end = (row.end_time as string) || start;
  const durationMs = new Date(end).getTime() - new Date(start).getTime();
  const durationMin = Math.max(0, Math.round(durationMs / 60000));

  return {
    ...(row as unknown as Appointment),
    scheduled_at: start,
    start_time: start,
    end_time: end,
    duration_minutes: (row.duration_minutes as number) || durationMin || 60,
  };
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
      const mapped = (data.appointments || []).map(mapRow);
      setState({ appointments: mapped, loading: false, error: null });
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

    // Convert scheduled_at + duration_minutes → start_time / end_time for API
    const start = appointment.scheduled_at;
    const end = new Date(
      new Date(start).getTime() + (appointment.duration_minutes || 60) * 60000
    ).toISOString();

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organization_id: organizationId,
        lead_id: appointment.lead_id || null,
        title: appointment.title,
        description: appointment.description,
        start_time: start,
        end_time: end,
        location: appointment.location,
        notes: appointment.notes,
      }),
    });

    if (res.ok) {
      const created = await res.json();
      const mapped = mapRow(created);
      setState((s) => ({
        ...s,
        appointments: [mapped, ...s.appointments],
      }));
      return mapped;
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
          a.id === appointmentId ? { ...a, ...mapRow(updated) } : a
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
