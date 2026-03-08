import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    const { data: sequence, error } = await supabase
      .from('sequences')
      .select('*, sequence_steps(*)')
      .eq('id', id)
      .single();

    if (error || !sequence) {
      return NextResponse.json({ error: 'Sequence not found' }, { status: 404 });
    }

    // Also fetch enrollment count
    const { count } = await supabase
      .from('sequence_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('sequence_id', id);

    return NextResponse.json({ ...sequence, enrollment_count: count || 0 });
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

    const { steps, ...sequenceData } = body;

    // Update sequence
    const { data: sequence, error } = await supabase
      .from('sequences')
      .update(sequenceData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Sequence update error:', error);
      return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 });
    }

    // If steps provided, replace them
    if (steps && Array.isArray(steps)) {
      // Delete existing steps
      await supabase.from('sequence_steps').delete().eq('sequence_id', id);

      // Insert new steps
      const stepsWithSeqId = steps.map((step: Record<string, unknown>, index: number) => ({
        sequence_id: id,
        step_order: index + 1,
        channel: step.channel || 'email',
        delay_hours: step.delay_hours || 0,
        subject: step.subject || null,
        body: step.body || '',
        ...step,
      }));

      await supabase.from('sequence_steps').insert(stepsWithSeqId);
    }

    // Re-fetch with steps
    const { data: fullSequence } = await supabase
      .from('sequences')
      .select('*, sequence_steps(*)')
      .eq('id', id)
      .single();

    return NextResponse.json(fullSequence);
  } catch (error) {
    console.error('Sequence update error:', error);
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

    // Delete steps first (cascade may handle this, but be explicit)
    await supabase.from('sequence_steps').delete().eq('sequence_id', id);
    await supabase.from('sequence_enrollments').delete().eq('sequence_id', id);

    const { error } = await supabase
      .from('sequences')
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
