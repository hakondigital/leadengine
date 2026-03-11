import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature } from '@/lib/check-plan';
import { analyzeRevenueGap } from '@/lib/ai-actions';

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('organization_id');
    const target = req.nextUrl.searchParams.get('target');
    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    // Plan gate
    const { allowed } = await checkFeature(orgId, 'revenue_gap_closer');
    if (!allowed) {
      return NextResponse.json({ error: 'Upgrade to Professional to access Revenue Gap Closer' }, { status: 403 });
    }

    const supabase = await createServiceRoleClient();

    // Fetch leads (recent + won this month)
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(300);

    // Fetch quotes
    const { data: quotes } = await supabase
      .from('quotes')
      .select('id, lead_id, total, status, sent_at')
      .eq('organization_id', orgId);

    // Get org for target from settings
    const { data: org } = await supabase
      .from('organizations')
      .select('name, settings')
      .eq('id', orgId)
      .single();

    const settings = (org?.settings as Record<string, unknown>) || {};
    const monthlyTarget = target
      ? parseInt(target, 10)
      : (settings.monthly_revenue_target as number) || 20000;

    const analysis = await analyzeRevenueGap(
      leads || [],
      quotes || [],
      monthlyTarget,
      org?.name || 'Your Business'
    );

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('[Revenue Gap] Error:', error);
    return NextResponse.json({ error: 'Failed to analyze revenue gap' }, { status: 500 });
  }
}
