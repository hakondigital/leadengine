import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { generateFollowUp } from '@/lib/ai-actions';
import { checkFeature } from '@/lib/check-plan';

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

    const followUpCheck = await checkFeature(userProfile.organization_id, 'ai_follow_ups');
    if (!followUpCheck.allowed) {
      return NextResponse.json({ error: 'AI follow-ups are not available on your plan. Upgrade to Professional or Enterprise.' }, { status: 403 });
    }

    const { leadId, followUpType } = await request.json();
    if (!leadId || !followUpType) {
      return NextResponse.json({ error: 'leadId and followUpType are required' }, { status: 400 });
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

    // Fetch org name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', userProfile.organization_id)
      .single();

    const draft = await generateFollowUp(lead, org?.name || 'Our Company', followUpType);
    return NextResponse.json(draft);
  } catch (error) {
    console.error('AI follow-up error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
