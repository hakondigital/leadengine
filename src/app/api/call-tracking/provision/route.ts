import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature, checkLimit, countTrackingNumbers } from '@/lib/check-plan';
import { checkSuperAdmin } from '@/lib/super-admin';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

function twilioAuth(): string {
  return 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
}

// Purchase a phone number from Twilio and save it as a tracking number
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

    // Super admin bypasses plan checks
    const { isSuperAdmin } = await checkSuperAdmin(request);

    if (!isSuperAdmin) {
      const featureCheck = await checkFeature(organization_id, 'call_tracking');
      if (!featureCheck.allowed) {
        return NextResponse.json(
          { error: 'Call tracking is not available on your plan. Upgrade to Professional or Enterprise.' },
          { status: 403 }
        );
      }

      const numCount = await countTrackingNumbers(organization_id);
      const limitCheck = await checkLimit(organization_id, 'tracking_numbers', numCount);
      if (!limitCheck.allowed) {
        return NextResponse.json(
          { error: `Tracking number limit reached (${limitCheck.limit}). Upgrade your plan for more.` },
          { status: 403 }
        );
      }
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';

    // Step 1: Purchase the number from Twilio and configure webhooks
    const purchaseRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: twilioAuth(),
        },
        body: new URLSearchParams({
          PhoneNumber: phone_number,
          VoiceUrl: `${appUrl}/api/call-tracking/voice`,
          VoiceMethod: 'POST',
          StatusCallback: `${appUrl}/api/call-tracking/status-callback`,
          StatusCallbackMethod: 'POST',
        }).toString(),
      }
    );

    if (!purchaseRes.ok) {
      const err = await purchaseRes.text();
      console.error('Twilio purchase error:', err);
      return NextResponse.json(
        { error: 'Failed to purchase phone number from Twilio. It may no longer be available.' },
        { status: 502 }
      );
    }

    const purchaseData = await purchaseRes.json();
    const twilioSid = purchaseData.sid;

    // Step 2: Save the tracking number to our database
    const supabase = await createServiceRoleClient();

    const { data: trackingNumber, error: dbError } = await supabase
      .from('tracking_numbers')
      .insert({
        organization_id,
        phone_number,
        forwarding_number,
        label: label || 'New Number',
        source: source || 'provisioned',
        is_active: true,
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB insert error:', dbError);
      return NextResponse.json({ error: 'Number purchased but failed to save. Contact support.' }, { status: 500 });
    }

    return NextResponse.json({
      tracking_number: trackingNumber,
      twilio_sid: twilioSid,
    }, { status: 201 });
  } catch (error) {
    console.error('Provision error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
