import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendReviewRequestEmail } from '@/lib/email';
import { sendReviewRequestSMS } from '@/lib/sms';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead_id, channels, custom_subject, custom_email_body, custom_sms_body } = body;

    if (!lead_id) {
      return NextResponse.json({ error: 'lead_id required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Get lead with org
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*, organization:organizations(*)')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const org = lead.organization;
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const reviewLink = org.google_review_link || `${process.env.NEXT_PUBLIC_APP_URL}/review/${org.id}`;
    const orgSettings = (org.settings as Record<string, unknown>) || {};
    const outboundPref = (orgSettings.outbound_channel as string) || 'email';
    // Filter out SMS channel if org is email-only mode
    const requestedChannels = channels || ['email'];
    const sendChannels = outboundPref === 'email'
      ? requestedChannels.filter((c: string) => c !== 'sms')
      : requestedChannels;
    const results: Record<string, string> = {};

    // Send email review request (with optional custom content)
    if (sendChannels.includes('email') && lead.email) {
      const emailResult = await sendReviewRequestEmail(
        lead,
        org,
        reviewLink,
        custom_subject,
        custom_email_body
      );
      results.email = emailResult ? 'sent' : 'failed';
    }

    // Send SMS review request (with optional custom body)
    if (sendChannels.includes('sms') && lead.phone) {
      const smsBody = custom_sms_body
        ? `${custom_sms_body} ${reviewLink}`
        : undefined;

      const smsResult = smsBody
        ? await sendReviewRequestSMS(lead.phone, lead.first_name, org.name, reviewLink, smsBody, org.id)
        : await sendReviewRequestSMS(lead.phone, lead.first_name, org.name, reviewLink, undefined, org.id);

      results.sms = smsResult ? 'sent' : 'failed';

      // Log SMS
      if (smsResult) {
        await supabase.from('sms_logs').insert({
          lead_id: lead.id,
          organization_id: org.id,
          recipient_phone: lead.phone,
          message: `Review request to ${lead.first_name}`,
          sms_type: 'review_request',
          status: 'sent',
          twilio_sid: smsResult.id,
        });
      }
    }

    // Record that review was requested
    await supabase.from('lead_notes').insert({
      lead_id: lead.id,
      content: `Review request sent via ${Object.keys(results).join(', ')}`,
      is_system: true,
    });

    return NextResponse.json({
      success: true,
      channels: results,
      review_link: reviewLink,
    });
  } catch (error) {
    console.error('Review request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
