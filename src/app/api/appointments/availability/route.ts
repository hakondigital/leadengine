import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const date = searchParams.get('date');

    if (!orgId || !date) {
      return NextResponse.json(
        { error: 'organization_id and date required' },
        { status: 400 }
      );
    }

    // Get the day of week for the requested date
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay(); // 0=Sunday, 6=Saturday

    // Get availability slots for this org and day
    const { data: slots, error: slotsError } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('organization_id', orgId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .order('start_time', { ascending: true });

    if (slotsError) {
      console.error('Availability fetch error:', slotsError);
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }

    // Get existing appointments for that date to find conflicts
    const dayStart = `${date}T00:00:00.000Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const { data: existingAppointments, error: apptError } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('organization_id', orgId)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .in('status', ['scheduled', 'confirmed']);

    if (apptError) {
      console.error('Appointments fetch error:', apptError);
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }

    // Calculate available time windows by removing booked slots
    const available = (slots || []).map((slot: Record<string, unknown>) => {
      const slotStart = `${date}T${slot.start_time}`;
      const slotEnd = `${date}T${slot.end_time}`;

      const conflicts = (existingAppointments || []).filter((appt: Record<string, unknown>) => {
        const apptStart = new Date(appt.start_time as string).getTime();
        const apptEnd = new Date(appt.end_time as string).getTime();
        const sStart = new Date(slotStart).getTime();
        const sEnd = new Date(slotEnd).getTime();
        return apptStart < sEnd && apptEnd > sStart;
      });

      return {
        ...slot,
        date,
        conflicts: conflicts.length,
        is_available: conflicts.length === 0,
      };
    });

    return NextResponse.json({ slots: available, date, day_of_week: dayOfWeek });
  } catch (error) {
    console.error('Availability fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id, slots } = body;

    if (!organization_id || !slots || !Array.isArray(slots)) {
      return NextResponse.json(
        { error: 'organization_id and slots array required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Upsert availability slots
    const slotsWithOrg = slots.map((slot: Record<string, unknown>) => ({
      ...slot,
      organization_id,
    }));

    const { data, error } = await supabase
      .from('availability_slots')
      .upsert(slotsWithOrg, { onConflict: 'organization_id,day_of_week,start_time' })
      .select();

    if (error) {
      console.error('Availability save error:', error);
      return NextResponse.json({ error: 'Failed to save availability' }, { status: 500 });
    }

    return NextResponse.json({ slots: data }, { status: 201 });
  } catch (error) {
    console.error('Availability save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
