import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sequence_id, lead_id } = body;

    if (!sequence_id || !lead_id) {
      return NextResponse.json(
        { error: 'sequence_id and lead_id required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Verify sequence and lead belong to the same organization
    const { data: sequence } = await supabase
      .from('follow_up_sequences')
      .select('organization_id')
      .eq('id', sequence_id)
      .single();

    if (!sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    const { data: lead } = await supabase
      .from('leads')
      .select('organization_id')
      .eq('id', lead_id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (sequence.organization_id !== lead.organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('sequence_enrollments')
      .select('id')
      .eq('sequence_id', sequence_id)
      .eq('lead_id', lead_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Lead is already enrolled in this sequence' },
        { status: 409 }
      );
    }

    // Get the first step of the sequence
    const { data: firstStep } = await supabase
      .from('sequence_steps')
      .select('*')
      .eq('sequence_id', sequence_id)
      .order('step_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!firstStep) {
      return NextResponse.json(
        { error: 'Sequence has no steps' },
        { status: 400 }
      );
    }

    // Calculate next_send_at based on first step's delay
    const nextSendAt = new Date(
      Date.now() + (firstStep.delay_hours || 0) * 3600000
    ).toISOString();

    const { data: enrollment, error } = await supabase
      .from('sequence_enrollments')
      .insert({
        sequence_id,
        lead_id,
        current_step: 1,
        status: 'active',
        next_send_at: nextSendAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Enrollment error:', error);
      return NextResponse.json({ error: 'Failed to enroll lead' }, { status: 500 });
    }

    return NextResponse.json(enrollment, { status: 201 });
  } catch (error) {
    console.error('Enrollment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
