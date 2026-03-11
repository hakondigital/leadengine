import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

function normalizeSteps(rawSteps: Record<string, unknown>[] | null) {
  return (rawSteps || []).map((step) => ({
    ...step,
    type: (step.channel as string) || 'email',
    delay_days: Math.round(((step.delay_hours as number) || 0) / 24),
    subject: (step.subject_template as string) || null,
    body: (step.message_template as string) || '',
  }));
}

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    const { data: sequence, error } = await supabase
      .from('follow_up_sequences')
      .select('*, sequence_steps(*)')
      .eq('id', id)
      .single();

    if (error || !sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    const { count } = await supabase
      .from('sequence_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('sequence_id', id);

    const steps = normalizeSteps(sequence.sequence_steps as Record<string, unknown>[] | null);
    return NextResponse.json({ ...sequence, trigger: sequence.trigger_type, steps, sequence_steps: undefined, enrollment_count: count || 0 });
  } catch (error) {
    console.error('Sequence fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createServiceRoleClient();

    const { steps, trigger, ...sequenceData } = body;
    if (trigger) {
      sequenceData.trigger_type = TRIGGER_MAP[trigger] || 'manual';
    }

    const { data: sequence, error } = await supabase
      .from('follow_up_sequences')
      .update(sequenceData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Sequence update error:', error);
      return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 });
    }

    if (steps && Array.isArray(steps)) {
      await supabase.from('sequence_steps').delete().eq('sequence_id', id);
      const stepsWithSeqId = steps.map((step: Record<string, unknown>, index: number) => ({
        sequence_id: id,
        step_order: index + 1,
        channel: (step.type === 'wait' ? 'email' : step.type) || step.channel || 'email',
        delay_hours: step.delay_hours || (Number(step.delay_days || 0) * 24) || 24,
        subject_template: step.subject || step.subject_template || null,
        message_template: step.body || step.message_template || '',
      }));
      await supabase.from('sequence_steps').insert(stepsWithSeqId);
    }

    const { data: fullSequence } = await supabase
      .from('follow_up_sequences')
      .select('*, sequence_steps(*)')
      .eq('id', id)
      .single();

    const normalizedSteps = normalizeSteps(fullSequence?.sequence_steps as Record<string, unknown>[] | null);
    return NextResponse.json({ ...fullSequence, trigger: fullSequence?.trigger_type, steps: normalizedSteps, sequence_steps: undefined });
  } catch (error) {
    console.error('Sequence update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createServiceRoleClient();

    const { data: sequence, error } = await supabase
      .from('follow_up_sequences')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 });
    }

    return NextResponse.json({ ...sequence, trigger: sequence.trigger_type });
  } catch (error) {
    console.error('Sequence patch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    const { error } = await supabase
      .from('follow_up_sequences')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Sequence delete error:', error);
      return NextResponse.json({ error: 'Failed to delete sequence' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Sequence delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
