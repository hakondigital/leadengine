import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const status = searchParams.get('status');
    const leadId = searchParams.get('lead_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const assignedTo = searchParams.get('assigned_to');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { unauthorized } = await requireCallerOwnsOrg(orgId);
    if (unauthorized) return unauthorized;

    let query = supabase
      .from('appointments')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('start_time', { ascending: true });

    if (status) query = query.eq('status', status);
    if (leadId) query = query.eq('lead_id', leadId);
    if (assignedTo) query = query.eq('assigned_to', assignedTo);
    if (startDate) query = query.gte('start_time', startDate);
    if (endDate) query = query.lte('start_time', endDate);

    const { data: appointments, count, error } = await query;

    if (error) {
      console.error('Appointments fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }

    return NextResponse.json({ appointments, total: count });
  } catch (error) {
    console.error('Appointments fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      lead_id,
      title,
      description,
      start_time,
      end_time,
      location,
      assigned_to,
      status,
      contact_name,
      contact_email,
      contact_phone,
      notes,
    } = body;

    if (!organization_id || !title || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: organization_id, title, start_time, end_time' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        organization_id,
        lead_id: lead_id || null,
        title,
        description: description || null,
        start_time,
        end_time,
        location: location || null,
        assigned_to: assigned_to || null,
        status: status || 'scheduled',
        contact_name: contact_name || null,
        contact_email: contact_email || null,
        contact_phone: contact_phone || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Appointment create error:', error);
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
    }

    // Auto-progress pipeline stage when appointment is linked to a lead (fire and forget)
    if (lead_id) {
      import('@/lib/pipeline-automation').then(({ autoPipelineProgress }) =>
        autoPipelineProgress('appointment_created', lead_id, supabase)
      ).catch(console.error);
    }

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('Appointment create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
