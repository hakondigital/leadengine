import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;
const TELNYX_API_URL = 'https://api.telnyx.com/v2';

async function telnyxCommand(callControlId: string, action: string, payload: Record<string, unknown> = {}) {
  const res = await fetch(`${TELNYX_API_URL}/calls/${callControlId}/actions/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TELNYX_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`Telnyx ${action} failed:`, err);
  }
  return res;
}

// Telnyx voice webhook — called when a tracking number receives a call.
// Uses Telnyx Call Control to answer, play disclaimer, record, and forward.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const eventType = body.data?.event_type;
    const payload = body.data?.payload;

    if (!eventType || !payload) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
    }

    const callControlId = payload.call_control_id;
    const to = payload.to;
    const from = payload.from;
    const callLegId = payload.call_leg_id;

    const supabase = await createServiceRoleClient();

    // --- INCOMING CALL ---
    if (eventType === 'call.initiated' && payload.direction === 'incoming') {
      // Look up the tracking number
      const { data: trackingNumber } = await supabase
        .from('tracking_numbers')
        .select('*')
        .eq('phone_number', to)
        .eq('is_active', true)
        .single();

      if (!trackingNumber || !trackingNumber.forwarding_number) {
        await telnyxCommand(callControlId, 'hangup');
        return NextResponse.json({ status: 'no_tracking_number' });
      }

      // Answer the call
      await telnyxCommand(callControlId, 'answer');

      // Log the incoming call immediately
      await supabase.from('call_logs').insert({
        organization_id: trackingNumber.organization_id,
        tracking_number_id: trackingNumber.id,
        caller_number: from,
        called_number: to,
        provider_sid: callLegId || callControlId,
        status: 'ringing',
        source: trackingNumber.source || null,
      });

      return NextResponse.json({ status: 'answered' });
    }

    // --- CALL ANSWERED — now speak disclaimer and transfer ---
    if (eventType === 'call.answered') {
      // Find tracking number from the called number
      const calledNumber = payload.to;
      const { data: trackingNumber } = await supabase
        .from('tracking_numbers')
        .select('*, organizations:organization_id(settings)')
        .eq('phone_number', calledNumber)
        .eq('is_active', true)
        .single();

      if (!trackingNumber) {
        await telnyxCommand(callControlId, 'hangup');
        return NextResponse.json({ status: 'no_tracking_number' });
      }

      const settings = (trackingNumber.organizations?.settings as Record<string, unknown>) || {};
      const isEnterprise = settings.plan === 'enterprise';

      // Check if org has a super admin (they get full features regardless of plan)
      const { data: orgUsers } = await supabase
        .from('users')
        .select('email')
        .eq('organization_id', trackingNumber.organization_id);

      const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const hasSuperAdmin = orgUsers?.some(u => SUPER_ADMIN_EMAILS.includes(u.email?.toLowerCase())) || false;
      const canRecord = isEnterprise || hasSuperAdmin;

      if (canRecord) {
        // Enterprise: play recording disclaimer first, then transfer will happen on speak.ended
        await telnyxCommand(callControlId, 'speak', {
          payload: 'For quality and training purposes, this call may be recorded.',
          voice: 'female',
          language: 'en-US',
        });
      } else {
        // Non-enterprise: transfer immediately without recording
        await telnyxCommand(callControlId, 'transfer', {
          to: trackingNumber.forwarding_number,
        });
      }

      return NextResponse.json({ status: 'processing' });
    }

    // --- SPEAK FINISHED — now start recording and transfer ---
    if (eventType === 'call.speak.ended') {
      const calledNumber = payload.to;
      const { data: trackingNumber } = await supabase
        .from('tracking_numbers')
        .select('*')
        .eq('phone_number', calledNumber)
        .eq('is_active', true)
        .single();

      if (trackingNumber) {
        // Start recording before transfer
        await telnyxCommand(callControlId, 'record_start', {
          format: 'wav',
          channels: 'dual',
        });

        // Transfer to the business number
        await telnyxCommand(callControlId, 'transfer', {
          to: trackingNumber.forwarding_number,
        });
      }

      return NextResponse.json({ status: 'transferred' });
    }

    // --- CALL ENDED ---
    if (eventType === 'call.hangup') {
      const duration = payload.duration_secs || 0;
      const hangupCause = payload.hangup_cause || 'normal';
      const providerSid = payload.call_leg_id || callControlId;

      const status = duration > 0 ? 'answered' : hangupCause === 'normal' ? 'missed' : 'busy';

      await supabase
        .from('call_logs')
        .update({
          duration_seconds: duration,
          status,
        })
        .eq('provider_sid', providerSid);

      return NextResponse.json({ status: 'logged' });
    }

    // --- RECORDING SAVED ---
    if (eventType === 'call.recording.saved') {
      const recordingUrl = payload.recording_urls?.wav || payload.recording_urls?.mp3 || '';
      const providerSid = payload.call_leg_id || callControlId;
      const recordingDuration = payload.duration_secs || 0;

      // Update call log with recording URL
      const { data: callLog } = await supabase
        .from('call_logs')
        .update({
          recording_url: recordingUrl,
          recording_sid: payload.recording_id || null,
          duration_seconds: recordingDuration || undefined,
        })
        .eq('provider_sid', providerSid)
        .select('id, organization_id')
        .single();

      if (!callLog || !recordingUrl) {
        return NextResponse.json({ status: 'no_call_log' });
      }

      // Transcribe and summarize via the recording-callback route
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      fetch(`${appUrl}/api/call-tracking/recording-callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recording_url: recordingUrl,
          call_log_id: callLog.id,
        }),
      }).catch((err) => console.error('Recording callback trigger failed:', err));

      return NextResponse.json({ status: 'recording_saved' });
    }

    // Unhandled event type — acknowledge it
    return NextResponse.json({ status: 'ignored', event: eventType });
  } catch (error) {
    console.error('Telnyx voice webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
