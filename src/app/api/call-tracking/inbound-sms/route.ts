import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { detectSignal, autoConvertLead, autoRejectLead } from '@/lib/auto-convert';

// POST /api/call-tracking/inbound-sms
// Twilio SMS webhook — receives inbound SMS messages sent to tracked numbers.
// Saves them as inbox messages so the business can see and reply from dashboard.

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const body = formData.get('Body') as string;
    const messageSid = formData.get('MessageSid') as string;

    if (!from || !to || !body) {
      return new NextResponse('<?xml version="1.0"?><Response/>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const supabase = await createServiceRoleClient();

    // Find which org owns this tracking number
    const { data: trackingNumber } = await supabase
      .from('tracking_numbers')
      .select('organization_id')
      .eq('phone_number', to)
      .single();

    if (trackingNumber) {
      // Try to find an existing lead with this phone number
      const { data: lead } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email')
        .eq('organization_id', trackingNumber.organization_id)
        .eq('phone', from)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      await supabase.from('inbox_messages').insert({
        organization_id: trackingNumber.organization_id,
        lead_id: lead?.id || null,
        channel: 'sms',
        direction: 'inbound',
        sender_name: lead ? `${lead.first_name} ${lead.last_name}`.trim() : from,
        sender_contact: from,
        body: body,
        is_read: false,
        metadata: { twilio_sid: messageSid, to_number: to },
      });

      // AI buying signal detection — auto-convert or auto-reject
      if (lead?.id) {
        const signal = detectSignal(body);
        if (signal === 'buying') {
          autoConvertLead(lead.id).catch(console.error);
        } else if (signal === 'rejection') {
          autoRejectLead(lead.id).catch(console.error);
        }
      }
    }

    // Return empty TwiML — no auto-reply
    return new NextResponse('<?xml version="1.0"?><Response/>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Inbound SMS error:', error);
    return new NextResponse('<?xml version="1.0"?><Response/>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
