import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { client_id, organization_id } = body;

    if (!client_id || !organization_id) {
      return NextResponse.json(
        { error: 'client_id and organization_id are required' },
        { status: 400 }
      );
    }

    const { unauthorized } = await requireCallerOwnsOrg(organization_id);
    if (unauthorized) return unauthorized;

    const supabase = await createServiceRoleClient();

    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .eq('organization_id', organization_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Fetch client's leads
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('email', client.email)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent communications (inbox messages)
    const leadIds = (leads || []).map((l) => l.id);
    let recentComms: { channel: string; direction: string; subject: string | null; snippet: string | null; created_at: string }[] = [];
    if (leadIds.length > 0) {
      const { data: messages } = await supabase
        .from('inbox_messages')
        .select('channel, direction, subject, snippet, created_at')
        .in('lead_id', leadIds)
        .order('created_at', { ascending: false })
        .limit(10);
      recentComms = messages || [];
    }

    // Fetch quotes for this client's leads
    let quotes: { title: string; total: number; status: string; created_at: string }[] = [];
    if (leadIds.length > 0) {
      const { data: q } = await supabase
        .from('quotes')
        .select('title, total, status, created_at')
        .in('lead_id', leadIds)
        .eq('organization_id', organization_id)
        .order('created_at', { ascending: false })
        .limit(5);
      quotes = q || [];
    }

    // Fetch upcoming appointments for this client's leads
    const now = new Date().toISOString();
    let upcomingAppointment: { title: string; start_time: string; location: string | null } | null = null;
    if (leadIds.length > 0) {
      const { data: appointments } = await supabase
        .from('appointments')
        .select('title, start_time, location')
        .in('lead_id', leadIds)
        .eq('organization_id', organization_id)
        .gte('start_time', now)
        .eq('status', 'scheduled')
        .order('start_time', { ascending: true })
        .limit(1);

      if (appointments && appointments.length > 0) {
        upcomingAppointment = appointments[0];
      }
    }

    if (!upcomingAppointment) {
      return NextResponse.json({
        summary: null,
        talking_points: [],
        appointment: null,
      });
    }

    // Build context for AI
    const leadContext = (leads || []).map((l) => {
      const parts = [
        `Service: ${l.service_type || 'N/A'}`,
        `Budget: ${l.budget_range || 'N/A'}`,
        `Status: ${l.status}`,
        `Urgency: ${l.urgency || 'N/A'}`,
      ];
      if (l.message) parts.push(`Message: "${l.message}"`);
      if (l.last_contacted_at) {
        const daysAgo = Math.round((Date.now() - new Date(l.last_contacted_at).getTime()) / (1000 * 60 * 60 * 24));
        parts.push(`Last contacted: ${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`);
      }
      return parts.join(', ');
    }).join('\n');

    const commsContext = recentComms.map((m) =>
      `${m.direction === 'inbound' ? 'FROM client' : 'TO client'} via ${m.channel}: ${m.subject || m.snippet || '(no content)'} (${new Date(m.created_at).toLocaleDateString()})`
    ).join('\n');

    const quotesContext = quotes.map((q) =>
      `"${q.title}" — $${q.total.toLocaleString()} (${q.status})`
    ).join('\n');

    const systemPrompt = `You are a meeting prep assistant for a service business. Generate a concise briefing for an upcoming client meeting. Return JSON: { "summary": "2-3 sentence overview of the client relationship and what to expect", "talking_points": ["point 1", "point 2", "point 3"] }

IMPORTANT: Only return the raw JSON object, no markdown or code blocks. Keep it practical and actionable. Maximum 5 talking points.`;

    const userPrompt = `Prepare a meeting brief for:

CLIENT: ${client.first_name} ${client.last_name}${client.company_name ? ` (${client.company_name})` : ''}
MEETING: "${upcomingAppointment.title}" on ${new Date(upcomingAppointment.start_time).toLocaleString()}${upcomingAppointment.location ? ` at ${upcomingAppointment.location}` : ''}

LEAD HISTORY:
${leadContext || 'No lead history.'}

RECENT COMMUNICATIONS:
${commsContext || 'No recent communications.'}

QUOTES:
${quotesContext || 'No quotes sent.'}`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI provider not configured' },
        { status: 503 }
      );
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [
          { role: 'user', content: userPrompt },
        ],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI Meeting Prep] Anthropic error:', errText);
      return NextResponse.json(
        { error: 'AI provider error' },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.content[0]?.text;
    if (!content) {
      return NextResponse.json(
        { error: 'Empty response from AI' },
        { status: 502 }
      );
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      summary: parsed.summary || '',
      talking_points: parsed.talking_points || [],
      appointment: {
        title: upcomingAppointment.title,
        scheduled_at: upcomingAppointment.start_time,
      },
    });
  } catch (error) {
    console.error('[AI Meeting Prep] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
