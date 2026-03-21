import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Twilio voice webhook — called when a tracking number receives a call.
// Responds with TwiML to play disclaimer (if recording enabled), then forward the call.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;

    if (!to || !from) {
      return new Response('<Response><Say>An error occurred.</Say><Hangup/></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const supabase = await createServiceRoleClient();

    // Look up the tracking number
    const { data: trackingNumber } = await supabase
      .from('tracking_numbers')
      .select('*, organizations:organization_id(settings)')
      .eq('phone_number', to)
      .eq('is_active', true)
      .single();

    if (!trackingNumber || !trackingNumber.forwarding_number) {
      return new Response(
        '<Response><Say>Sorry, this number is not currently active.</Say><Hangup/></Response>',
        { headers: { 'Content-Type': 'text/xml' } }
      );
    }

    // Log the incoming call
    await supabase.from('call_logs').insert({
      organization_id: trackingNumber.organization_id,
      tracking_number_id: trackingNumber.id,
      caller_number: from,
      called_number: to,
      provider_sid: callSid,
      status: 'ringing',
      source: trackingNumber.source || null,
    });

    // Check if org can record (enterprise plan or super admin)
    const settings = (trackingNumber.organizations?.settings as Record<string, unknown>) || {};
    const isEnterprise = settings.plan === 'enterprise';

    const { data: orgUsers } = await supabase
      .from('users')
      .select('email')
      .eq('organization_id', trackingNumber.organization_id);

    const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const hasSuperAdmin =
      orgUsers?.some((u) => SUPER_ADMIN_EMAILS.includes(u.email?.toLowerCase())) || false;
    const canRecord = isEnterprise || hasSuperAdmin;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return new Response('<Response><Say>Server configuration error.</Say><Hangup/></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }
    const recordingCallback = `${appUrl}/api/call-tracking/recording-callback`;
    const statusCallback = `${appUrl}/api/call-tracking/status-callback`;

    // Build TwiML response
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    // Pass the caller's real number as callerId so the business owner
    // sees who is actually calling — not the tracking number.
    // This means missed-call callbacks go straight to the lead.
    const callerId = from;

    if (canRecord) {
      twiml += '<Say voice="Polly.Nicole">For quality and training purposes, this call may be recorded.</Say>';
      twiml += `<Dial callerId="${callerId}" record="record-from-answer-dual" recordingStatusCallback="${recordingCallback}" recordingStatusCallbackMethod="POST" action="${statusCallback}" method="POST">`;
    } else {
      twiml += `<Dial callerId="${callerId}" action="${statusCallback}" method="POST">`;
    }

    twiml += `<Number>${trackingNumber.forwarding_number}</Number>`;
    twiml += '</Dial></Response>';

    return new Response(twiml, {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Twilio voice webhook error:', error);
    return new Response('<Response><Say>An error occurred.</Say><Hangup/></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
