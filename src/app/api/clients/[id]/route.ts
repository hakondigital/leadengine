import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { unauthorized } = await requireCallerOwnsOrg(client.organization_id);
    if (unauthorized) return unauthorized;

    // Fetch all leads linked to this client
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false });

    const leadIds = (leads || []).map((l: { id: string }) => l.id);

    // Fetch related data in parallel
    const [activitiesResult, quotesResult, appointmentsResult, inboxResult] = await Promise.all([
      supabase
        .from('client_activities')
        .select('*')
        .eq('client_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      leadIds.length > 0
        ? supabase
            .from('quotes')
            .select('*')
            .in('lead_id', leadIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      leadIds.length > 0
        ? supabase
            .from('appointments')
            .select('*')
            .in('lead_id', leadIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
      leadIds.length > 0
        ? supabase
            .from('inbox_messages')
            .select('*')
            .in('lead_id', leadIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    return NextResponse.json({
      ...client,
      leads: leads || [],
      activities: activitiesResult.data || [],
      quotes: quotesResult.data || [],
      appointments: appointmentsResult.data || [],
      inbox_messages: inboxResult.data || [],
    });
  } catch (error) {
    console.error('Client fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const ALLOWED_FIELDS = [
  'first_name', 'last_name', 'email', 'phone',
  'company_name', 'company_abn', 'job_title',
  'address', 'city', 'state', 'postcode', 'country',
  'status', 'type', 'tags', 'source',
  'total_invoiced', 'total_paid', 'outstanding_balance', 'lifetime_value',
  'notes',
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createServiceRoleClient();

    // Verify client exists
    const { data: existing, error: fetchError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { unauthorized } = await requireCallerOwnsOrg(existing.organization_id);
    if (unauthorized) return unauthorized;

    // Filter to allowed fields only
    const updateData: Record<string, unknown> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        updateData[key] = body[key];
      }
    }

    // Recalculate outstanding_balance if invoiced or paid changed
    if ('total_invoiced' in updateData || 'total_paid' in updateData) {
      const invoiced = (updateData.total_invoiced as number) ?? (existing.total_invoiced as number) ?? 0;
      const paid = (updateData.total_paid as number) ?? (existing.total_paid as number) ?? 0;
      updateData.outstanding_balance = invoiced - paid;
    }

    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Client update error:', error);
      return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('Client update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    // Verify client exists and check ownership
    const { data: existing, error: fetchError } = await supabase
      .from('clients')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { unauthorized } = await requireCallerOwnsOrg(existing.organization_id);
    if (unauthorized) return unauthorized;

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Client delete error:', error);
      return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Client delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
