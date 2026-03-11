import type { Lead, LeadStatus } from './database.types';

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 800): Promise<string | null> {
  if (AI_PROVIDER === 'anthropic') {
    return callAnthropicText(systemPrompt, userPrompt, maxTokens);
  }
  return callOpenAIText(systemPrompt, userPrompt, maxTokens);
}

async function callOpenAIText(systemPrompt: string, userPrompt: string, maxTokens = 800): Promise<string | null> {
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
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown');
    console.error('callOpenAIText error:', response.status, errText);
    return null;
  }
  const data = await response.json();
  return data.choices[0]?.message?.content || null;
}

async function callAnthropicText(systemPrompt: string, userPrompt: string, maxTokens = 800): Promise<string | null> {
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
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => 'unknown');
    console.error('callAnthropicText error:', response.status, errText);
    return null;
  }
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

// ─── 6. AI REVIEW REQUEST WRITER ────────────────────────────────

export interface ReviewRequestDraft {
  email_subject: string;
  email_body: string;
  sms_body: string;
}

export async function generateReviewRequest(
  customerName: string,
  serviceType: string,
  orgName: string,
  tone: 'friendly' | 'professional' | 'casual' = 'friendly'
): Promise<ReviewRequestDraft> {
  const toneGuide = {
    friendly: 'Warm, genuine, and grateful. Like texting a friend — but professional.',
    professional: 'Polished and courteous. Business-appropriate but not stiff.',
    casual: 'Very relaxed, conversational, almost like a mate checking in.',
  };

  const system = `You are writing a review request message on behalf of ${orgName}. Write something genuine that makes the customer feel valued — not like an automated template. Always respond in JSON format.`;

  const prompt = `Write a review request for this customer:

Customer: ${customerName}
Service completed: ${serviceType}
Business: ${orgName}
Tone: ${toneGuide[tone]}

Rules:
- Reference their specific service naturally
- Make it feel personal, not automated
- Don't be pushy or desperate
- Keep email body to 2-3 short paragraphs
- SMS must be under 160 characters
- Don't use "Dear" or "Valued customer"
- Include a subtle mention that reviews help other people find them

Respond in JSON:
{
  "email_subject": "Short, natural subject line (no caps, no exclamation marks)",
  "email_body": "Email body text (plain text, no HTML). Use their first name. 2-3 short paragraphs. Sign off warmly as ${orgName}.",
  "sms_body": "SMS version under 160 chars. Casual, genuine."
}`;

  const result = await callAI(system, prompt);
  if (result) {
    try {
      return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || result);
    } catch { /* fall through */ }
  }

  // Fallback
  const firstName = customerName.split(' ')[0];
  return {
    email_subject: `How did we go, ${firstName}?`,
    email_body: `Hi ${firstName},\n\nThanks for choosing ${orgName} for your ${serviceType || 'recent project'}. We hope everything turned out great!\n\nIf you have a moment, we'd really appreciate a quick Google review. It helps other people in the area find us, and it means a lot to our team.\n\nCheers,\n${orgName}`,
    sms_body: `Hey ${firstName}, thanks for choosing ${orgName}! If you had a great experience, a quick review would mean a lot: `,
  };
}

// ─── 7. AI CHAT (for lead capture widget) ────────────────────

