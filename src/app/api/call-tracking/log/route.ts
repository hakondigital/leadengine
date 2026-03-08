import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Webhook endpoint to log incoming calls (Telnyx or internal)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      To,
      From,
      CallSid,
      CallDuration,
      CallStatus,
      RecordingUrl,
      CallerCity,
      CallerState,
      CallerCountry,
    } = body;

    if (!To || !From) {
      return NextResponse.json({ error: 'To and From required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Find tracking number to determine org
    const { data: trackingNumber } = await supabase
      .from('tracking_numbers')
      .select('*')
      .eq('phone_number', To)
      .eq('is_active', true)
      .single();

    if (!trackingNumber) {
      console.warn(`No tracking number found for: ${To}`);
      return NextResponse.json({ error: 'Tracking number not found' }, { status: 404 });
    }

    // Try to match caller to existing lead by phone
    const callerPhone = From.replace(/\D/g, '');
    const { data: matchedLead } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email')
      .eq('organization_id', trackingNumber.organization_id)
      .or(`phone.ilike.%${callerPhone.slice(-10)}%`)
      .limit(1)
      .single();

    // Log the call
    const { data: callLog, error } = await supabase
      .from('call_logs')
      .insert({
        organization_id: trackingNumber.organization_id,
        tracking_number_id: trackingNumber.id,
        caller_number: From,
        called_number: To,
        provider_sid: CallSid || null,
        duration_seconds: CallDuration ? parseInt(CallDuration) : null,
        status: CallStatus || 'completed',
        recording_url: RecordingUrl || null,
        lead_id: matchedLead?.id || null,
        caller_location: [CallerCity, CallerState, CallerCountry].filter(Boolean).join(', ') || null,
        source: trackingNumber.source || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Call log error:', error);
      return NextResponse.json({ error: 'Failed to log call' }, { status: 500 });
    }

    return NextResponse.json({
      call_log: callLog,
      matched_lead: matchedLead || null,
    }, { status: 201 });
  } catch (error) {
    console.error('Call log error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
