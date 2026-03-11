import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';
import { checkLimit, countSequences } from '@/lib/check-plan';

// Map UI trigger names → DB trigger_type values
const TRIGGER_MAP: Record<string, string> = {
  new_lead: 'lead_created',
  lead_created: 'lead_created',
  quote_sent: 'quote_sent',
  no_response: 'no_response',
  status_change: 'status_change',
  appointment_completed: 'status_change',
  job_completed: 'manual',
  manual: 'manual',
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { unauthorized } = await requireCallerOwnsOrg(orgId);
    if (unauthorized) return unauthorized;

    const { data: sequences, error } = await supabase
      .from('follow_up_sequences')
      .select('*, sequence_steps(*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Sequences fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 });
    }

    // Normalize for hook/page compatibility
    const normalized = (sequences || []).map((s: Record<string, unknown>) => {
      const rawSteps = (s.sequence_steps as Record<string, unknown>[] | null) || [];
      const steps = rawSteps.map((step) => ({
        ...step,
        type: (step.channel as string) || 'email',
        delay_days: Math.round(((step.delay_hours as number) || 0) / 24),
        subject: (step.subject_template as string) || null,
        body: (step.message_template as string) || '',
      }));
      return { ...s, trigger: s.trigger_type, steps, sequence_steps: undefined };
    });

    return NextResponse.json({ sequences: normalized });
  } catch (error) {
    console.error('Sequences fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id, name, description, trigger, steps } = body;

    if (!organization_id || !name) {
      return NextResponse.json(
        { error: 'organization_id and name required' },
        { status: 400 }
      );
    }

    // Check sequence limit
    const seqCount = await countSequences(organization_id);
    const limitCheck = await checkLimit(organization_id, 'sequences', seqCount);
    if (!limitCheck.allowed) {
      const msg = limitCheck.limit === 0
        ? 'Sequences are not available on your plan. Upgrade to Professional or Enterprise.'
        : `Sequence limit reached (${limitCheck.limit}). Upgrade your plan for more.`;
      return NextResponse.json({ error: msg }, { status: 403 });
    }

    const supabase = await createServiceRoleClient();

    const triggerType = TRIGGER_MAP[trigger] || 'manual';

    // Create sequence
    const { data: sequence, error: seqError } = await supabase
      .from('follow_up_sequences')
      .insert({
        organization_id,
        name,
        description: description || null,
        trigger_type: triggerType,
        is_active: true,
      })
      .select()
      .single();

    if (seqError) {
      console.error('Sequence create error:', seqError);
      return NextResponse.json({ error: 'Failed to create sequence' }, { status: 500 });
    }

    // Insert steps if provided
    if (steps && Array.isArray(steps) && steps.length > 0) {
      const stepsWithSeqId = steps.map((step: Record<string, unknown>, index: number) => ({
        sequence_id: sequence.id,
        step_order: index + 1,
        channel: (step.type === 'wait' ? 'email' : step.type) || step.channel || 'email',
        delay_hours: step.delay_hours || (Number(step.delay_days || 0) * 24) || 24,
        subject_template: step.subject || step.subject_template || null,
        message_template: step.body || step.message_template || '',
      }));

      const { error: stepsError } = await supabase
        .from('sequence_steps')
        .insert(stepsWithSeqId);

      if (stepsError) {
        console.error('Sequence steps create error:', stepsError);
      }
    }

    // Re-fetch with steps, normalize trigger_type → trigger
    const { data: fullSequence } = await supabase
      .from('follow_up_sequences')
      .select('*, sequence_steps(*)')
      .eq('id', sequence.id)
      .single();

    const rawSteps = (fullSequence?.sequence_steps as Record<string, unknown>[] | null) || [];
    const normalizedSteps = rawSteps.map((step: Record<string, unknown>) => ({
      ...step,
      type: (step.channel as string) || 'email',
      delay_days: Math.round(((step.delay_hours as number) || 0) / 24),
      subject: (step.subject_template as string) || null,
      body: (step.message_template as string) || '',
    }));
    return NextResponse.json(
      { ...fullSequence, trigger: fullSequence?.trigger_type, steps: normalizedSteps, sequence_steps: undefined },
      { status: 201 }
    );
  } catch (error) {
    console.error('Sequence create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
