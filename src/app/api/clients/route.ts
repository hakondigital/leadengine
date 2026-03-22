import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { unauthorized } = await requireCallerOwnsOrg(orgId);
    if (unauthorized) return unauthorized;

    const supabase = await createServiceRoleClient();

    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId);

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company_name.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('type', type);
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data: clients, count, error } = await query;

    if (error) {
      console.error('Clients fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
    }

    return NextResponse.json({
      clients,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Clients fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id, first_name, company_name } = body;

    if (!organization_id) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    if (!first_name && !company_name) {
      return NextResponse.json(
        { error: 'At least one of first_name or company_name is required' },
        { status: 400 }
      );
    }

    const { unauthorized } = await requireCallerOwnsOrg(organization_id);
    if (unauthorized) return unauthorized;

    const supabase = await createServiceRoleClient();

    const { data: client, error } = await supabase
      .from('clients')
      .insert(body)
      .select()
      .single();

    if (error) {
      console.error('Client create error:', error);
      return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Client create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
