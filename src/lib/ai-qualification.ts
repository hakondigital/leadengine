import type { Lead, LeadPriority, AIAnalysis } from './database.types';

type AIAnalysisResult = Omit<AIAnalysis, 'id' | 'lead_id' | 'created_at'>;

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

function buildPrompt(lead: Lead): string {
  return `You are a lead qualification assistant for a service business. Analyze the following lead submission and provide a structured assessment.

LEAD DATA:
- Name: ${lead.first_name} ${lead.last_name}
- Email: ${lead.email}
- Phone: ${lead.phone || 'Not provided'}
- Company: ${lead.company || 'Not provided'}
- Service Type: ${lead.service_type || 'Not specified'}
- Project Type: ${lead.project_type || 'Not specified'}
- Location: ${lead.location || 'Not provided'}
- Budget Range: ${lead.budget_range || 'Not specified'}
- Urgency: ${lead.urgency || 'Not specified'}
- Timeframe: ${lead.timeframe || 'Not specified'}
- Message: ${lead.message || 'No message provided'}
- Source: ${lead.source}

Respond in JSON format with these exact fields:
{
  "summary": "A 1-2 sentence professional summary of this lead opportunity",
  "priority": "critical|high|medium|low",
  "urgency_assessment": "A brief assessment of urgency level and reasoning",
  "quality_score": 0-100,
  "recommended_action": "Specific next step recommendation",
  "response_channel": "phone|email|either",
  "response_timing": "Recommended response time (e.g., 'within 1 hour', 'within 4 hours')",
  "missing_info_flags": ["list of important missing information"],
  "confidence_level": 0-100
}

Be concise, professional, and actionable. Focus on commercial value and urgency.`;
}

async function callOpenAI(prompt: string): Promise<AIAnalysisResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OpenAI API key not configured');
    return null;
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
        { role: 'system', content: 'You are a lead qualification AI. Always respond with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    console.error('OpenAI error:', await response.text());
    return null;
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  if (!content) return null;

  const parsed = JSON.parse(content);
  return {
    summary: parsed.summary,
    priority: parsed.priority as LeadPriority,
    urgency_assessment: parsed.urgency_assessment,
    quality_score: Math.min(100, Math.max(0, parsed.quality_score)),
    recommended_action: parsed.recommended_action,
    response_channel: parsed.response_channel,
    response_timing: parsed.response_timing,
    missing_info_flags: parsed.missing_info_flags || [],
    confidence_level: Math.min(100, Math.max(0, parsed.confidence_level)),
    raw_response: data,
    model_used: 'gpt-4o-mini',
  };
}

async function callAnthropic(prompt: string): Promise<AIAnalysisResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('Anthropic API key not configured');
    return null;
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
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    console.error('Anthropic error:', await response.text());
    return null;
  }

  const data = await response.json();
  const content = data.content[0]?.text;
  if (!content) return null;

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    summary: parsed.summary,
    priority: parsed.priority as LeadPriority,
    urgency_assessment: parsed.urgency_assessment,
    quality_score: Math.min(100, Math.max(0, parsed.quality_score)),
    recommended_action: parsed.recommended_action,
    response_channel: parsed.response_channel,
    response_timing: parsed.response_timing,
    missing_info_flags: parsed.missing_info_flags || [],
    confidence_level: Math.min(100, Math.max(0, parsed.confidence_level)),
    raw_response: data,
    model_used: 'claude-haiku-4-5-20251001',
  };
}

// Fallback rule-based qualification when no AI provider is available
function ruleBasedQualification(lead: Lead): AIAnalysisResult {
  let score = 50;
  let priority: LeadPriority = 'medium';
  const missingFlags: string[] = [];

  // Score adjustments
  if (lead.phone) score += 10;
  if (lead.message && lead.message.length > 20) score += 10;
  if (lead.budget_range) score += 10;
  if (lead.location) score += 5;
  if (lead.company) score += 5;

  // Urgency
  if (lead.urgency === 'asap' || lead.urgency === 'emergency') {
    score += 15;
    priority = 'critical';
  } else if (lead.urgency === 'within_week' || lead.urgency === 'soon') {
    score += 10;
    priority = 'high';
  }

  // Budget signals
  if (lead.budget_range?.includes('50k') || lead.budget_range?.includes('150k') || lead.budget_range?.includes('500k')) {
    score += 10;
    if (priority === 'medium') priority = 'high';
  }

  // Missing info
  if (!lead.phone) missingFlags.push('Phone number not provided');
  if (!lead.message) missingFlags.push('No project description');
  if (!lead.budget_range) missingFlags.push('Budget range not specified');
  if (!lead.location) missingFlags.push('Location not provided');

  score = Math.min(100, Math.max(0, score));

  const urgencyMap: Record<string, string> = {
    asap: 'Emergency — immediate response needed',
    emergency: 'Emergency — immediate response needed',
    within_week: 'High urgency — respond today',
    soon: 'High urgency — respond today',
    this_week: 'Moderate urgency — respond within 24 hours',
    within_month: 'Standard — respond within 24 hours',
    no_rush: 'Low urgency — respond within 48 hours',
    flexible: 'Low urgency — respond within 48 hours',
  };

  return {
    summary: `${lead.first_name} ${lead.last_name} enquired about ${lead.service_type || lead.project_type || 'services'}${lead.location ? ` in ${lead.location}` : ''}. ${lead.urgency === 'asap' || lead.urgency === 'emergency' ? 'Urgent request.' : ''} ${lead.budget_range ? `Budget: ${lead.budget_range}.` : ''}`.trim(),
    priority,
    urgency_assessment: urgencyMap[lead.urgency || ''] || 'Urgency not specified — treat as standard.',
    quality_score: score,
    recommended_action: priority === 'critical' ? 'Call immediately' : priority === 'high' ? 'Call within 1 hour' : 'Respond via email within 4 hours',
    response_channel: lead.phone ? 'phone' : 'email',
    response_timing: priority === 'critical' ? 'Within 15 minutes' : priority === 'high' ? 'Within 1 hour' : 'Within 4 hours',
    missing_info_flags: missingFlags,
    confidence_level: 60,
    raw_response: { method: 'rule_based' },
    model_used: 'rule_based',
  };
}

export async function qualifyLead(lead: Lead): Promise<AIAnalysisResult> {
  const prompt = buildPrompt(lead);

  try {
    let result: AIAnalysisResult | null = null;

    if (AI_PROVIDER === 'anthropic') {
      result = await callAnthropic(prompt);
    } else {
      result = await callOpenAI(prompt);
    }

    if (result) return result;
  } catch (error) {
    console.error('AI qualification error:', error);
  }

  // Fallback to rule-based
  return ruleBasedQualification(lead);
}
