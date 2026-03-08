import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendFollowUpEmail } from '@/lib/email';
import { sendFollowUpSMS } from '@/lib/sms';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const channel = searchParams.get('channel');
    const isRead = searchParams.get('is_read');
    const leadId = searchParams.get('lead_id');
    const isArchived = searchParams.get('is_archived');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    let query = supabase
      .from('inbox_messages')
      .select('*, lead:leads(id, first_name, last_name, email, phone)', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (channel) query = query.eq('channel', channel);
    if (isRead !== null && isRead !== undefined) query = query.eq('is_read', isRead === 'true');
    if (leadId) query = query.eq('lead_id', leadId);
    if (isArchived !== null && isArchived !== undefined) {
      query = query.eq('is_archived', isArchived === 'true');
    } else {
      // Default: don't show archived
      query = query.eq('is_archived', false);
    }

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: messages, count, error } = await query;

    if (error) {
      console.error('Inbox fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('inbox_messages')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('is_read', false)
      .eq('is_archived', false);

    return NextResponse.json({
      messages,
      total: count,
      unread: unreadCount || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Inbox fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      lead_id,
      channel,
      direction,
      subject,
      body: messageBody,
      recipient_email,
      recipient_phone,
    } = body;

    if (!organization_id || !channel || !messageBody) {
      return NextResponse.json(
        { error: 'organization_id, channel, and body required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // If outbound, send the message
    if (direction === 'outbound') {
      // Get lead and org for sending
      let lead = null;
      let org = null;

      if (lead_id) {
        const { data } = await supabase
          .from('leads')
          .select('*')
          .eq('id', lead_id)
          .single();
        lead = data;
      }

      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organization_id)
        .single();
      org = orgData;

      if (channel === 'email' && (recipient_email || lead?.email)) {
        const toEmail = recipient_email || lead.email;
        if (lead && org) {
          await sendFollowUpEmail(lead, org, messageBody);
        }
      } else if (channel === 'sms' && (recipient_phone || lead?.phone)) {
        const toPhone = recipient_phone || lead.phone;
        await sendFollowUpSMS(toPhone, messageBody);
      }
    }

    // Store message in inbox
    const { data: message, error } = await supabase
      .from('inbox_messages')
      .insert({
        organization_id,
        lead_id: lead_id || null,
        channel,
        direction: direction || 'outbound',
        subject: subject || null,
        body: messageBody,
        is_read: direction === 'outbound', // Outbound messages are auto-read
        is_archived: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Inbox message create error:', error);
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    console.error('Inbox message create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