export async function chatWithLead(
  messages: { role: 'user' | 'assistant'; content: string }[],
  orgName: string,
  industry: string,
  formFields: string[],
  businessContext?: string
): Promise<string> {
  const system = `You are a friendly, helpful assistant on ${orgName}'s website (${industry} business). Your job is to:
1. Greet visitors warmly and understand their needs
2. Naturally collect their information through conversation: ${formFields.join(', ')}
3. Be conversational, not robotic. Ask one question at a time.
4. Once you have enough info, let them know someone will be in touch soon.
5. Keep responses short (2-3 sentences max).
6. If they ask about pricing, give general ranges but encourage a consultation.
7. Never make up specific availability or promises about timing.

Be genuinely helpful, not salesy.${businessContext ? `\n\nIMPORTANT — Use this business information to answer visitor questions accurately:\n${businessContext}` : ''}`;

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

// ─── AI POST-CALL ACTION ITEM EXTRACTION ──────────────────────
// Extracts structured action items from a call transcript.

export interface CallActionItem {
  action: string;
  priority: 'high' | 'medium' | 'low';
  category: 'follow_up' | 'quote' | 'scheduling' | 'internal' | 'documentation';
  deadline_hint?: string;
}

export interface CallAnalysis {
  action_items: CallActionItem[];
  lead_intent: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  next_best_action: string;
}

export async function extractCallActionItems(
  transcript: string,
  callerName?: string,
  serviceType?: string
): Promise<CallAnalysis> {
  const systemPrompt = `You are a business assistant that analyses call transcripts and extracts action items.
Return JSON with:
- action_items: array of { action: string, priority: "high"|"medium"|"low", category: "follow_up"|"quote"|"scheduling"|"internal"|"documentation", deadline_hint?: string }
- lead_intent: one-sentence summary of what the caller wants
- sentiment: "positive"|"neutral"|"negative"
- next_best_action: recommended next step for the business`;

  const userPrompt = `Analyse this call transcript and extract action items:

${callerName ? `Caller: ${callerName}` : ''}
${serviceType ? `Service discussed: ${serviceType}` : ''}

Transcript:
${transcript}`;

  const result = await callAI(systemPrompt, userPrompt);
  if (!result) {
    return {
      action_items: [{ action: 'Review call recording and follow up', priority: 'medium', category: 'follow_up' }],
      lead_intent: 'Unable to analyse — review manually',
      sentiment: 'neutral',
      next_best_action: 'Listen to the recording and take appropriate action',
    };
  }

  try {
    return JSON.parse(result) as CallAnalysis;
  } catch {
    return {
      action_items: [{ action: 'Review call recording and follow up', priority: 'medium', category: 'follow_up' }],
      lead_intent: result.substring(0, 100),
      sentiment: 'neutral',
      next_best_action: 'Follow up with the caller',
    };
  }
}

// ─── 8. AI DAILY GAME PLAN ────────────────────────────────────
// Generates a prioritized daily action list ranked by revenue impact.

export interface GamePlanAction {
  type: 'call' | 'follow_up' | 'send_quote' | 'review_request' | 'reengage' | 'check_in' | 'prepare';
  priority: 'critical' | 'high' | 'medium' | 'low';
  lead_id: string;
  lead_name: string;
  title: string;
  reason: string;
  suggested_action: string;
  estimated_value: number | null;
  channel: 'phone' | 'email' | 'sms';
  urgency_score: number; // 0-100
}

export interface DailyGamePlan {
  greeting: string;
  summary: string;
  actions: GamePlanAction[];
  revenue_at_stake: number;
  quick_wins: number;
}

export async function generateDailyGamePlan(
  leads: Lead[],
  appointments: { id: string; lead_id: string | null; title: string; start_time: string; status: string }[],
  quotes: { id: string; lead_id: string; total: number; status: string; created_at: string; sent_at: string | null }[],
  orgName: string
): Promise<DailyGamePlan> {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Build local action list from data analysis (no AI needed for this part)
  const actions: GamePlanAction[] = [];

  // 1. Hot leads not yet contacted
  const hotUncontacted = leads.filter(
    (l) => (l.ai_score || 0) >= 70 && !l.last_contacted_at && l.status === 'new'
  );
  for (const lead of hotUncontacted.slice(0, 5)) {
    actions.push({
      type: 'call',
      priority: (lead.ai_score || 0) >= 85 ? 'critical' : 'high',
      lead_id: lead.id,
      lead_name: `${lead.first_name} ${lead.last_name}`,
      title: `Call ${lead.first_name} — hot lead, never contacted`,
      reason: `AI score ${lead.ai_score}, submitted ${timeAgo(lead.created_at)}. ${lead.service_type ? `Wants ${lead.service_type}.` : ''} ${lead.urgency === 'asap' || lead.urgency === 'emergency' ? 'URGENT.' : ''}`,
      suggested_action: `Call now. Reference their ${lead.service_type || 'enquiry'} and offer a site visit.`,
      estimated_value: estimateLeadValue(lead, quotes),
      channel: lead.phone ? 'phone' : 'email',
      urgency_score: Math.min(100, (lead.ai_score || 50) + (lead.urgency === 'asap' ? 20 : 0)),
    });
  }

  // 2. Quotes pending response (sent 2+ days ago)
  const pendingQuotes = quotes.filter(
    (q) => q.status === 'sent' && q.sent_at && daysSince(q.sent_at) >= 2
  );
  for (const quote of pendingQuotes.slice(0, 5)) {
    const lead = leads.find((l) => l.id === quote.lead_id);
    if (!lead) continue;
    actions.push({
      type: 'follow_up',
      priority: quote.total >= 5000 ? 'high' : 'medium',
      lead_id: lead.id,
      lead_name: `${lead.first_name} ${lead.last_name}`,
      title: `Follow up on $${quote.total.toLocaleString()} quote — ${lead.first_name}`,
      reason: `Quote sent ${timeAgo(quote.sent_at!)}. No response yet. $${quote.total.toLocaleString()} at stake.`,
      suggested_action: `Quick call or SMS: "Hey ${lead.first_name}, just checking if you had any questions about the quote?"`,
      estimated_value: quote.total,
      channel: lead.phone ? 'phone' : 'email',
      urgency_score: Math.min(100, 50 + daysSince(quote.sent_at!) * 8),
    });
  }

  // 3. Leads going cold (3-7 days no contact, still active)
  const goingCold = leads.filter((l) => {
    const lastActivity = l.last_contacted_at || l.created_at;
    const days = daysSince(lastActivity);
    return days >= 3 && days <= 14 && !['won', 'lost'].includes(l.status);
  });
  for (const lead of goingCold.slice(0, 5)) {
    const days = daysSince(lead.last_contacted_at || lead.created_at);
    actions.push({
      type: 'reengage',
      priority: days >= 7 ? 'high' : 'medium',
      lead_id: lead.id,
      lead_name: `${lead.first_name} ${lead.last_name}`,
      title: `Re-engage ${lead.first_name} — ${days} days silent`,
      reason: `Last activity ${timeAgo(lead.last_contacted_at || lead.created_at)}. Risk of losing this lead.`,
      suggested_action: days >= 7
        ? `Try a different channel. ${lead.phone ? 'Send a casual SMS.' : 'Call directly.'}`
        : `Gentle follow-up — add value, don't just ask "checking in."`,
      estimated_value: estimateLeadValue(lead, quotes),
      channel: days >= 7 ? 'sms' : 'email',
      urgency_score: Math.min(100, 30 + days * 7),
    });
  }

  // 4. Draft quotes that need sending
  const draftQuotes = quotes.filter((q) => q.status === 'draft' && daysSince(q.created_at) <= 7);
  for (const quote of draftQuotes.slice(0, 3)) {
    const lead = leads.find((l) => l.id === quote.lead_id);
    if (!lead) continue;
    actions.push({
      type: 'send_quote',
      priority: 'medium',
      lead_id: lead.id,
      lead_name: `${lead.first_name} ${lead.last_name}`,
      title: `Send $${quote.total.toLocaleString()} draft quote to ${lead.first_name}`,
      reason: `Draft quote created ${timeAgo(quote.created_at)}. Review and send before the lead goes cold.`,
      suggested_action: `Review the quote, adjust if needed, then send with a personal note.`,
      estimated_value: quote.total,
      channel: 'email',
      urgency_score: 45,
    });
  }

  // 5. Won leads needing check-in / review request (completed 1-7 days ago)
  const recentWins = leads.filter((l) => {
    if (l.status !== 'won' || !l.won_date) return false;
    const days = daysSince(l.won_date);
    return days >= 1 && days <= 7;
  });
  for (const lead of recentWins.slice(0, 3)) {
    const days = daysSince(lead.won_date!);
    actions.push({
      type: days >= 3 ? 'review_request' : 'check_in',
      priority: 'low',
      lead_id: lead.id,
      lead_name: `${lead.first_name} ${lead.last_name}`,
      title: days >= 3
        ? `Ask ${lead.first_name} for a review`
        : `Check in with ${lead.first_name} after job`,
      reason: days >= 3
        ? `Job completed ${days} days ago — peak satisfaction window for reviews.`
        : `Job completed yesterday. Quick check-in builds loyalty and catches issues early.`,
      suggested_action: days >= 3
        ? `Send a review request. Keep it personal and genuine.`
        : `Quick message: "Hey ${lead.first_name}, just wanted to make sure everything looks good!"`,
      estimated_value: null,
      channel: days >= 3 ? 'email' : 'sms',
      urgency_score: 20,
    });
  }

  // 6. Today's appointments needing prep
  const todayAppointments = appointments.filter(
    (a) => a.start_time.startsWith(todayStr) && a.status !== 'cancelled'
  );
  for (const appt of todayAppointments.slice(0, 3)) {
    const lead = appt.lead_id ? leads.find((l) => l.id === appt.lead_id) : null;
    actions.push({
      type: 'prepare',
      priority: 'high',
      lead_id: appt.lead_id || '',
      lead_name: lead ? `${lead.first_name} ${lead.last_name}` : appt.title,
      title: `Prepare for: ${appt.title}`,
      reason: `Appointment at ${new Date(appt.start_time).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })} today.`,
      suggested_action: lead
        ? `Review their details. They want ${lead.service_type || 'help'}, budget: ${lead.budget_range || 'unknown'}.`
        : `Review appointment notes before heading out.`,
      estimated_value: lead ? estimateLeadValue(lead, quotes) : null,
      channel: 'phone',
      urgency_score: 80,
    });
  }

  // Sort by urgency_score desc
  actions.sort((a, b) => b.urgency_score - a.urgency_score);

  // Calculate totals
  const revenueAtStake = actions.reduce((sum, a) => sum + (a.estimated_value || 0), 0);
  const quickWins = actions.filter((a) => a.urgency_score >= 60).length;

  // Use AI for a personalized greeting + summary if available
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

  let greeting = `Good ${timeOfDay}! Here's your game plan for today.`;
  let summary = `You have ${actions.length} actions today with $${revenueAtStake.toLocaleString()} in potential revenue at stake.`;

  const aiResult = await callAI(
    `You are a motivating business coach for ${orgName}. Be direct, encouraging, and specific. Always respond in JSON format.`,
    `Write a brief daily game plan intro.

Actions today: ${actions.length}
Revenue at stake: $${revenueAtStake.toLocaleString()}
Quick wins (high urgency): ${quickWins}
Hot uncontacted leads: ${hotUncontacted.length}
Pending quotes: ${pendingQuotes.length}
Leads going cold: ${goingCold.length}
Today's appointments: ${todayAppointments.length}
Time of day: ${timeOfDay}

Respond in JSON:
{
  "greeting": "A short, energizing greeting (1 sentence, use time of day)",
  "summary": "A 2-sentence summary of what matters most today. Be specific about numbers and priorities."
}`
  );

  if (aiResult) {
    try {
      const parsed = JSON.parse(aiResult.match(/\{[\s\S]*\}/)?.[0] || aiResult);
      greeting = parsed.greeting || greeting;
      summary = parsed.summary || summary;
    } catch { /* use defaults */ }
  }

  return { greeting, summary, actions: actions.slice(0, 12), revenue_at_stake: revenueAtStake, quick_wins: quickWins };
}

// ─── 9. REVENUE GAP CLOSER ────────────────────────────────────
// Analyzes pipeline vs target and suggests specific actions to close the gap.

export interface RevenueGapAction {
  lead_id: string;
  lead_name: string;
  estimated_value: number;
  close_probability: number; // 0-100
  action: string;
  reason: string;
}

export interface RevenueGapAnalysis {
  monthly_target: number;
  current_revenue: number;
  gap: number;
  days_remaining: number;
  pipeline_value: number;
  weighted_pipeline: number;
  actions: RevenueGapAction[];
  forecast: string;
  ai_insight: string;
}

export async function analyzeRevenueGap(
  leads: Lead[],
  quotes: { id: string; lead_id: string; total: number; status: string; sent_at: string | null }[],
  monthlyTarget: number,
  orgName: string
): Promise<RevenueGapAnalysis> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const daysRemaining = Math.max(1, endOfMonth.getDate() - now.getDate());
  const totalDays = endOfMonth.getDate();

  // Current month revenue from won leads
  const currentRevenue = leads
    .filter((l) => l.status === 'won' && l.won_date && new Date(l.won_date) >= startOfMonth)
    .reduce((sum, l) => sum + (l.won_value || 0), 0);

  const gap = Math.max(0, monthlyTarget - currentRevenue);

  // Build pipeline: active leads with quotes
  const pipelineActions: RevenueGapAction[] = [];
  const activeLeads = leads.filter((l) => !['won', 'lost'].includes(l.status));

  for (const lead of activeLeads) {
    const leadQuotes = quotes.filter((q) => q.lead_id === lead.id && q.status !== 'rejected');
    const bestQuote = leadQuotes.sort((a, b) => b.total - a.total)[0];
    const value = bestQuote?.total || estimateLeadValue(lead, quotes);

    if (!value) continue;

    // Estimate close probability based on status + score + activity
    let probability = 20;
    if (lead.status === 'quote_sent') probability = 50;
    if (lead.status === 'contacted') probability = 30;
    if ((lead.ai_score || 0) >= 80) probability += 15;
    if ((lead.ai_score || 0) >= 60) probability += 10;
    if (lead.last_contacted_at && daysSince(lead.last_contacted_at) <= 2) probability += 10;
    if (lead.last_contacted_at && daysSince(lead.last_contacted_at) >= 7) probability -= 15;
    probability = Math.max(5, Math.min(95, probability));

    let action = 'Follow up';
    let reason = '';
    if (lead.status === 'new') {
      action = `Contact ${lead.first_name} — new lead, no outreach yet`;
      reason = `Score: ${lead.ai_score || 'N/A'}. ${lead.urgency === 'asap' ? 'Marked urgent.' : ''}`;
    } else if (lead.status === 'quote_sent' && bestQuote?.sent_at && daysSince(bestQuote.sent_at) >= 2) {
      action = `Follow up on $${value.toLocaleString()} quote — sent ${timeAgo(bestQuote.sent_at)}`;
      reason = `No response in ${daysSince(bestQuote.sent_at)} days. A quick call could close this.`;
    } else if (lead.status === 'contacted' && !leadQuotes.length) {
      action = `Send quote to ${lead.first_name} — contacted but no quote yet`;
      reason = `They're engaged. A prompt quote keeps momentum.`;
    } else {
      action = `Push ${lead.first_name} forward — currently ${lead.status.replace('_', ' ')}`;
      reason = `$${value.toLocaleString()} potential. Move to next pipeline stage.`;
    }

    pipelineActions.push({
      lead_id: lead.id,
      lead_name: `${lead.first_name} ${lead.last_name}`,
      estimated_value: value,
      close_probability: probability,
      action,
      reason,
    });
  }

  // Sort by weighted value (probability * value) descending
  pipelineActions.sort((a, b) => (b.estimated_value * b.close_probability) - (a.estimated_value * a.close_probability));

  const pipelineValue = pipelineActions.reduce((sum, a) => sum + a.estimated_value, 0);
  const weightedPipeline = Math.round(pipelineActions.reduce((sum, a) => sum + (a.estimated_value * a.close_probability / 100), 0));

  // AI insight
  let forecast = '';
  let aiInsight = '';

  if (gap <= 0) {
    forecast = `You've already hit your $${monthlyTarget.toLocaleString()} target! $${currentRevenue.toLocaleString()} closed this month.`;
    aiInsight = `Great month — keep the momentum going. $${pipelineValue.toLocaleString()} still in pipeline for extra upside.`;
  } else {
    const pct = Math.round((currentRevenue / monthlyTarget) * 100);
    const dailyNeeded = Math.round(gap / daysRemaining);
    forecast = `$${currentRevenue.toLocaleString()} of $${monthlyTarget.toLocaleString()} (${pct}%) with ${daysRemaining} days left. Need $${dailyNeeded.toLocaleString()}/day.`;

    const aiResult = await callAI(
      `You are a revenue strategist for ${orgName}. Be direct and specific. Always respond in JSON format.`,
      `Analyze this revenue gap and provide insight.

Monthly target: $${monthlyTarget.toLocaleString()}
Current revenue: $${currentRevenue.toLocaleString()}
Gap: $${gap.toLocaleString()}
Days remaining: ${daysRemaining}
Pipeline value: $${pipelineValue.toLocaleString()}
Weighted pipeline: $${weightedPipeline.toLocaleString()}
Top opportunities: ${pipelineActions.slice(0, 5).map(a => `${a.lead_name} ($${a.estimated_value.toLocaleString()}, ${a.close_probability}% likely)`).join(', ')}
Active leads: ${activeLeads.length}
Days in month: ${totalDays}

Respond in JSON:
{
  "ai_insight": "2-3 sentences. Be specific about which leads to focus on and what actions will have the biggest impact. Include dollar amounts."
}`
    );

    if (aiResult) {
      try {
        const parsed = JSON.parse(aiResult.match(/\{[\s\S]*\}/)?.[0] || aiResult);
        aiInsight = parsed.ai_insight || '';
      } catch { /* fall through */ }
    }

    if (!aiInsight) {
      aiInsight = weightedPipeline >= gap
        ? `Your weighted pipeline ($${weightedPipeline.toLocaleString()}) can cover the gap. Focus on the top ${Math.min(5, pipelineActions.length)} opportunities.`
        : `Pipeline may not cover the gap. Focus on converting your highest-probability leads and generating new opportunities.`;
    }
  }

  return {
    monthly_target: monthlyTarget,
    current_revenue: currentRevenue,
    gap,
    days_remaining: daysRemaining,
    pipeline_value: pipelineValue,
    weighted_pipeline: weightedPipeline,
    actions: pipelineActions.slice(0, 10),
    forecast,
    ai_insight: aiInsight,
  };
}

