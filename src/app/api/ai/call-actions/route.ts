import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { extractCallActionItems } from '@/lib/ai-actions';

// POST /api/ai/call-actions
// Extract AI action items from a call transcript

export async function POST(request: NextRequest) {
  try {
    const { call_id } = await request.json();

    if (!call_id) {
      return NextResponse.json({ error: 'call_id required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Fetch the call log with transcript
    const { data: call, error } = await supabase
      .from('call_logs')
      .select('*, lead:leads(first_name, last_name, service_type)')
      .eq('id', call_id)
      .single();

    if (error || !call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    if (!call.transcript) {
      return NextResponse.json({ error: 'No transcript available for this call' }, { status: 400 });
    }

    const callerName = call.lead
      ? `${call.lead.first_name || ''} ${call.lead.last_name || ''}`.trim()
      : undefined;
    const serviceType = call.lead?.service_type || undefined;

    const analysis = await extractCallActionItems(call.transcript, callerName, serviceType);

    // Store the action items in the ai_summary field (append or replace)
    const summaryData = {
      ...(call.ai_summary ? tryParseJSON(call.ai_summary) : {}),
      action_items: analysis.action_items,
      lead_intent: analysis.lead_intent,
      sentiment: analysis.sentiment,
      next_best_action: analysis.next_best_action,
    };

    await supabase
      .from('call_logs')
      .update({ ai_summary: JSON.stringify(summaryData) })
      .eq('id', call_id);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Call action items error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function tryParseJSON(str: string): Record<string, unknown> {
  try { return JSON.parse(str); } catch { return { original_summary: str }; }
}
