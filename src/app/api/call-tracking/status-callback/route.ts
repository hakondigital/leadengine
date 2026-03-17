import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Twilio status callback — called when a dialed call leg completes.
// Updates call_logs with final duration and status.
// If the call was missed, auto-sends an SMS to the caller with a booking link.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get('CallSid') as string;
    const dialCallStatus = formData.get('DialCallStatus') as string;
    const dialCallDuration = formData.get('DialCallDuration') as string;

    if (!callSid) {
      return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } });
    }

    const supabase = await createServiceRoleClient();

    // Map Twilio dial statuses to our statuses
    const statusMap: Record<string, string> = {
      completed: 'answered',
      busy: 'busy',
      'no-answer': 'missed',
      failed: 'failed',
      canceled: 'missed',
    };

    const status = statusMap[dialCallStatus] || 'missed';
    const duration = dialCallDuration ? parseInt(dialCallDuration) : 0;

    await supabase
      .from('call_logs')
      .update({
        duration_seconds: duration,
        status,
      })
      .eq('provider_sid', callSid);

    // ── Missed Call Auto-SMS ──────────────────────────────────────
    // If the call was missed/busy, send the caller an automatic SMS
    // with an apology and a booking link so they can schedule a callback.
    if (status === 'missed' || status === 'busy') {
      const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
      const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;

      if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && appUrl) {
        // Get the call log to find caller number and org
        const { data: callLog } = await supabase
          .from('call_logs')
          .select('caller_number, called_number, organization_id')
          .eq('provider_sid', callSid)
          .single();

        if (callLog?.caller_number && callLog.organization_id) {
          // Check if org has missed-call SMS enabled
          const { data: org } = await supabase
            .from('organizations')
            .select('name, settings')
            .eq('id', callLog.organization_id)
            .single();

          const settings = (org?.settings as Record<string, unknown>) || {};
          if (settings.missed_call_sms_enabled !== false && org) {
            const bookingLink = `${appUrl}/book/${callLog.organization_id}`;
            const smsBody = `Hi, this is ${org.name}. Sorry we missed your call! We'll try to call you back shortly. If you'd like to book a time that suits you, tap here: ${bookingLink}`;

            try {
              await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
                  },
                  body: new URLSearchParams({
                    From: callLog.called_number,
                    To: callLog.caller_number,
                    Body: smsBody,
                  }).toString(),
                }
              );

              // Log the SMS
              await supabase.from('sms_logs').insert({
                organization_id: callLog.organization_id,
                recipient_phone: callLog.caller_number,
                message: smsBody,
                sms_type: 'missed_call_auto',
                status: 'sent',
              });
            } catch (smsError) {
              console.error('Missed call auto-SMS error:', smsError);
            }
          }
        }
      }
    }

    // Return empty TwiML to end the call cleanly
    return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    console.error('Twilio status callback error:', error);
    return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } });
  }
}
