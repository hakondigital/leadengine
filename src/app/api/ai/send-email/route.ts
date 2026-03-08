import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { sendFollowUpEmail } from '@/lib/email';

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

    const { leadId, subject, body } = await request.json();
    if (!leadId || !body) {
      return NextResponse.json({ error: 'leadId and body are required' }, { status: 400 });
    }

    // Fetch lead
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', userProfile.organization_id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Fetch org
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userProfile.organization_id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Send the email
    const result = await sendFollowUpEmail(lead, org, body);

    if (result) {
      // Log the email as a note on the lead
      await supabase.from('lead_notes').insert({
        lead_id: leadId,
        content: `Email sent: "${subject}"\n\n${body}`,
        is_system: true,
      });

      // Update last contacted
      await supabase
        .from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', leadId);

      return NextResponse.json({ success: true, emailId: result.id });
    }

    return NextResponse.json(
      { error: 'Failed to send email. Check Resend API key configuration.' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Send email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
