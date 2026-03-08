import type { Lead, LeadStatus } from './database.types';

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

async function callAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  if (AI_PROVIDER === 'anthropic') {
    return callAnthropicText(systemPrompt, userPrompt);
  }
  return callOpenAIText(systemPrompt, userPrompt);
}

async function callOpenAIText(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 800,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.choices[0]?.message?.content || null;
}

async function callAnthropicText(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.content[0]?.text || null;
}

function leadContext(lead: Lead): string {
  return `Lead: ${lead.first_name} ${lead.last_name}
Email: ${lead.email}
Phone: ${lead.phone || 'Not provided'}
Company: ${lead.company || 'N/A'}
Service: ${lead.service_type || 'Not specified'}
Project: ${lead.project_type || 'Not specified'}
Location: ${lead.location || 'Not provided'}
Budget: ${lead.budget_range || 'Not specified'}
Urgency: ${lead.urgency || 'Not specified'}
Message: ${lead.message || 'None'}
Status: ${lead.status}
AI Score: ${lead.ai_score || 'N/A'}
AI Summary: ${lead.ai_summary || 'N/A'}`;
}

// ─── 1. AI FOLLOW-UP WRITER ────────────────────────────────────

export interface FollowUpDraft {
  subject: string;
  email_body: string;
  sms_body: string;
  tone: string;
  key_points: string[];
}

export async function generateFollowUp(
  lead: Lead,
  orgName: string,
  followUpType: 'initial_outreach' | 'quote_follow_up' | 'no_response' | 'check_in'
): Promise<FollowUpDraft> {
  const typeDescriptions: Record<string, string> = {
    initial_outreach: 'First contact after receiving their enquiry. Be warm, professional, reference their specific needs.',
    quote_follow_up: 'Following up after sending a quote. Gently check if they have questions, without being pushy.',
    no_response: 'Re-engaging after no response to previous outreach. Add value, dont just ask "did you get my email?"',
    check_in: 'Friendly check-in on an ongoing conversation. Keep it light and helpful.',
  };

  const system = `You are a sales follow-up writer for ${orgName}, a service business. Write personalized, human-sounding messages. Never use corporate jargon. Be genuinely helpful. Always respond in JSON format.`;

  const prompt = `Write a follow-up message for this lead.

${leadContext(lead)}

Follow-up type: ${followUpType}
Instructions: ${typeDescriptions[followUpType]}

Respond in JSON:
{
  "subject": "Email subject line (short, personal, no caps)",
  "email_body": "Full email body. 2-3 short paragraphs. Use their first name. Reference their specific project/needs. Sign off as the team at ${orgName}.",
  "sms_body": "SMS version, under 160 chars. Casual but professional.",
  "tone": "Description of the tone used",
  "key_points": ["What this message addresses"]
}`;

  const result = await callAI(system, prompt);
  if (result) {
    try {
      const json = JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || result);
      return json;
    } catch { /* fall through */ }
  }

  // Fallback
  return {
    subject: `Following up on your ${lead.service_type || 'enquiry'} — ${orgName}`,
    email_body: `Hi ${lead.first_name},\n\nJust wanted to follow up on your recent enquiry${lead.service_type ? ` about ${lead.service_type}` : ''}. We'd love to help${lead.location ? ` with your project in ${lead.location}` : ''}.\n\nWould you be available for a quick chat this week?\n\nBest regards,\nThe ${orgName} Team`,
    sms_body: `Hi ${lead.first_name}, just following up on your enquiry. Would you be free for a quick chat? — ${orgName}`,
    tone: 'Friendly and professional',
    key_points: ['Follow-up on initial enquiry'],
  };
}

// ─── 2. AI OBJECTION HANDLER ────────────────────────────────────

export interface ObjectionStrategy {
  likely_reason: string;
  re_engagement_message: string;
  sms_message: string;
  alternative_offer: string;
  tips: string[];
}

