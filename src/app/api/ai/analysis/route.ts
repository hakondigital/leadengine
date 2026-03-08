import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { analyzeWinLoss } from '@/lib/ai-actions';

export async function GET() {
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

    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: false })
      .limit(200);

    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', userProfile.organization_id)
      .single();

    const insights = await analyzeWinLoss(leads || [], org?.name || 'Our Company');
    return NextResponse.json(insights);
  } catch (error) {
    console.error('AI analysis error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
