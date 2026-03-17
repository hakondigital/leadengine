import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';

// GET: Lead source ROI breakdown
// Returns: source → total leads, won leads, won revenue, conversion rate
export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('organization_id');
    const months = parseInt(req.nextUrl.searchParams.get('months') || '3');
    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { unauthorized } = await requireCallerOwnsOrg(orgId);
    if (unauthorized) return unauthorized;

    const supabase = await createServiceRoleClient();
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    // Fetch all leads in the time period
    const { data: leads } = await supabase
      .from('leads')
      .select('source, utm_source, utm_medium, utm_campaign, status, won_value, created_at')
      .eq('organization_id', orgId)
      .gte('created_at', since.toISOString());

    if (!leads) {
      return NextResponse.json({ sources: [], summary: {} });
    }

    // Aggregate by source
    const sourceMap = new Map<string, {
      source: string;
      total_leads: number;
      won_leads: number;
      lost_leads: number;
      won_revenue: number;
      avg_deal_size: number;
      conversion_rate: number;
      campaigns: Set<string>;
    }>();

    for (const lead of leads) {
      // Use utm_source if available, otherwise fall back to source field
      const sourceName = lead.utm_source || lead.source || 'direct';

      if (!sourceMap.has(sourceName)) {
        sourceMap.set(sourceName, {
          source: sourceName,
          total_leads: 0,
          won_leads: 0,
          lost_leads: 0,
          won_revenue: 0,
          avg_deal_size: 0,
          conversion_rate: 0,
          campaigns: new Set(),
        });
      }

      const entry = sourceMap.get(sourceName)!;
      entry.total_leads++;

      if (lead.status === 'won') {
        entry.won_leads++;
        entry.won_revenue += lead.won_value || 0;
      } else if (lead.status === 'lost') {
        entry.lost_leads++;
      }

      if (lead.utm_campaign) {
        entry.campaigns.add(lead.utm_campaign);
      }
    }

    // Calculate derived metrics
    const sources = Array.from(sourceMap.values())
      .map((s) => ({
        source: s.source,
        total_leads: s.total_leads,
        won_leads: s.won_leads,
        lost_leads: s.lost_leads,
        won_revenue: s.won_revenue,
        avg_deal_size: s.won_leads > 0 ? Math.round(s.won_revenue / s.won_leads) : 0,
        conversion_rate: s.total_leads > 0 ? Math.round((s.won_leads / s.total_leads) * 100) : 0,
        campaigns: Array.from(s.campaigns),
      }))
      .sort((a, b) => b.won_revenue - a.won_revenue);

    // Summary
    const totalLeads = leads.length;
    const totalWon = leads.filter((l) => l.status === 'won').length;
    const totalRevenue = leads.reduce((sum, l) => sum + (l.status === 'won' ? (l.won_value || 0) : 0), 0);
    const bestSource = sources[0]?.source || 'N/A';

    return NextResponse.json({
      sources,
      summary: {
        total_leads: totalLeads,
        total_won: totalWon,
        total_revenue: totalRevenue,
        overall_conversion_rate: totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100) : 0,
        best_source: bestSource,
        period_months: months,
      },
    });
  } catch (error) {
    console.error('[Source ROI] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