export async function handleObjection(
  lead: Lead,
  orgName: string,
  context: 'went_cold' | 'quote_rejected' | 'chose_competitor' | 'budget_issue'
): Promise<ObjectionStrategy> {
  const system = `You are a sales recovery specialist for ${orgName}. Your job is to craft re-engagement strategies that are empathetic, not desperate. Always respond in JSON format.`;

  const contextMap: Record<string, string> = {
    went_cold: 'Lead stopped responding after initial contact',
    quote_rejected: 'Lead said the quote was too high or rejected the proposal',
    chose_competitor: 'Lead chose a different provider',
    budget_issue: 'Lead cited budget constraints',
  };

  const prompt = `A lead has gone cold/negative. Help me re-engage them.

${leadContext(lead)}

Situation: ${contextMap[context]}

Respond in JSON:
{
  "likely_reason": "Most probable reason based on the data",
  "re_engagement_message": "A warm, non-pushy email to re-open the conversation. 2-3 paragraphs. Add value, don't beg.",
  "sms_message": "Brief SMS version under 160 chars",
  "alternative_offer": "A creative alternative to offer (e.g., phased work, different scope, seasonal discount)",
  "tips": ["2-3 tactical tips for this specific situation"]
}`;

  const result = await callAI(system, prompt);
  if (result) {
    try {
      return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || result);
    } catch { /* fall through */ }
  }

  return {
    likely_reason: 'Unable to determine — may need more context',
    re_engagement_message: `Hi ${lead.first_name},\n\nI wanted to reach out one more time — no pressure at all. If your ${lead.service_type || 'project'} needs have changed or if there's a different way we can help, we're here.\n\nEither way, wishing you all the best.\n\nCheers,\n${orgName}`,
    sms_message: `Hi ${lead.first_name}, no pressure — just wanted to check if you still need help with your project. — ${orgName}`,
    alternative_offer: 'Consider offering a smaller initial scope or phased approach to reduce commitment.',
    tips: ['Wait 5-7 days before reaching out', 'Lead with value, not a sales pitch', 'Ask an open-ended question'],
  };
}

// ─── 3. AI WIN/LOSS ANALYSIS ────────────────────────────────────

export interface WinLossInsights {
  summary: string;
  win_patterns: string[];
  loss_patterns: string[];
  best_sources: string[];
  avg_response_time_impact: string;
  top_recommendations: string[];
  revenue_insights: string;
}

