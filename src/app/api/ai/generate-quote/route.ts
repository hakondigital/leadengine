import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { service_type, description, budget_range, organization_id } = body;

    if (!service_type || !description || !organization_id) {
      return NextResponse.json(
        { error: 'service_type, description, and organization_id are required' },
        { status: 400 }
      );
    }

    const { unauthorized } = await requireCallerOwnsOrg(organization_id);
    if (unauthorized) return unauthorized;

    const supabase = await createServiceRoleClient();

    // Fetch org's estimator configs for pricing context
    const { data: estimatorConfigs } = await supabase
      .from('estimator_configs')
      .select('service_type, min_price, max_price, unit, display_text, factors')
      .eq('organization_id', organization_id)
      .eq('is_active', true);

    // Fetch recent similar quotes for reference
    const { data: recentQuotes } = await supabase
      .from('quotes')
      .select('title, line_items, subtotal, total, status')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Filter to quotes with similar service type in title (best-effort match)
    const similarQuotes = (recentQuotes || []).filter((q) =>
      q.title?.toLowerCase().includes(service_type.toLowerCase())
    ).slice(0, 5);

    // Build pricing context
    const pricingContext = (estimatorConfigs || []).map((c) =>
      `${c.service_type}: $${c.min_price}–$${c.max_price} per ${c.unit}${c.factors?.length ? ` (factors: ${c.factors.join(', ')})` : ''}`
    ).join('\n');

    const recentQuotesContext = similarQuotes.length > 0
      ? similarQuotes.map((q) => {
          const items = Array.isArray(q.line_items) ? q.line_items : [];
          return `"${q.title}" — $${q.total} (${q.status}), ${items.length} line items`;
        }).join('\n')
      : 'No recent similar quotes found.';

    const systemPrompt = `You are a quoting assistant for a service business. Based on the service type, description, budget range, and pricing data provided, generate appropriate line items for a quote. Return JSON: { "line_items": [{ "description": "string", "quantity": 1, "unit_price": 100 }], "notes": "string" }

IMPORTANT: Only return the raw JSON object, no markdown or code blocks.`;

    const userPrompt = `Generate a quote for the following job:

SERVICE TYPE: ${service_type}
DESCRIPTION: ${description}
${budget_range ? `BUDGET RANGE: ${budget_range}` : ''}

PRICING DATA (from our estimator):
${pricingContext || 'No estimator data configured yet — use reasonable industry rates.'}

RECENT SIMILAR QUOTES:
${recentQuotesContext}

Generate realistic, well-structured line items that a tradesperson or service business would use. Include materials, labour, and any common extras. Keep prices realistic.`;

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
        max_tokens: 1024,
        messages: [
          { role: 'user', content: userPrompt },
        ],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[AI Generate Quote] Anthropic error:', errText);
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

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      line_items: parsed.line_items || [],
      notes: parsed.notes || '',
    });
  } catch (error) {
    console.error('[AI Generate Quote] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