// ─── 10. SMART GHOSTING RECOVERY ──────────────────────────────
// Analyzes why a lead went silent and crafts a personalized re-engagement strategy.

export type GhostReason = 'price_shock' | 'got_busy' | 'competitor' | 'still_deciding' | 'bad_timing' | 'lost_interest' | 'unknown';

export interface GhostRecoveryStrategy {
  reason: GhostReason;
  confidence: number; // 0-100
  explanation: string;
  email_subject: string;
  email_body: string;
  sms_body: string;
  strategy: string;
  alternative_offer: string | null;
}

export async function analyzeGhostAndRecover(
  lead: Lead,
  notes: { content: string; is_system: boolean; created_at: string }[],
  quotes: { total: number; status: string; sent_at: string | null }[],
  orgName: string
): Promise<GhostRecoveryStrategy> {
  // Build conversation context
  const conversationHistory = notes
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((n) => `[${n.is_system ? 'System' : 'Note'}] ${n.content}`)
    .join('\n');

  const quoteContext = quotes.length > 0
    ? `Quotes: ${quotes.map(q => `$${q.total.toLocaleString()} (${q.status}${q.sent_at ? `, sent ${timeAgo(q.sent_at)}` : ''})`).join(', ')}`
    : 'No quotes sent';

  const daysSilent = daysSince(lead.last_contacted_at || lead.updated_at);

  const system = `You are a sales psychologist for ${orgName}. Analyze why leads go silent and craft personalized re-engagement messages. Be empathetic, strategic, and never desperate. Always respond in JSON format.`;

  const prompt = `Analyze why this lead went silent and write a re-engagement strategy.

${leadContext(lead)}
Days since last activity: ${daysSilent}
${quoteContext}

Conversation history:
${conversationHistory || 'No notes recorded'}

Possible reasons: price_shock, got_busy, competitor, still_deciding, bad_timing, lost_interest, unknown

Respond in JSON:
{
  "reason": "Most likely reason from the list above",
  "confidence": number 0-100,
  "explanation": "1-2 sentences explaining why you think this is the reason",
  "email_subject": "Short, personal subject line for re-engagement",
  "email_body": "2-3 paragraphs. Tailored to the specific reason. Don't be generic. Reference their actual project. Sign off as ${orgName}.",
  "sms_body": "Under 160 chars. Casual, non-pushy.",
  "strategy": "1-2 sentences on the overall approach",
  "alternative_offer": "A creative alternative to offer based on the reason (e.g., scaled-down scope for price_shock, flexible timeline for bad_timing). Null if not applicable."
}`;

  const result = await callAI(system, prompt);
  if (result) {
    try {
      const parsed = JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || result);
      return {
        reason: parsed.reason || 'unknown',
        confidence: parsed.confidence || 50,
        explanation: parsed.explanation || '',
        email_subject: parsed.email_subject || '',
        email_body: parsed.email_body || '',
        sms_body: parsed.sms_body || '',
        strategy: parsed.strategy || '',
        alternative_offer: parsed.alternative_offer || null,
      };
    } catch { /* fall through */ }
  }

  // Fallback: heuristic-based analysis
  let reason: GhostReason = 'unknown';
  let explanation = 'Unable to determine — review manually.';
  let altOffer: string | null = null;

  const hasExpensiveQuote = quotes.some((q) => q.total >= 5000 && q.status === 'sent');
  if (hasExpensiveQuote) {
    reason = 'price_shock';
    explanation = 'A quote was sent but never responded to — price may have been higher than expected.';
    altOffer = 'Consider offering a phased approach or a scaled-down version of the project.';
  } else if (daysSilent >= 14) {
    reason = 'lost_interest';
    explanation = `No activity in ${daysSilent} days. The lead may have moved on.`;
  } else if (daysSilent >= 5) {
    reason = 'got_busy';
    explanation = 'Moderate silence — they may simply be busy. A gentle nudge could work.';
  }

  return {
    reason,
    confidence: 40,
    explanation,
    email_subject: `Still thinking about your ${lead.service_type || 'project'}?`,
    email_body: `Hi ${lead.first_name},\n\nJust wanted to check in — no pressure at all. I know things get busy, and I wanted to make sure your ${lead.service_type || 'project'} is still on your radar.\n\nIf anything has changed or you'd like to explore a different approach, I'm happy to chat.\n\nCheers,\n${orgName}`,
    sms_body: `Hey ${lead.first_name}, no rush — just checking if you're still thinking about your project. Happy to help anytime! — ${orgName}`,
    strategy: 'Gentle, no-pressure follow-up with an open-ended question.',
    alternative_offer: altOffer,
  };
}

