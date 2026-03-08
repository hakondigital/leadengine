import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature } from '@/lib/check-plan';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { data: campaigns, error } = await supabase
      .from('weather_campaigns')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Weather campaigns fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch weather campaigns' }, { status: 500 });
    }

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error('Weather campaigns fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      name,
      trigger_conditions,
      message_template,
      sms_template,
      target_postcodes,
      is_active,
    } = body;

    if (!organization_id || !name || !trigger_conditions) {
      return NextResponse.json(
        { error: 'organization_id, name, and trigger_conditions required' },
        { status: 400 }
      );
    }

    const weatherCheck = await checkFeature(organization_id, 'weather_campaigns');
    if (!weatherCheck.allowed) {
      return NextResponse.json({ error: 'Weather campaigns are not available on your plan. Upgrade to Professional or Enterprise.' }, { status: 403 });
    }

    const supabase = await createServiceRoleClient();

    // trigger_conditions example:
    // { weather_type: "rain", min_temp: null, max_temp: null, wind_speed_min: null }
    // { weather_type: "heat", min_temp: 35 }
    // { weather_type: "storm" }

    const { data: campaign, error } = await supabase
      .from('weather_campaigns')
      .insert({
        organization_id,
        name,
        trigger_conditions,
        message_template: message_template || null,
        sms_template: sms_template || null,
        target_postcodes: target_postcodes || [],
        is_active: is_active ?? true,
        last_triggered_at: null,
      })
      .select()
      .single();

    if (error) {
      console.error('Weather campaign create error:', error);
      return NextResponse.json({ error: 'Failed to create weather campaign' }, { status: 500 });
    }

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Weather campaign create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
