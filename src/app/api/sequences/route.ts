import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkLimit, countSequences } from '@/lib/check-plan';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { data: sequences, error } = await supabase
      .from('sequences')
      .select('*, sequence_steps(*)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Sequences fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch sequences' }, { status: 500 });
    }

    return NextResponse.json({ sequences });
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

    // Create sequence
    const { data: sequence, error: seqError } = await supabase
      .from('sequences')
      .insert({
        organization_id,
        name,
        description: description || null,
        trigger: trigger || 'manual',
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
        channel: step.channel || 'email',
        delay_hours: step.delay_hours || 0,
        subject: step.subject || null,
        body: step.body || '',
        ...step,
      }));

      const { error: stepsError } = await supabase
        .from('sequence_steps')
        .insert(stepsWithSeqId);

      if (stepsError) {
        console.error('Sequence steps create error:', stepsError);
        // Sequence created but steps failed — return partial success
      }
    }

    // Re-fetch with steps
    const { data: fullSequence } = await supabase
      .from('sequences')
      .select('*, sequence_steps(*)')
      .eq('id', sequence.id)
      .single();

    return NextResponse.json(fullSequence, { status: 201 });
  } catch (error) {
    console.error('Sequence create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
