import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

const SYSTEM_PROMPT = `You are Odyssey AI, a helpful CRM assistant for service businesses. You help users understand their leads, clients, pipeline, and CRM features. Be concise, friendly, and actionable. If asked about specific data, explain where to find it in the CRM.

Key CRM sections users can navigate to:
- Overview: dashboard summary with stats and pipeline bar
- Leads: full lead list with search, filter, and AI scoring
- Pipeline: drag-and-drop Kanban board for managing deal stages
- Jobs: track active jobs and project progress
- Inbox: unified message center for client communications
- Appointments: schedule and manage meetings
- Quotes: create and send professional quotes
- Sequences: automated follow-up email/SMS sequences
- Calls: log and track client calls
- Strategy Advisor: AI-powered business insights (Pro/Enterprise)
- Daily Game Plan: AI-generated daily priorities
- Team: manage team members and roles
- Estimator: ballpark pricing tool
- Team Routing: auto-assign leads based on rules
- Analytics: performance dashboards and reports
- Forms: create and manage lead capture forms
- Marketplace: browse and enable add-on tools

Keep responses short (2-4 sentences) unless the user asks for detailed help. Use markdown formatting sparingly — bold for emphasis, bullet points for lists.`;

async function callAnthropicChat(
  systemPrompt: string,
  userMessage: string,
  contextBlock: string,
  maxTokens = 600
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const fullSystem = contextBlock
    ? `${systemPrompt}\n\n---\nCURRENT BUSINESS DATA:\n${contextBlock}`
    : systemPrompt;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: fullSystem,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown');
    console.error('Anthropic assistant error:', response.status, errText);
    return null;
  }
  const data = await response.json();
  return data.content[0]?.text || null;
}

async function callOpenAIChat(
  systemPrompt: string,
  userMessage: string,
  contextBlock: string,
  maxTokens = 600
): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const fullSystem = contextBlock
    ? `${systemPrompt}\n\n---\nCURRENT BUSINESS DATA:\n${contextBlock}`
    : systemPrompt;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: fullSystem },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown');
    console.error('OpenAI assistant error:', response.status, errText);
    return null;
  }
  const data = await response.json();
  return data.choices[0]?.message?.content || null;
}

export async function POST(request: NextRequest) {
  try {
    const { message, organization_id } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      );
    }

    // Build context from org data if available
    let contextBlock = '';

    if (organization_id) {
      try {
        const supabase = await createServiceRoleClient();

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

        const [orgRes, leadsRes, recentLeadsRes] = await Promise.all([
          supabase
            .from('organizations')
            .select('name, industry, settings')
            .eq('id', organization_id)
            .single(),
          supabase
            .from('leads')
            .select('id, status')
            .eq('organization_id', organization_id),
          supabase
            .from('leads')
            .select('id, first_name, last_name, status, source, created_at')
            .eq('organization_id', organization_id)
            .gte('created_at', thirtyDaysAgo)
            .order('created_at', { ascending: false })
            .limit(5),
        ]);

        const org = orgRes.data;
        const allLeads = leadsRes.data || [];
        const recentLeads = recentLeadsRes.data || [];

        const statusCounts: Record<string, number> = {};
        for (const lead of allLeads) {
          const s = lead.status || 'new';
          statusCounts[s] = (statusCounts[s] || 0) + 1;
        }

        const parts: string[] = [];
        if (org) {
          parts.push(`Business: ${org.name} (${org.industry || 'service business'})`);
        }
        parts.push(`Total leads: ${allLeads.length}`);
        parts.push(`Lead breakdown: ${Object.entries(statusCounts).map(([k, v]) => `${k}: ${v}`).join(', ') || 'none'}`);
        parts.push(`Leads in last 30 days: ${recentLeads.length}`);

        if (recentLeads.length > 0) {
          const recentList = recentLeads
            .map((l) => `${l.first_name} ${l.last_name} (${l.status}, via ${l.source})`)
            .join('; ');
          parts.push(`Recent leads: ${recentList}`);
        }

        contextBlock = parts.join('\n');
      } catch (err) {
        console.error('Failed to fetch org context for assistant:', err);
        // Continue without context
      }
    }

    // Try primary provider, fallback to secondary
    let reply: string | null = null;

    if (AI_PROVIDER === 'anthropic') {
      reply = await callAnthropicChat(SYSTEM_PROMPT, message, contextBlock);
      if (!reply) {
        reply = await callOpenAIChat(SYSTEM_PROMPT, message, contextBlock);
      }
    } else {
      reply = await callOpenAIChat(SYSTEM_PROMPT, message, contextBlock);
      if (!reply) {
        reply = await callAnthropicChat(SYSTEM_PROMPT, message, contextBlock);
      }
    }

    if (!reply) {
      return NextResponse.json(
        { reply: "I'm having trouble connecting right now. Please try again in a moment." },
        { status: 200 }
      );
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('AI assistant error:', err);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
