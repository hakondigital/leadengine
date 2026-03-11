import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Twilio status callback — called when a dialed call leg completes.
// Updates call_logs with final duration and status.
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

    // Return empty TwiML to end the call cleanly
    return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    console.error('Twilio status callback error:', error);
    return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } });
  }
}
