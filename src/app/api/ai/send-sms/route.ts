import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendFollowUpSMS } from '@/lib/sms';
import { checkFeature, checkLimit, countSmsThisMonth } from '@/lib/check-plan';

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user: authUser } } = await authClient.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_id', authUser.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check SMS feature access
    const smsCheck = await checkFeature(userProfile.organization_id, 'sms_enabled');
    if (!smsCheck.allowed) {
      return NextResponse.json({ error: 'SMS is not available on your plan. Upgrade to Professional or Enterprise.' }, { status: 403 });
    }

    // Check SMS monthly limit
    const smsCount = await countSmsThisMonth(userProfile.organization_id);
    const limitCheck = await checkLimit(userProfile.organization_id, 'sms_per_month', smsCount);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: `Monthly SMS limit reached (${limitCheck.limit}). Upgrade your plan for more.` }, { status: 403 });
    }

    const { leadId, message } = await request.json();
    if (!leadId || !message) {
      return NextResponse.json({ error: 'leadId and message are required' }, { status: 400 });
    }

    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (!lead.phone) {
      return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 });
    }

    const result = await sendFollowUpSMS(lead.phone, message, userProfile.organization_id);

    if (result) {
      await supabase.from('lead_notes').insert({
        lead_id: leadId,
        content: `SMS sent: "${message}"`,
        is_system: true,
      });

      await supabase.from('sms_logs').insert({
        lead_id: leadId,
        organization_id: userProfile.organization_id,
        recipient_phone: lead.phone,
        message,
        sms_type: 'follow_up',
        status: 'sent',
        twilio_sid: result.id,
      });

      await supabase
        .from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', leadId);

      return NextResponse.json({ success: true, id: result.id });
    }

    return NextResponse.json(
      { error: 'Failed to send SMS. Check Twilio configuration.' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Send SMS error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
