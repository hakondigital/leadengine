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

    const { data: serviceAreas, error } = await supabase
      .from('service_areas')
      .select('*')
      .eq('organization_id', orgId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Service areas fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch service areas' }, { status: 500 });
    }

    return NextResponse.json({ service_areas: serviceAreas });
  } catch (error) {
    console.error('Service areas fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      name,
      postcodes,
      suburbs,
      radius_km,
      center_lat,
      center_lng,
      assigned_to,
      is_active,
    } = body;

    if (!organization_id || !name) {
      return NextResponse.json(
        { error: 'organization_id and name required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Normalize postcodes for matching
    const normalizedPostcodes = (postcodes || []).map((p: string) =>
      p.toString().trim().toUpperCase()
    );

    const { data: serviceArea, error } = await supabase
      .from('service_areas')
      .insert({
        organization_id,
        name,
        postcodes: normalizedPostcodes,
        suburbs: suburbs || [],
        radius_km: radius_km || null,
        center_lat: center_lat || null,
        center_lng: center_lng || null,
        assigned_to: assigned_to || null,
        is_active: is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Service area create error:', error);
      return NextResponse.json({ error: 'Failed to create service area' }, { status: 500 });
    }

    return NextResponse.json(serviceArea, { status: 201 });
  } catch (error) {
    console.error('Service area create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
