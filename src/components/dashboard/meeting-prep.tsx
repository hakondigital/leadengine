'use client';

import { useEffect, useState } from 'react';

interface MeetingPrepData {
  summary: string | null;
  talking_points: string[];
  appointment: {
    title: string;
    scheduled_at: string;
  } | null;
}

interface MeetingPrepProps {
  clientId: string;
  organizationId: string;
}

function formatTimeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  const hours = Math.round(diff / (1000 * 60 * 60));

  if (hours < 1) {
    const minutes = Math.round(diff / (1000 * 60));
    if (minutes <= 0) return 'now';
    return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  if (hours < 24) return `in ${hours} hour${hours !== 1 ? 's' : ''}`;
  const days = Math.round(hours / 24);
  return `in ${days} day${days !== 1 ? 's' : ''}`;
}

export function MeetingPrep({ clientId, organizationId }: MeetingPrepProps) {
  const [data, setData] = useState<MeetingPrepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchMeetingPrep() {
      try {
        setLoading(true);
        setError(null);

        // First check if there's an upcoming appointment within 48 hours
        const now = new Date().toISOString();
        const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

        const apptRes = await fetch(
          `/api/appointments?organization_id=${organizationId}&lead_id=${clientId}&start_date=${now}&end_date=${in48h}&status=scheduled`
        );

        if (!apptRes.ok) {
          if (!cancelled) setLoading(false);
          return;
        }

        const apptData = await apptRes.json();
        const appointments = apptData.appointments || [];

        if (appointments.length === 0) {
          if (!cancelled) {
            setData(null);
            setLoading(false);
          }
          return;
        }

        // There's an upcoming appointment — fetch the AI prep
        const prepRes = await fetch('/api/ai/meeting-prep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            organization_id: organizationId,
          }),
        });

        if (!prepRes.ok) {
          throw new Error('Failed to generate meeting prep');
        }

        const prepData: MeetingPrepData = await prepRes.json();
        if (!cancelled) {
          setData(prepData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load meeting prep');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMeetingPrep();
    return () => { cancelled = true; };
  }, [clientId, organizationId]);

  // Don't render anything if no upcoming appointment or still loading with no data
  if (loading) {
    return null; // Silent loading — don't show a skeleton for something that might not exist
  }

  if (error || !data || !data.appointment) {
    return null;
  }

  const appointmentTitle = data.appointment.title;
  const timeUntil = formatTimeUntil(data.appointment.scheduled_at);

  return (
    <div className="rounded-lg border border-[var(--od-border-default,rgba(0,0,0,0.08))] bg-[var(--od-bg-secondary,#FFFFFF)] overflow-hidden">
      {/* Indigo left border accent */}
      <div className="flex">
        <div className="w-1 bg-indigo-500 flex-shrink-0" />
        <div className="flex-1 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0" aria-hidden="true">&#128203;</span>
            <div>
              <p className="text-sm font-semibold text-[var(--od-text-primary,#0A0A0A)]">
                Meeting {timeUntil}
                {appointmentTitle ? ` — ${appointmentTitle}` : ''}
              </p>
              <p className="text-xs text-[var(--od-text-tertiary,#737373)] mt-0.5">
                {new Date(data.appointment.scheduled_at).toLocaleString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Divider */}
          <hr className="border-[var(--od-border-subtle,rgba(0,0,0,0.04))]" />

          {/* Summary bullet points */}
          {data.summary && (
            <p className="text-sm text-[var(--od-text-secondary,#404040)] leading-relaxed">
              {data.summary}
            </p>
          )}

          {/* Talking points */}
          {data.talking_points.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[var(--od-text-tertiary,#737373)] uppercase tracking-wide">
                Suggested talking points
              </p>
              <ul className="space-y-1">
                {data.talking_points.map((point, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-[var(--od-text-secondary,#404040)]"
                  >
                    <span className="text-indigo-500 mt-0.5 flex-shrink-0">&#8226;</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
