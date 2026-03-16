import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { success } = rateLimit(`book:${ip}`, 10);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const {
      organization_id,
      start_time,
      end_time,
      contact_name,
      contact_email,
      contact_phone,
      service_type,
      notes,
    } = body;

    if (!organization_id || !start_time || !end_time || !contact_name || !contact_email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, date, and time are required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Verify org exists and has booking enabled
    const { data: orgCheck } = await supabase
      .from('organizations')
      .select('id, settings')
      .eq('id', organization_id)
      .single();

    if (!orgCheck) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const orgSettings = (orgCheck.settings as Record<string, unknown>) || {};
    if (orgSettings.booking_enabled === false) {
      return NextResponse.json({ error: 'Booking is not available' }, { status: 403 });
    }

    // Double-check for conflicts (prevent double-booking)
    const { data: conflicts } = await supabase
      .from('appointments')
      .select('id')
      .eq('organization_id', organization_id)
      .in('status', ['scheduled', 'confirmed'])
      .lt('start_time', end_time)
      .gt('end_time', start_time);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: 'This time slot is no longer available. Please choose another.' },
        { status: 409 }
      );
    }

    // Create a lead record for the contact
    let leadId: string | null = null;
    try {
      const nameParts = contact_name.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data: lead } = await supabase
        .from('leads')
        .insert({
          organization_id,
          first_name: firstName,
          last_name: lastName,
          email: contact_email,
          phone: contact_phone || null,
          service_type: service_type || null,
          source: 'booking_widget',
          status: 'new',
          message: notes || null,
        })
        .select('id')
        .single();

      if (lead) leadId = lead.id;
    } catch {
      // Non-critical — appointment will still be created
    }

    // Create the appointment
    const title = service_type
      ? `${service_type} — ${contact_name}`
      : `Booking — ${contact_name}`;

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        organization_id,
        lead_id: leadId,
        title,
        description: notes || null,
        start_time,
        end_time,
        status: 'scheduled',
        contact_name,
        contact_email,
        contact_phone: contact_phone || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Booking create error:', error);
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
    }

    // Send notification email to the org (fire and forget)
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('notification_email, name')
        .eq('id', organization_id)
        .single();

      if (org?.notification_email) {
        const startDate = new Date(start_time);
        const dateStr = startDate.toLocaleDateString('en-AU', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        const timeStr = startDate.toLocaleTimeString('en-AU', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });

        const baseUrl = new URL(request.url).origin;
        fetch(`${baseUrl}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: org.notification_email,
            subject: `New Booking: ${contact_name} — ${dateStr}`,
            html: `
              <div style="font-family: sans-serif; max-width: 480px;">
                <h2 style="margin: 0 0 16px;">New Booking Received</h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 6px 0; color: #666;">Name</td><td style="padding: 6px 0; font-weight: 600;">${contact_name}</td></tr>
                  <tr><td style="padding: 6px 0; color: #666;">Date</td><td style="padding: 6px 0; font-weight: 600;">${dateStr}</td></tr>
                  <tr><td style="padding: 6px 0; color: #666;">Time</td><td style="padding: 6px 0; font-weight: 600;">${timeStr}</td></tr>
                  ${service_type ? `<tr><td style="padding: 6px 0; color: #666;">Service</td><td style="padding: 6px 0;">${service_type}</td></tr>` : ''}
                  ${contact_email ? `<tr><td style="padding: 6px 0; color: #666;">Email</td><td style="padding: 6px 0;">${contact_email}</td></tr>` : ''}
                  ${contact_phone ? `<tr><td style="padding: 6px 0; color: #666;">Phone</td><td style="padding: 6px 0;">${contact_phone}</td></tr>` : ''}
                  ${notes ? `<tr><td style="padding: 6px 0; color: #666;">Notes</td><td style="padding: 6px 0;">${notes}</td></tr>` : ''}
                </table>
                <p style="margin-top: 20px; color: #999; font-size: 12px;">View this booking in your dashboard.</p>
              </div>
            `,
          }),
        }).catch(() => {});
      }
    } catch {
      // Non-critical
    }

    return NextResponse.json(
      {
        success: true,
        appointment: {
          id: appointment.id,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          title: appointment.title,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
