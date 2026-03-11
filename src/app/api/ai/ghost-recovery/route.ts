import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature } from '@/lib/check-plan';
import { analyzeGhostAndRecover } from '@/lib/ai-actions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organization_id, lead_id } = body;

    if (!organization_id || !lead_id) {
      return NextResponse.json({ error: 'organization_id and lead_id required' }, { status: 400 });
    }

    // Plan gate
    const { allowed } = await checkFeature(organization_id, 'ghost_recovery');
    if (!allowed) {
      return NextResponse.json({ error: 'Upgrade to Professional to access Smart Ghost Recovery' }, { status: 403 });
    }

    const supabase = await createServiceRoleClient();

    // Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .eq('organization_id', organization_id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Fetch notes
    const { data: notes } = await supabase
      .from('lead_notes')
      .select('content, is_system, created_at')
      .eq('lead_id', lead_id)
      .order('created_at', { ascending: true })
      .limit(30);

    // Fetch quotes for this lead
    const { data: quotes } = await supabase
      .from('quotes')
      .select('total, status, sent_at')
      .eq('lead_id', lead_id)
      .eq('organization_id', organization_id);

    // Get org name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single();

    const strategy = await analyzeGhostAndRecover(
      lead,
      notes || [],
      quotes || [],
      org?.name || 'Our Team'
    );

    return NextResponse.json(strategy);
  } catch (error) {
    console.error('[Ghost Recovery] Error:', error);
    return NextResponse.json({ error: 'Failed to analyze ghost recovery' }, { status: 500 });
  }
}
