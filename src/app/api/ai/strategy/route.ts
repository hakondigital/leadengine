import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature } from '@/lib/check-plan';
import { generateBusinessInsight } from '@/lib/ai-actions';

// POST /api/ai/strategy
// AI Business Strategy Advisor — plan-gated (Pro + Enterprise)

export async function POST(request: NextRequest) {
  try {
    const { question, organization_id, conversation } = await request.json();

    if (!question || !organization_id) {
      return NextResponse.json(
        { error: 'question and organization_id required' },
        { status: 400 }
      );
    }

    // Plan gate
    const { allowed, plan } = await checkFeature(organization_id, 'ai_strategy');
    if (!allowed) {
      return NextResponse.json(
        {
          error: 'Agent Console is available on Professional and Enterprise plans',
          upgrade_required: true,
          current_plan: plan,
        },
        { status: 403 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Fetch org
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organization_id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const settings = (org.settings as Record<string, unknown>) || {};
    const industry = (settings.industry as string) || 'service business';

    // Fetch business data in parallel
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [leadsRes, quotesRes, appointmentsRes, callsRes, inboxRes] = await Promise.all([
      supabase
        .from('leads')
        .select('id, first_name, last_name, status, source, service_type, location, budget_range, urgency, ai_score, won_value, created_at, last_contacted_at')
        .eq('organization_id', organization_id)
        .gte('created_at', ninetyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('quotes')
        .select('id, lead_id, total, status, created_at, sent_at')
        .eq('organization_id', organization_id)
        .gte('created_at', ninetyDaysAgo)
        .limit(100),
      supabase
        .from('appointments')
        .select('id, lead_id, title, start_time, status')
        .eq('organization_id', organization_id)
        .gte('start_time', thirtyDaysAgo)
        .limit(50),
      supabase
        .from('call_logs')
        .select('id, caller_number, duration, direction, status, created_at')
        .eq('organization_id', organization_id)
        .gte('created_at', thirtyDaysAgo)
        .limit(50),
      supabase
        .from('inbox_messages')
        .select('id, channel, direction, is_read, created_at')
        .eq('organization_id', organization_id)
        .gte('created_at', thirtyDaysAgo)
        .limit(100),
    ]);

    const leads = leadsRes.data || [];
    const quotes = quotesRes.data || [];
    const appointments = appointmentsRes.data || [];
    const calls = callsRes.data || [];
    const messages = inboxRes.data || [];

    // Build business context summary
    const thisMonthLeads = leads.filter(l => l.created_at >= startOfMonth);
    const wonLeads = leads.filter(l => l.status === 'won');
    const lostLeads = leads.filter(l => l.status === 'lost');
    const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.status));
    const totalRevenue = wonLeads.reduce((a, l) => a + (l.won_value || 0), 0);
    const avgScore = leads.length > 0
      ? Math.round(leads.reduce((a, l) => a + (l.ai_score || 0), 0) / leads.length)
      : 0;

    // Source breakdown
    const sources: Record<string, number> = {};
    leads.forEach(l => { sources[l.source] = (sources[l.source] || 0) + 1; });

    // Service breakdown
    const services: Record<string, number> = {};
    leads.forEach(l => { if (l.service_type) services[l.service_type] = (services[l.service_type] || 0) + 1; });

    // Win rate by source
    const winRateBySource: Record<string, string> = {};
    Object.keys(sources).forEach(src => {
      const srcLeads = leads.filter(l => l.source === src);
      const srcWon = srcLeads.filter(l => l.status === 'won').length;
      const srcTotal = srcLeads.filter(l => ['won', 'lost'].includes(l.status)).length;
      if (srcTotal > 0) winRateBySource[src] = `${Math.round((srcWon / srcTotal) * 100)}%`;
    });

    // Quote stats
    const totalQuoted = quotes.reduce((a, q) => a + (q.total || 0), 0);
    const sentQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'accepted');
    const acceptedQuotes = quotes.filter(q => q.status === 'accepted');

    const businessContext = `BUSINESS: ${org.name} (${industry})

LEAD OVERVIEW (last 90 days):
- Total leads: ${leads.length}
- This month: ${thisMonthLeads.length}
- Active/in-pipeline: ${activeLeads.length}
- Won: ${wonLeads.length}
- Lost: ${lostLeads.length}
- Win rate: ${wonLeads.length + lostLeads.length > 0 ? Math.round((wonLeads.length / (wonLeads.length + lostLeads.length)) * 100) : 0}%
- Average AI score: ${avgScore}/100
- Total revenue (won): $${totalRevenue.toLocaleString()}

LEAD SOURCES:
${Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([src, count]) => `- ${src}: ${count} leads ${winRateBySource[src] ? `(${winRateBySource[src]} win rate)` : ''}`).join('\n')}

TOP SERVICES REQUESTED:
${Object.entries(services).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([svc, count]) => `- ${svc}: ${count} leads`).join('\n')}

QUOTES (last 90 days):
- Total quotes: ${quotes.length}
- Total value quoted: $${totalQuoted.toLocaleString()}
- Sent: ${sentQuotes.length}
- Accepted: ${acceptedQuotes.length}
- Quote-to-win rate: ${sentQuotes.length > 0 ? Math.round((acceptedQuotes.length / sentQuotes.length) * 100) : 0}%

APPOINTMENTS (last 30 days):
- Total: ${appointments.length}
- Completed: ${appointments.filter(a => a.status === 'completed').length}
- Upcoming: ${appointments.filter(a => a.status === 'scheduled').length}
- Cancelled: ${appointments.filter(a => a.status === 'cancelled').length}

CALLS (last 30 days):
- Total: ${calls.length}
- Inbound: ${calls.filter(c => c.direction === 'inbound').length}
- Outbound: ${calls.filter(c => c.direction === 'outbound').length}
- Avg duration: ${calls.length > 0 ? Math.round(calls.reduce((a, c) => a + (c.duration || 0), 0) / calls.length) : 0}s

INBOX (last 30 days):
- Total messages: ${messages.length}
- Inbound: ${messages.filter(m => m.direction === 'inbound').length}
- Outbound: ${messages.filter(m => m.direction === 'outbound').length}
- Unread: ${messages.filter(m => !m.is_read).length}

PIPELINE SNAPSHOT:
${['new', 'contacted', 'qualified', 'quoted', 'negotiating'].map(status => {
  const count = leads.filter(l => l.status === status).length;
  return count > 0 ? `- ${status}: ${count} leads` : null;
}).filter(Boolean).join('\n')}`;

    // Generate insight (with timeout protection)
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 25000));
    const insightPromise = generateBusinessInsight(
      question,
      businessContext,
      conversation || [],
      org.name,
      industry
    );

    const insight = await Promise.race([insightPromise, timeoutPromise]);

    if (!insight) {
      console.warn('AI strategy timed out after 25s');
      return NextResponse.json({
        answer: `Here's a quick snapshot based on your data:\n\n${org.name} has ${leads.length} leads in the last 90 days, with ${thisMonthLeads.length} this month. ${wonLeads.length} won, ${lostLeads.length} lost (${wonLeads.length + lostLeads.length > 0 ? Math.round((wonLeads.length / (wonLeads.length + lostLeads.length)) * 100) : 0}% win rate). Total revenue: $${totalRevenue.toLocaleString()}.\n\nAsk me something more specific for deeper analysis.`,
        data_points: [
          { label: 'Leads (90d)', value: String(leads.length) },
          { label: 'This month', value: String(thisMonthLeads.length) },
          { label: 'Win rate', value: `${wonLeads.length + lostLeads.length > 0 ? Math.round((wonLeads.length / (wonLeads.length + lostLeads.length)) * 100) : 0}%` },
          { label: 'Revenue', value: `$${totalRevenue.toLocaleString()}` },
        ],
        recommendations: ['Try asking a more specific question', 'Check your pipeline health', 'Review your top lead sources'],
        follow_up_questions: ['Which lead sources are performing best?', 'How is my pipeline looking?'],
      });
    }

    return NextResponse.json(insight);
  } catch (error) {
    console.error('AI strategy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