export async function analyzeWinLoss(
  leads: Lead[],
  orgName: string
): Promise<WinLossInsights> {
  const wonLeads = leads.filter(l => l.status === 'won');
  const lostLeads = leads.filter(l => l.status === 'lost');
  const totalLeads = leads.length;

  // Build summary stats
  const stats = {
    total: totalLeads,
    won: wonLeads.length,
    lost: lostLeads.length,
    winRate: totalLeads > 0 ? Math.round((wonLeads.length / totalLeads) * 100) : 0,
    avgScore: Math.round(leads.reduce((a, l) => a + (l.ai_score || 0), 0) / (totalLeads || 1)),
    avgWonScore: wonLeads.length > 0 ? Math.round(wonLeads.reduce((a, l) => a + (l.ai_score || 0), 0) / wonLeads.length) : 0,
    avgLostScore: lostLeads.length > 0 ? Math.round(lostLeads.reduce((a, l) => a + (l.ai_score || 0), 0) / lostLeads.length) : 0,
    totalRevenue: wonLeads.reduce((a, l) => a + (l.won_value || 0), 0),
    sources: leads.reduce((acc, l) => { acc[l.source] = (acc[l.source] || 0) + 1; return acc; }, {} as Record<string, number>),
    wonSources: wonLeads.reduce((acc, l) => { acc[l.source] = (acc[l.source] || 0) + 1; return acc; }, {} as Record<string, number>),
    serviceTypes: leads.reduce((acc, l) => { if (l.service_type) acc[l.service_type] = (acc[l.service_type] || 0) + 1; return acc; }, {} as Record<string, number>),
    budgetRanges: leads.reduce((acc, l) => { if (l.budget_range) acc[l.budget_range] = (acc[l.budget_range] || 0) + 1; return acc; }, {} as Record<string, number>),
    locations: leads.reduce((acc, l) => { if (l.location) acc[l.location] = (acc[l.location] || 0) + 1; return acc; }, {} as Record<string, number>),
  };

  const system = `You are a business intelligence analyst for ${orgName}. Analyze lead data and provide actionable insights. Always respond in JSON format.`;

  const prompt = `Analyze this lead pipeline data and identify patterns.

STATS:
${JSON.stringify(stats, null, 2)}

WON LEADS DETAILS:
${wonLeads.slice(0, 20).map(l => `- ${l.first_name} ${l.last_name}: ${l.service_type || 'N/A'}, ${l.location || 'N/A'}, Budget: ${l.budget_range || 'N/A'}, Score: ${l.ai_score}, Source: ${l.source}, Value: $${l.won_value || 0}`).join('\n')}

LOST LEADS DETAILS:
${lostLeads.slice(0, 20).map(l => `- ${l.first_name} ${l.last_name}: ${l.service_type || 'N/A'}, ${l.location || 'N/A'}, Budget: ${l.budget_range || 'N/A'}, Score: ${l.ai_score}, Source: ${l.source}`).join('\n')}

Respond in JSON:
{
  "summary": "2-3 sentence executive summary of pipeline health",
  "win_patterns": ["3-5 patterns that won leads share"],
  "loss_patterns": ["3-5 patterns in lost leads"],
  "best_sources": ["Top lead sources ranked by conversion, with context"],
  "avg_response_time_impact": "How response timing correlates with wins",
  "top_recommendations": ["3-5 specific, actionable recommendations"],
  "revenue_insights": "Key revenue patterns and projections"
}`;

  const result = await callAI(system, prompt);
  if (result) {
    try {
      return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || result);
    } catch { /* fall through */ }
  }

  return {
    summary: `${totalLeads} total leads. ${wonLeads.length} won (${stats.winRate}% win rate). $${stats.totalRevenue.toLocaleString()} revenue tracked.`,
    win_patterns: ['Insufficient data for pattern analysis'],
    loss_patterns: ['Insufficient data for pattern analysis'],
    best_sources: Object.entries(stats.sources).map(([k, v]) => `${k}: ${v} leads`),
    avg_response_time_impact: 'Not enough data to determine',
    top_recommendations: ['Continue collecting lead data to enable AI analysis', 'Ensure all won leads have revenue values recorded'],
    revenue_insights: `Total tracked revenue: $${stats.totalRevenue.toLocaleString()}`,
  };
}

// ─── 4. AI SMART SCHEDULING ────────────────────────────────────

export interface ContactSuggestion {
  best_time: string;
  reasoning: string;
  channel: 'phone' | 'email' | 'sms';
  talking_points: string[];
  estimated_duration: string;
}

export async function suggestContactTime(
  lead: Lead,
  orgName: string
): Promise<ContactSuggestion> {
  const system = `You are a sales timing optimization assistant for ${orgName}. Suggest the best time and method to contact leads. Always respond in JSON format.`;

  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

  const prompt = `When and how should I contact this lead?

${leadContext(lead)}

Current time context:
- Day: ${dayOfWeek}
- Hour: ${hour}:00
- Lead created: ${lead.created_at}
- Last contacted: ${lead.last_contacted_at || 'Never'}

Respond in JSON:
{
  "best_time": "Specific time suggestion (e.g., 'Today at 2:00 PM' or 'Tomorrow morning between 9-10 AM')",
  "reasoning": "Why this time is optimal based on their urgency, industry norms, and timing",
  "channel": "phone|email|sms",
  "talking_points": ["3-4 specific points to mention based on their enquiry"],
  "estimated_duration": "Expected call/interaction duration"
}`;

  const result = await callAI(system, prompt);
  if (result) {
    try {
      return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || result);
    } catch { /* fall through */ }
  }

  const urgentLead = lead.urgency === 'asap' || lead.urgency === 'emergency';
  return {
    best_time: urgentLead ? 'Call now — urgent lead' : hour < 12 ? 'This morning, before noon' : 'Tomorrow morning, 9-10 AM',
    reasoning: urgentLead ? 'Lead marked as urgent — every minute counts' : 'Morning calls have higher answer rates for service businesses',
    channel: lead.phone ? 'phone' : 'email',
    talking_points: [
      `Reference their ${lead.service_type || 'project'} enquiry`,
      lead.location ? `Mention availability in ${lead.location}` : 'Ask about project location',
      lead.budget_range ? 'Confirm budget expectations' : 'Discuss scope to understand budget',
      'Offer a site visit or free estimate',
    ],
    estimated_duration: '5-10 minutes',
  };
}