// ─── 11. PRE-MEETING BRIEFING ─────────────────────────────────
// Generates talking points and conversation highlights before a meeting.

export interface MeetingBriefing {
  talking_points: string[];
  conversation_highlights: string[];
  lead_snapshot: string;
}

export async function generateMeetingBriefing(
  lead: Lead,
  notes: { content: string; is_system: boolean; created_at: string }[],
  quotes: { total: number; status: string }[],
  orgName: string
): Promise<MeetingBriefing> {
  // Build conversation highlights from notes
  const userNotes = notes
    .filter((n) => !n.is_system)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10)
    .map((n) => n.content);

  const systemNotes = notes
    .filter((n) => n.is_system)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((n) => n.content);

  const quoteInfo = quotes.length > 0
    ? quotes.map((q) => `$${q.total.toLocaleString()} (${q.status})`).join(', ')
    : 'No quotes yet';

  const system = `You are a meeting preparation assistant for ${orgName}. Generate concise, actionable briefing notes. Always respond in JSON format.`;

  const prompt = `Prepare a pre-meeting briefing for this lead.

${leadContext(lead)}
Quotes: ${quoteInfo}

User notes: ${userNotes.join(' | ') || 'None'}
System activity: ${systemNotes.join(' | ') || 'None'}

Respond in JSON:
{
  "talking_points": ["4-6 specific talking points. Reference actual details from their enquiry. Include potential upsells if relevant."],
  "conversation_highlights": ["2-4 key things from the notes/history worth mentioning. If no notes, use lead data."],
  "lead_snapshot": "2-sentence summary: who they are, what they want, where they're at in the process"
}`;

  const result = await callAI(system, prompt);
  if (result) {
    try {
      const parsed = JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || result);
      return {
        talking_points: parsed.talking_points || [],
        conversation_highlights: parsed.conversation_highlights || [],
        lead_snapshot: parsed.lead_snapshot || '',
      };
    } catch { /* fall through */ }
  }

  // Fallback
  const talkingPoints = [
    `Reference their ${lead.service_type || 'project'} enquiry`,
    lead.budget_range ? `Budget range: ${lead.budget_range} — confirm expectations` : 'Discuss scope to understand budget',
    lead.location ? `Confirm project location: ${lead.location}` : 'Ask about project location',
    lead.urgency ? `Timeline: ${lead.urgency} — discuss scheduling` : 'Understand their timeline',
    'Offer to do a detailed assessment or site visit',
  ];

  return {
    talking_points: talkingPoints,
    conversation_highlights: userNotes.length > 0 ? userNotes.slice(0, 3) : ['No previous conversation notes on file'],
    lead_snapshot: `${lead.first_name} ${lead.last_name} enquired about ${lead.service_type || 'your services'}${lead.location ? ` in ${lead.location}` : ''}. Currently ${lead.status.replace('_', ' ')} with AI score ${lead.ai_score || 'pending'}.`,
  };
}

