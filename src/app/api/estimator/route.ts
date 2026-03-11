import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const orgId = request.nextUrl.searchParams.get('organization_id');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { data: configs, error } = await supabase
      .from('estimator_configs')
      .select('id, service_type, min_price, max_price, unit, is_active, created_at')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('service_type', { ascending: true });

    if (error) {
      console.error('Estimator configs fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch estimator configs' }, { status: 500 });
    }

    return NextResponse.json({ configs: configs ?? [] });
  } catch (error) {
    console.error('Estimator fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id, service_type, min_price, max_price, unit } = body;

    if (!organization_id || !service_type) {
      return NextResponse.json(
        { error: 'organization_id and service_type required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('estimator_configs')
      .insert({
        organization_id,
        service_type,
        min_price: min_price || 0,
        max_price: max_price || 0,
        unit: unit || 'job',
      })
      .select()
      .single();

    if (error) {
      console.error('Estimator config save error:', error);
      return NextResponse.json({ error: 'Failed to create estimator config' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Estimator config save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