// ─── 5. AI QUOTE ESTIMATOR ────────────────────────────────────

export interface QuoteEstimate {
  low_range: number;
  mid_range: number;
  high_range: number;
  currency: string;
  factors: string[];
  disclaimer: string;
  confidence: 'low' | 'medium' | 'high';
  upsell_opportunities: string[];
}

export async function estimateQuote(
  lead: Lead,
  orgName: string,
  industry: string
): Promise<QuoteEstimate> {
  const system = `You are a pricing estimation assistant for ${orgName}, a ${industry} business. Provide rough ballpark estimates based on typical industry pricing. Always respond in JSON format.`;

  const prompt = `Estimate a ballpark quote for this lead's project.

${leadContext(lead)}
Industry: ${industry}

Respond in JSON:
{
  "low_range": lowest reasonable price in dollars (number only),
  "mid_range": most likely price in dollars (number only),
  "high_range": premium/complex scenario price in dollars (number only),
  "currency": "AUD",
  "factors": ["3-5 factors that would affect the final price"],
  "disclaimer": "Brief disclaimer about the estimate being a rough guide",
  "confidence": "low|medium|high based on how much info we have",
  "upsell_opportunities": ["2-3 related services to suggest"]
}`;

  const result = await callAI(system, prompt);
  if (result) {
    try {
      return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || result);
    } catch { /* fall through */ }
  }

  // Basic estimation from budget_range
  const budgetMap: Record<string, [number, number, number]> = {
    under_1k: [300, 700, 1000],
    '1k_5k': [1000, 3000, 5000],
    '5k_15k': [5000, 10000, 15000],
    '15k_50k': [15000, 30000, 50000],
    '50k_plus': [50000, 75000, 120000],
    under_10k: [3000, 6000, 10000],
    '10k_50k': [10000, 25000, 50000],
    '50k_150k': [50000, 90000, 150000],
    '150k_500k': [150000, 300000, 500000],
    '500k_plus': [500000, 750000, 1200000],
  };

  const range = budgetMap[lead.budget_range || ''] || [1000, 5000, 15000];

  return {
    low_range: range[0],
    mid_range: range[1],
    high_range: range[2],
    currency: 'AUD',
    factors: [
      'Scope complexity',
      'Material costs',
      'Location accessibility',
      'Urgency/scheduling requirements',
    ],
    disclaimer: 'This is a rough AI estimate based on limited information. A proper quote requires a site assessment.',
    confidence: lead.budget_range ? 'medium' : 'low',
    upsell_opportunities: ['Maintenance plan', 'Extended warranty', 'Premium materials upgrade'],
  };
}

// ─── 6. AI CHAT (for lead capture widget) ────────────────────

export async function chatWithLead(
  messages: { role: 'user' | 'assistant'; content: string }[],
  orgName: string,
  industry: string,
  formFields: string[]
): Promise<string> {
  const system = `You are a friendly, helpful assistant on ${orgName}'s website (${industry} business). Your job is to:
1. Greet visitors warmly and understand their needs
2. Naturally collect their information through conversation: ${formFields.join(', ')}
3. Be conversational, not robotic. Ask one question at a time.
4. Once you have enough info, let them know someone will be in touch soon.
5. Keep responses short (2-3 sentences max).
6. If they ask about pricing, give general ranges but encourage a consultation.
7. Never make up specific availability or promises about timing.

Be genuinely helpful, not salesy.`;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "Thanks for reaching out! We'd love to help. Could you leave your name and contact details, and we'll get back to you shortly?";
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        ...messages,
      ],
      temperature: 0.8,
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    return "Thanks for your message! Let me connect you with our team. Could you share your name and phone number?";
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "Thanks! Could you share your contact details so we can help further?";
}