// ─── 12. POST-JOB LIFECYCLE MESSAGES ──────────────────────────
// Generates personalized lifecycle messages for each stage.

export type LifecycleStage = 'check_in' | 'review_request' | 'referral_ask' | 'cross_sell' | 'maintenance' | 'anniversary';

export interface LifecycleMessage {
  email_subject: string;
  email_body: string;
  sms_body: string;
}

export async function generateLifecycleMessage(
  customerName: string,
  serviceType: string,
  orgName: string,
  stage: LifecycleStage,
  customTemplate?: string
): Promise<LifecycleMessage> {
  const stageDescriptions: Record<LifecycleStage, string> = {
    check_in: 'Day 1 after job completion. Check everything is good. Catch issues early.',
    review_request: 'Day 3 after job completion. Ask for a Google review. Peak satisfaction window.',
    referral_ask: 'Day 14 after job completion. Ask if they know anyone who needs similar work.',
    cross_sell: 'Day 30 after job completion. Suggest related services they might need.',
    maintenance: 'Seasonal reminder. Time for maintenance or service check.',
    anniversary: '1 year anniversary of the completed job. Re-engage for repeat business.',
  };

  const system = `You are writing a post-job follow-up message on behalf of ${orgName}. Be genuine, personal, and never robotic. Always respond in JSON format.`;

  const prompt = `Write a ${stage.replace('_', ' ')} message for a customer.

Customer: ${customerName}
Service completed: ${serviceType}
Business: ${orgName}
Stage: ${stageDescriptions[stage]}
${customTemplate ? `Custom template/instructions: ${customTemplate}` : ''}

Rules:
- Use their first name naturally
- Reference the specific service they received
- Keep it warm, genuine, not automated-sounding
- Email body: 2-3 short paragraphs
- SMS: under 160 characters
- Don't use "Dear" or "Valued customer"

Respond in JSON:
{
  "email_subject": "Short, natural subject line",
  "email_body": "Plain text email body. Sign off as ${orgName}.",
  "sms_body": "SMS under 160 chars"
}`;

  const result = await callAI(system, prompt);
  if (result) {
    try {
      return JSON.parse(result.match(/\{[\s\S]*\}/)?.[0] || result);
    } catch { /* fall through */ }
  }

  // Fallback templates per stage
  const firstName = customerName.split(' ')[0];
  const fallbacks: Record<LifecycleStage, LifecycleMessage> = {
    check_in: {
      email_subject: `How's everything looking, ${firstName}?`,
      email_body: `Hi ${firstName},\n\nJust a quick check-in after your ${serviceType || 'recent project'}. Hope everything's looking great!\n\nIf you notice anything at all, don't hesitate to reach out — we're happy to take a look.\n\nCheers,\n${orgName}`,
      sms_body: `Hey ${firstName}, just checking in after your ${serviceType || 'project'}. Everything looking good? — ${orgName}`,
    },
    review_request: {
      email_subject: `How did we go, ${firstName}?`,
      email_body: `Hi ${firstName},\n\nThanks for choosing ${orgName} for your ${serviceType || 'project'}. We hope everything turned out great!\n\nIf you have a moment, a quick Google review would mean a lot to our team. It helps others in the area find us too.\n\nCheers,\n${orgName}`,
      sms_body: `Hey ${firstName}, if you're happy with the ${serviceType || 'work'}, a quick Google review would mean the world! — ${orgName}`,
    },
    referral_ask: {
      email_subject: `Know anyone who needs ${serviceType || 'a hand'}?`,
      email_body: `Hi ${firstName},\n\nHope you're still enjoying the results of your ${serviceType || 'project'}!\n\nIf you know anyone who could use similar work, we'd love the referral. Word of mouth is how we grow, and we'll make sure they're looked after.\n\nCheers,\n${orgName}`,
      sms_body: `Hey ${firstName}, know anyone who needs ${serviceType || 'help'}? We'd appreciate the referral! — ${orgName}`,
    },
    cross_sell: {
      email_subject: `Something else we can help with, ${firstName}?`,
      email_body: `Hi ${firstName},\n\nIt's been a few weeks since we finished your ${serviceType || 'project'}, and we hope you're loving the result.\n\nA lot of our clients also take advantage of our other services — happy to have a chat if there's anything else on your list.\n\nCheers,\n${orgName}`,
      sms_body: `Hey ${firstName}, got anything else on the to-do list? We'd love to help again. — ${orgName}`,
    },
    maintenance: {
      email_subject: `Time for a check-up on your ${serviceType || 'system'}?`,
      email_body: `Hi ${firstName},\n\nJust a friendly reminder — it's been a while since we completed your ${serviceType || 'project'}, and it might be time for a maintenance check.\n\nRegular upkeep keeps everything running smoothly and prevents costly surprises down the track.\n\nWant us to schedule something in?\n\nCheers,\n${orgName}`,
      sms_body: `Hey ${firstName}, time for a maintenance check on your ${serviceType || 'system'}? Let us know! — ${orgName}`,
    },
    anniversary: {
      email_subject: `It's been a year, ${firstName}!`,
      email_body: `Hi ${firstName},\n\nCan you believe it's been a year since we finished your ${serviceType || 'project'}? Time flies!\n\nHope everything is still going strong. If you ever need anything — maintenance, upgrades, or a new project — we're just a call away.\n\nCheers,\n${orgName}`,
      sms_body: `Hey ${firstName}, it's been a year since your ${serviceType || 'project'}! Hope it's still going strong. — ${orgName}`,
    },
  };

  return fallbacks[stage];
}

