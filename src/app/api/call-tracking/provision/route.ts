import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature, checkLimit, countTrackingNumbers } from '@/lib/check-plan';

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;

// Order a phone number from Telnyx and save it as a tracking number
export async function POST(request: NextRequest) {
  try {
    const { organization_id, phone_number, label, source, forwarding_number } =
      await request.json();

    if (!organization_id || !phone_number || !forwarding_number) {
      return NextResponse.json(
        { error: 'organization_id, phone_number, and forwarding_number are required' },
        { status: 400 }
      );
    }

    // Check call tracking feature access
    const featureCheck = await checkFeature(organization_id, 'call_tracking');
    if (!featureCheck.allowed) {
      return NextResponse.json(
        { error: 'Call tracking is not available on your plan. Upgrade to Professional or Enterprise.' },
        { status: 403 }
      );
    }

    // Check tracking number limit
    const numCount = await countTrackingNumbers(organization_id);
    const limitCheck = await checkLimit(organization_id, 'tracking_numbers', numCount);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        { error: `Tracking number limit reached (${limitCheck.limit}). Upgrade your plan for more.` },
        { status: 403 }
      );
    }

    if (!TELNYX_API_KEY) {
      return NextResponse.json({ error: 'Telnyx not configured' }, { status: 500 });
    }

    // Step 1: Order the number from Telnyx
    const orderRes = await fetch('https://api.telnyx.com/v2/number_orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TELNYX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_numbers: [{ phone_number }],
      }),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      console.error('Telnyx order error:', err);
      return NextResponse.json(
        { error: 'Failed to order phone number from Telnyx. It may no longer be available.' },
        { status: 502 }
      );
    }

    const orderData = await orderRes.json();
    const orderId = orderData.data?.id;
    const orderStatus = orderData.data?.status;

    // Step 2: Save the tracking number to our database
    const supabase = await createServiceRoleClient();

    const { data: trackingNumber, error: dbError } = await supabase
      .from('tracking_numbers')
      .insert({
        organization_id,
        phone_number,
        forward_to: forwarding_number,
        label: label || 'New Number',
        source: source || 'provisioned',
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB insert error:', dbError);
      return NextResponse.json({ error: 'Number ordered but failed to save. Contact support.' }, { status: 500 });
    }

    return NextResponse.json({
      tracking_number: trackingNumber,
      telnyx_order_id: orderId,
      telnyx_order_status: orderStatus,
    }, { status: 201 });
  } catch (error) {
    console.error('Provision error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
