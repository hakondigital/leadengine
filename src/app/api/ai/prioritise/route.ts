import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';
import type { Lead } from '@/lib/database.types';

type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';
type UrgencyLabel = 'respond_now' | 'follow_up_soon' | 'monitor' | 'low_priority';

interface ScoredLead extends Lead {
  urgency_score: number;
  urgency_label: UrgencyLabel;
  urgency_level: UrgencyLevel;
}

function parseBudgetToNumber(budget: string | null): number {
  if (!budget) return 0;
  // Extract the highest number from budget strings like "$5k-$10k", "$50,000+", "10000-50000"
  const numbers = budget.replace(/[$,k]/gi, (m) => (m.toLowerCase() === 'k' ? '000' : ''))
    .match(/\d+/g);
  if (!numbers) return 0;
  return Math.max(...numbers.map(Number));
}

function calculateUrgencyScore(
  lead: Lead,
  hasUpcomingAppointment: boolean
): { score: number; label: UrgencyLabel; level: UrgencyLevel } {
  let score = 0;

  // 1. Time since last contact (0-30 points)
  // Longer = more urgent (they're waiting for us)
  if (lead.last_contacted_at) {
    const hoursSinceContact = (Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceContact > 72) score += 30;
    else if (hoursSinceContact > 48) score += 25;
    else if (hoursSinceContact > 24) score += 20;
    else if (hoursSinceContact > 12) score += 10;
    else score += 5;
  } else {
    // Never contacted — very urgent if the lead isn't brand new
    const hoursSinceCreation = (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) score += 30;
    else if (hoursSinceCreation > 4) score += 25;
    else if (hoursSinceCreation > 1) score += 15;
    else score += 10;
  }

  // 2. AI score (0-25 points)
  if (lead.ai_score !== null && lead.ai_score !== undefined) {
    score += Math.round((lead.ai_score / 100) * 25);
  } else {
    score += 10; // Unknown = moderate
  }

  // 3. Budget range (0-20 points)
  const budgetValue = parseBudgetToNumber(lead.budget_range);
  if (budgetValue >= 50000) score += 20;
  else if (budgetValue >= 20000) score += 15;
  else if (budgetValue >= 10000) score += 12;
  else if (budgetValue >= 5000) score += 8;
  else if (budgetValue > 0) score += 5;

  // 4. Urgency field (0-20 points)
  const urgency = (lead.urgency || '').toLowerCase();
  if (urgency === 'emergency' || urgency === 'asap') score += 20;
  else if (urgency === 'urgent' || urgency === 'this_week') score += 15;
  else if (urgency === 'soon' || urgency === 'this_month') score += 10;
  else if (urgency === 'flexible' || urgency === 'no_rush') score += 3;
  else score += 5; // Unknown

  // 5. Upcoming appointment bonus (0-10 points)
  if (hasUpcomingAppointment) score += 10;

  // 6. Status-based adjustments
  if (lead.status === 'new') score += 5; // New leads need attention
  if (lead.status === 'quote_sent') score += 3; // Follow up on quotes

  // Determine label and level
  let label: UrgencyLabel;
  let level: UrgencyLevel;

  if (score >= 75) {
    label = 'respond_now';
    level = 'critical';
  } else if (score >= 50) {
    label = 'follow_up_soon';
    level = 'high';
  } else if (score >= 30) {
    label = 'monitor';
    level = 'medium';
  } else {
    label = 'low_priority';
    level = 'low';
  }

  return { score, label, level };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id } = body;

    if (!organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const { unauthorized } = await requireCallerOwnsOrg(organization_id);
    if (unauthorized) return unauthorized;

    const supabase = await createServiceRoleClient();

    // Fetch all active leads (not won/lost)
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organization_id)
      .not('status', 'in', '("won","lost")')
      .order('created_at', { ascending: false });

    if (leadsError) {
      console.error('[Prioritise] Leads fetch error:', leadsError);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    if (!leads || leads.length === 0) {
      return NextResponse.json({ leads: [], total: 0 });
    }

    // Fetch upcoming appointments for these leads
    const leadIds = leads.map((l) => l.id);
    const now = new Date().toISOString();

    const { data: upcomingAppointments } = await supabase
      .from('appointments')
      .select('lead_id')
      .eq('organization_id', organization_id)
      .in('lead_id', leadIds)
      .gte('start_time', now)
      .eq('status', 'scheduled');

    const leadsWithAppointments = new Set(
      (upcomingAppointments || []).map((a) => a.lead_id).filter(Boolean)
    );

    // Score and sort leads
    const scoredLeads: ScoredLead[] = leads.map((lead) => {
      const { score, label, level } = calculateUrgencyScore(
        lead as Lead,
        leadsWithAppointments.has(lead.id)
      );
      return {
        ...(lead as Lead),
        urgency_score: score,
        urgency_label: label,
        urgency_level: level,
      };
    });

    // Sort by urgency score descending
    scoredLeads.sort((a, b) => b.urgency_score - a.urgency_score);

    return NextResponse.json({
      leads: scoredLeads,
      total: scoredLeads.length,
      summary: {
        respond_now: scoredLeads.filter((l) => l.urgency_label === 'respond_now').length,
        follow_up_soon: scoredLeads.filter((l) => l.urgency_label === 'follow_up_soon').length,
        monitor: scoredLeads.filter((l) => l.urgency_label === 'monitor').length,
        low_priority: scoredLeads.filter((l) => l.urgency_label === 'low_priority').length,
      },
    });
  } catch (error) {
    console.error('[Prioritise] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
