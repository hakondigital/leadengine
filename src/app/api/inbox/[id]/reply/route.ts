import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature } from '@/lib/check-plan';
import { checkSuperAdmin } from '@/lib/super-admin';
import { sendFollowUpEmail } from '@/lib/email';
import { sendFollowUpSMS } from '@/lib/sms';

// POST /api/inbox/[id]/reply
// Send a reply to an inbox message (plan-gated: Pro + Enterprise)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { body: replyBody, organization_id } = await request.json();

    if (!replyBody || !organization_id) {
      return NextResponse.json(
        { error: 'body and organization_id required' },
        { status: 400 }
      );
    }

    // Super admin bypasses all plan gates
    const { isSuperAdmin } = await checkSuperAdmin(request);

    if (!isSuperAdmin) {
      // Plan gate — inbox_compose is Pro + Enterprise only
      const { allowed, plan } = await checkFeature(organization_id, 'inbox_compose');
      if (!allowed) {
        return NextResponse.json(
          {
            error: 'Inbox compose is available on Professional and Enterprise plans',
            upgrade_required: true,
            current_plan: plan,
          },
          { status: 403 }
        );
      }
    }

    const supabase = await createServiceRoleClient();

    // Fetch the original message to get lead_id and channel
    const { data: originalMessage, error: msgError } = await supabase
      .from('inbox_messages')
      .select('*')
      .eq('id', id)
      .single();

    if (msgError || !originalMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Fetch lead and org data for sending
    let lead = null;
    if (originalMessage.lead_id) {
      const { data } = await supabase
        .from('leads')
        .select('*')
        .eq('id', originalMessage.lead_id)
        .single();
      lead = data;
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organization_id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Determine recipient and send
    const channel = originalMessage.channel;
    let sent = false;

    if (channel === 'email' || channel === 'form') {
      const recipientEmail = lead?.email || originalMessage.sender_contact;
      if (recipientEmail && lead) {
        await sendFollowUpEmail(lead, org, replyBody);
        sent = true;
      }
    } else if (channel === 'sms') {
      const recipientPhone = lead?.phone || originalMessage.sender_contact;
      if (recipientPhone) {
        await sendFollowUpSMS(recipientPhone, replyBody, organization_id);
        sent = true;
      }
    }

    // Store the reply in inbox
    const { data: reply, error: insertError } = await supabase
      .from('inbox_messages')
      .insert({
        organization_id,
        lead_id: originalMessage.lead_id || null,
        channel: channel === 'form' ? 'email' : channel,
        direction: 'outbound',
        subject: originalMessage.subject
          ? `Re: ${originalMessage.subject.replace(/^Re: /i, '')}`
          : null,
        body: replyBody,
        is_read: true,
        is_archived: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Reply insert error:', insertError);
      return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 });
    }

    // Mark original as read + replied
    await supabase
      .from('inbox_messages')
      .update({ is_read: true })
      .eq('id', id);

    return NextResponse.json({ ...reply, sent }, { status: 201 });
  } catch (error) {
    console.error('Inbox reply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
