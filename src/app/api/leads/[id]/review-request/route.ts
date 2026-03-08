import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendReviewRequestEmail } from '@/lib/email';
import { sendReviewRequestSMS } from '@/lib/sms';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leadId } = await params;
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

    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userProfile.organization_id)
      .single();

    if (!org?.google_review_link) {
      return NextResponse.json({ error: 'Google review link not configured in settings' }, { status: 400 });
    }

    const results: { email?: boolean; sms?: boolean } = {};

    // Send review request email
    const emailResult = await sendReviewRequestEmail(lead, org, org.google_review_link);
    results.email = !!emailResult;

    // Send SMS if lead has phone
    if (lead.phone) {
      const smsResult = await sendReviewRequestSMS(
        lead.phone,
        lead.first_name,
        org.name,
        org.google_review_link
      );
      results.sms = !!smsResult;
    }

    // Log as note
    await supabase.from('lead_notes').insert({
      lead_id: leadId,
      content: `Google review request sent${results.email ? ' via email' : ''}${results.sms ? ' and SMS' : ''}`,
      is_system: true,
    });

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('Review request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
