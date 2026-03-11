import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature } from '@/lib/check-plan';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const orgId = request.nextUrl.searchParams.get('organization_id');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { data: campaigns, error } = await supabase
      .from('weather_campaigns')
      .select('id, name, weather_trigger, target_postcodes, email_body, sms_body, is_active, last_triggered_at, created_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Weather campaigns fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch weather campaigns' }, { status: 500 });
    }

    return NextResponse.json({ campaigns: campaigns ?? [] });
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
      weather_trigger,
      target_postcodes,
      email_body,
      sms_body,
      is_active,
    } = body;

    if (!organization_id || !name || !weather_trigger) {
      return NextResponse.json(
        { error: 'organization_id, name, and weather_trigger required' },
        { status: 400 }
      );
    }

    const weatherCheck = await checkFeature(organization_id, 'weather_campaigns');
    if (!weatherCheck.allowed) {
      return NextResponse.json(
        { error: 'Weather campaigns are not available on your plan. Upgrade to Professional or Enterprise.' },
        { status: 403 }
      );
    }

    const supabase = await createServiceRoleClient();

    const { data: campaign, error } = await supabase
      .from('weather_campaigns')
      .insert({
        organization_id,
        name,
        weather_trigger,
        target_postcodes: target_postcodes || [],
        email_body: email_body || null,
        sms_body: sms_body || null,
        is_active: is_active ?? true,
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
