import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature, checkLimit, countTrackingNumbers } from '@/lib/check-plan';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const includeCallLogs = searchParams.get('include_logs') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    // Get tracking numbers
    const { data: trackingNumbers, error: numbersError } = await supabase
      .from('tracking_numbers')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (numbersError) {
      console.error('Tracking numbers fetch error:', numbersError);
      return NextResponse.json({ error: 'Failed to fetch tracking numbers' }, { status: 500 });
    }

    let callLogs = null;
    let callCount = null;

    if (includeCallLogs) {
      const { data, count, error: logsError } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

      if (logsError) {
        console.error('Call logs fetch error:', logsError);
      } else {
        callLogs = data;
        callCount = count;
      }
    }

    return NextResponse.json({
      tracking_numbers: trackingNumbers,
      call_logs: callLogs,
      total_calls: callCount,
      page,
      limit,
    });
  } catch (error) {
    console.error('Call tracking fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id, phone_number, label, source, forwarding_number } = body;

    if (!organization_id || !phone_number) {
      return NextResponse.json(
        { error: 'organization_id and phone_number required' },
        { status: 400 }
      );
    }

    // Check call tracking feature access
    const featureCheck = await checkFeature(organization_id, 'call_tracking');
    if (!featureCheck.allowed) {
      return NextResponse.json({ error: 'Call tracking is not available on your plan. Upgrade to Professional or Enterprise.' }, { status: 403 });
    }

    // Check tracking number limit
    const numCount = await countTrackingNumbers(organization_id);
    const limitCheck = await checkLimit(organization_id, 'tracking_numbers', numCount);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: `Tracking number limit reached (${limitCheck.limit}). Upgrade your plan for more.` }, { status: 403 });
    }

    const supabase = await createServiceRoleClient();

    const { data: trackingNumber, error } = await supabase
      .from('tracking_numbers')
      .insert({
        organization_id,
        phone_number,
        label: label || null,
        source: source || null,
        forwarding_number: forwarding_number || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Tracking number create error:', error);
      return NextResponse.json({ error: 'Failed to create tracking number' }, { status: 500 });
    }

    return NextResponse.json(trackingNumber, { status: 201 });
  } catch (error) {
    console.error('Tracking number create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
