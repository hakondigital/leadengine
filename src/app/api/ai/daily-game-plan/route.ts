import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature } from '@/lib/check-plan';
import { generateDailyGamePlan } from '@/lib/ai-actions';

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('organization_id');
    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    // Plan gate
    const { allowed } = await checkFeature(orgId, 'daily_game_plan');
    if (!allowed) {
      return NextResponse.json({ error: 'Upgrade to Professional to access AI Daily Game Plan' }, { status: 403 });
    }

    const supabase = await createServiceRoleClient();

    // Fetch active leads
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200);

    // Fetch upcoming appointments (today + next 7 days)
    const now = new Date();
    const weekOut = new Date(now.getTime() + 7 * 86400000);
    const { data: appointments } = await supabase
      .from('appointments')
      .select('id, lead_id, title, start_time, status')
      .eq('organization_id', orgId)
      .gte('start_time', now.toISOString())
      .lte('start_time', weekOut.toISOString())
      .neq('status', 'cancelled');

    // Fetch quotes
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, lead_id, total, status, created_at, sent_at')
      .eq('organization_id', orgId)
      .in('status', ['draft', 'sent', 'viewed']);

    // Fetch org name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    const plan = await generateDailyGamePlan(
      leads || [],
      appointments || [],
      quotes || [],
      org?.name || 'Your Business'
    );

    return NextResponse.json(plan);
  } catch (error) {
    console.error('[Daily Game Plan] Error:', error);
    return NextResponse.json({ error: 'Failed to generate game plan' }, { status: 500 });
  }
}