// ─── SHARED HELPERS ───────────────────────────────────────────

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function timeAgo(dateStr: string): string {
  const days = daysSince(dateStr);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function estimateLeadValue(
  lead: Lead,
  quotes: { lead_id: string; total: number }[]
): number {
  const leadQuote = quotes.find((q) => q.lead_id === lead.id);
  if (leadQuote) return leadQuote.total;

  // Rough estimate from budget range
  const budgetMap: Record<string, number> = {
    under_1k: 700, '1k_5k': 3000, '5k_15k': 10000, '15k_50k': 30000, '50k_plus': 75000,
    under_10k: 6000, '10k_50k': 25000, '50k_150k': 90000, '150k_500k': 300000, '500k_plus': 750000,
  };
  return budgetMap[lead.budget_range || ''] || 0;
}

// ─── AI CHAT LEAD EXTRACTION ──────────────────────────────────
// Extracts structured lead info from a chat conversation.

export interface ExtractedLeadData {
  name?: string;
  email?: string;
  phone?: string;
  service_type?: string;
  message?: string;
  has_enough_info: boolean;
}

// ─── 13. AI BUSINESS STRATEGY ADVISOR ──────────────────────────

export interface BusinessInsight {
  answer: string;
  data_points: { label: string; value: string }[];
  recommendations: string[];
  follow_up_questions: string[];
}

export async function generateBusinessInsight(
  question: string,
  businessContext: string,
  conversationHistory: { role: 'user' | 'assistant'; content: string }[],
  orgName: string,
  industry: string
): Promise<BusinessInsight> {
  const systemPrompt = `You are a business strategy advisor for ${orgName}, a ${industry} business. You have access to their real business data from Odyssey (a lead management platform).

Your role:
1. Answer questions about their business performance using the data provided
2. Give specific, actionable advice grounded in their numbers — not generic tips
3. When recommending actions, reference specific leads, conversion rates, or revenue figures
4. Be conversational but data-driven. Think like a fractional COO who knows their business inside-out
5. Keep answers concise — 2-4 paragraphs max unless they ask for a detailed plan
6. For casual messages (greetings, thanks, etc.), respond naturally and conversationally — still stay in character as their advisor

You MUST always respond in valid JSON with this exact structure:
{
  "answer": "Your response text",
  "data_points": [{"label": "Metric Name", "value": "Value"}],
  "recommendations": ["Action items"],
  "follow_up_questions": ["Suggested follow-ups"]
}`;

  const jsonInstruction = `\n\nRespond in JSON: { "answer": "...", "data_points": [{"label":"...","value":"..."}], "recommendations": ["..."], "follow_up_questions": ["..."] }`;

  // Build proper message turns for real conversation support
  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Here is my current business data:\n\n${businessContext}\n\nI'm ready to ask questions.` },
    { role: 'assistant', content: JSON.stringify({
      answer: `I've loaded your business data. What would you like to know about ${orgName}?`,
      data_points: [],
      recommendations: [],
      follow_up_questions: ['Give me a performance overview', 'How is my pipeline looking?', 'Which lead sources are best?'],
    }) },
  ];

  // Add conversation history as proper message turns
  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content + jsonInstruction });
    } else {
      // Ensure assistant messages are valid JSON (matches response_format expectation)
      let assistantContent = msg.content;
      try {
        JSON.parse(assistantContent);
      } catch {
        assistantContent = JSON.stringify({
          answer: msg.content,
          data_points: [],
          recommendations: [],
          follow_up_questions: [],
        });
      }
      messages.push({ role: 'assistant', content: assistantContent });
    }
  }

  // Add current question
  messages.push({ role: 'user', content: question + jsonInstruction });

  // Direct API call with proper conversation turns
  const provider = process.env.AI_PROVIDER || 'openai';

  try {
    if (provider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        console.error('Strategy AI: No ANTHROPIC_API_KEY');
        return strategyFallback(orgName, 'No Anthropic API key configured');
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
          max_tokens: 2000,
          system: systemPrompt,
          messages: messages.filter(m => m.role !== 'system').map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => 'unknown');
        console.error('Strategy AI Anthropic error:', response.status, errText);
        return strategyFallback(orgName, `Anthropic API error ${response.status}: ${errText.substring(0, 200)}`);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;
      if (content) {
        return JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || content);
      }
      return strategyFallback(orgName, 'Anthropic returned empty response');
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error('Strategy AI: No OPENAI_API_KEY');
        return strategyFallback(orgName, 'No OpenAI API key configured. Set OPENAI_API_KEY in .env.local');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => 'unknown');
        console.error('Strategy AI OpenAI error:', response.status, errText);
        return strategyFallback(orgName, `OpenAI API error ${response.status}: ${errText.substring(0, 200)}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return JSON.parse(content.match(/\{[\s\S]*\}/)?.[0] || content);
      }
      return strategyFallback(orgName, 'OpenAI returned empty response');
    }
  } catch (err) {
    console.error('Strategy AI exception:', err);
    return strategyFallback(orgName, `Exception: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function strategyFallback(orgName: string, debugError?: string): BusinessInsight {
  const isDev = process.env.NODE_ENV === 'development';
  return {
    answer: isDev && debugError
      ? `[DEBUG] AI call failed: ${debugError}\n\nCheck your OpenAI API key in .env.local — it may be expired, have insufficient credits, or be rate-limited.`
      : `I'm having trouble analysing your data right now. This could be a temporary issue with the AI service. Please try again in a moment.`,
    data_points: [],
    recommendations: isDev && debugError
      ? ['Check your OpenAI API key at platform.openai.com', 'Verify you have API credits remaining', 'Check the terminal for detailed error logs']
      : ['Try again in a few seconds', 'Ask a specific question about your leads or revenue'],
    follow_up_questions: [
      'What\'s my conversion rate this month?',
      'Which lead sources are performing best?',
      'How does my pipeline look right now?',
    ],
  };
}

export function extractLeadFromChat(
  messages: { role: string; content: string }[]
): ExtractedLeadData {
  const allText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ');

  // Simple regex extraction
  const emailMatch = allText.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  const phoneMatch = allText.match(/(?:\+?\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/);

  // Try to extract name from early messages
  let name: string | undefined;
  const namePatterns = [
    /(?:my name is|i'm|i am|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/m,
  ];
  for (const pattern of namePatterns) {
    const match = allText.match(pattern);
    if (match) { name = match[1]; break; }
  }

  return {
    name,
    email: emailMatch?.[0],
    phone: phoneMatch?.[0],
    service_type: undefined,
    message: allText.substring(0, 500),
    has_enough_info: !!(name && (emailMatch || phoneMatch)),
  };
}
