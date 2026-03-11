import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature } from '@/lib/check-plan';
import { generateMeetingBriefing } from '@/lib/ai-actions';

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('organization_id');
    const leadId = req.nextUrl.searchParams.get('lead_id');

    if (!orgId || !leadId) {
      return NextResponse.json({ error: 'organization_id and lead_id required' }, { status: 400 });
    }

    // Plan gate
    const { allowed } = await checkFeature(orgId, 'meeting_briefing');
    if (!allowed) {
      return NextResponse.json({ error: 'Upgrade to Professional to access Meeting Briefings' }, { status: 403 });
    }

    const supabase = await createServiceRoleClient();

    // Fetch lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .eq('organization_id', orgId)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Fetch notes
    const { data: notes } = await supabase
      .from('lead_notes')
      .select('content, is_system, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false })
      .limit(20);

    // Fetch quotes
    const { data: quotes } = await supabase
      .from('quotes')
      .select('total, status')
      .eq('lead_id', leadId)
      .eq('organization_id', orgId);

    // Get org name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single();

    const briefing = await generateMeetingBriefing(
      lead,
      notes || [],
      quotes || [],
      org?.name || 'Your Business'
    );

    return NextResponse.json(briefing);
  } catch (error) {
    console.error('[Meeting Briefing] Error:', error);
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 });
  }
}
