import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeICS(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;

    if (!orgId) {
      return new NextResponse('Missing organization ID', { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Fetch all non-cancelled appointments for this org
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('organization_id', orgId)
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Calendar feed error:', error);
      return new NextResponse('Failed to fetch appointments', { status: 500 });
    }

    // Fetch org name for calendar title
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    const calName = org?.name ? `${org.name} - Appointments` : 'Odyssey Appointments';

    // Build iCalendar feed
    const events = (appointments || []).map((apt) => {
      const start = new Date(apt.start_time);
      const end = apt.end_time
        ? new Date(apt.end_time)
        : new Date(start.getTime() + (apt.duration_minutes || 60) * 60000);

      const summary = [apt.title, apt.contact_name].filter(Boolean).join(' - ');
      const description = [
        apt.description,
        apt.contact_name ? `Client: ${apt.contact_name}` : null,
        apt.contact_email ? `Email: ${apt.contact_email}` : null,
        apt.contact_phone ? `Phone: ${apt.contact_phone}` : null,
        apt.notes ? `Notes: ${apt.notes}` : null,
      ].filter(Boolean).join('\\n');

      const statusMap: Record<string, string> = {
        scheduled: 'TENTATIVE',
        confirmed: 'CONFIRMED',
        completed: 'CONFIRMED',
        no_show: 'CANCELLED',
      };

      return [
        'BEGIN:VEVENT',
        `UID:apt-${apt.id}@odyssey`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(start)}`,
        `DTEND:${formatICSDate(end)}`,
        `SUMMARY:${escapeICS(summary)}`,
        apt.location ? `LOCATION:${escapeICS(apt.location)}` : null,
        description ? `DESCRIPTION:${escapeICS(description)}` : null,
        `STATUS:${statusMap[apt.status] || 'TENTATIVE'}`,
        'END:VEVENT',
      ].filter(Boolean).join('\r\n');
    });

    const ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Odyssey//Appointments//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeICS(calName)}`,
      'X-WR-TIMEZONE:UTC',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n');

    return new NextResponse(ical, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': 'inline; filename="appointments.ics"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Calendar feed error:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
