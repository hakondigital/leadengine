import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { data: rules, error } = await supabase
      .from('assignment_rules')
      .select('*')
      .eq('organization_id', orgId)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Assignment rules fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch assignment rules' }, { status: 500 });
    }

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Assignment rules fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      name,
      type,
      criteria,
      assigned_to,
      priority,
      is_active,
    } = body;

    if (!organization_id || !name || !type || !assigned_to) {
      return NextResponse.json(
        { error: 'organization_id, name, type, and assigned_to required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    const { data: rule, error } = await supabase
      .from('assignment_rules')
      .insert({
        organization_id,
        name,
        type, // round_robin, service_type, location
        criteria: criteria || {},
        assigned_to,
        priority: priority || 0,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Assignment rule create error:', error);
      return NextResponse.json({ error: 'Failed to create assignment rule' }, { status: 500 });
    }

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    console.error('Assignment rule create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
