import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const date = searchParams.get('date');
    const duration = parseInt(searchParams.get('duration') || '30');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    // ── No date: return which days of the week have availability ──
    if (!date) {
      const { data: slots, error } = await supabase
        .from('availability_slots')
        .select('day_of_week, start_time, end_time')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

      if (error) {
        console.error('Availability days error:', error);
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
      }

      const availableDays = [...new Set((slots || []).map((s: Record<string, unknown>) => s.day_of_week as number))];
      return NextResponse.json({ available_days: availableDays });
    }

    // ── Date provided: return bookable time slots for that date ──
    const requestedDate = new Date(date + 'T00:00:00');
    const dayOfWeek = requestedDate.getDay(); // 0=Sun

    // Get availability windows for this day of week
    const { data: slots, error: slotsError } = await supabase
      .from('availability_slots')
      .select('start_time, end_time')
      .eq('organization_id', orgId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true)
      .order('start_time');

    if (slotsError) {
      console.error('Availability slots error:', slotsError);
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }

    if (!slots || slots.length === 0) {
      return NextResponse.json({ time_slots: [], date });
    }

    // Get existing appointments for that date to detect conflicts
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('start_time, end_time')
      .eq('organization_id', orgId)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .in('status', ['scheduled', 'confirmed']);

    // Generate bookable time slots
    const timeSlots: { time: string; display: string }[] = [];
    const now = new Date();

    for (const slot of slots) {
      const [startH, startM] = (slot.start_time as string).split(':').map(Number);
      const [endH, endM] = (slot.end_time as string).split(':').map(Number);

      let curH = startH;
      let curM = startM;

      while (curH * 60 + curM + duration <= endH * 60 + endM) {
        const timeStr = `${String(curH).padStart(2, '0')}:${String(curM).padStart(2, '0')}`;
        const slotStart = new Date(`${date}T${timeStr}:00`);
        const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

        // Skip past time slots
        if (slotStart <= now) {
          curM += duration;
          if (curM >= 60) { curH += Math.floor(curM / 60); curM %= 60; }
          continue;
        }

        // Check for conflicts with existing appointments
        const hasConflict = (existingAppointments || []).some((appt: Record<string, unknown>) => {
          const apptStart = new Date(appt.start_time as string).getTime();
          const apptEnd = new Date(appt.end_time as string).getTime();
          return apptStart < slotEnd.getTime() && apptEnd > slotStart.getTime();
        });

        if (!hasConflict) {
          const period = curH >= 12 ? 'PM' : 'AM';
          const displayH = curH > 12 ? curH - 12 : curH === 0 ? 12 : curH;
          timeSlots.push({
            time: timeStr,
            display: `${displayH}:${String(curM).padStart(2, '0')} ${period}`,
          });
        }

        curM += duration;
        if (curM >= 60) { curH += Math.floor(curM / 60); curM %= 60; }
      }
    }

    return NextResponse.json({ time_slots: timeSlots, date });
  } catch (error) {
    console.error('Public availability error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
