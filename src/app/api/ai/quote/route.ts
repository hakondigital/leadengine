import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { estimateQuote } from '@/lib/ai-actions';

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

    const { leadId, industry } = await request.json();
    if (!leadId) {
      return NextResponse.json({ error: 'leadId is required' }, { status: 400 });
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
      .select('name')
      .eq('id', userProfile.organization_id)
      .single();

    const estimate = await estimateQuote(lead, org?.name || 'Our Company', industry || 'general services');
    return NextResponse.json(estimate);
  } catch (error) {
    console.error('AI quote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
