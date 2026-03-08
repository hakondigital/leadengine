import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, merge_into } = body;

    if (!status || !['confirmed', 'dismissed', 'merged'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status required: confirmed, dismissed, or merged' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Get the duplicate flag
    const { data: flag, error: fetchError } = await supabase
      .from('duplicate_flags')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !flag) {
      return NextResponse.json({ error: 'Duplicate flag not found' }, { status: 404 });
    }

    // Handle merge if requested
    if (status === 'merged' && merge_into) {
      const keepId = merge_into;
      const removeId = merge_into === flag.lead_a_id ? flag.lead_b_id : flag.lead_a_id;

      // Get both leads
      const [keepResult, removeResult] = await Promise.all([
        supabase.from('leads').select('*').eq('id', keepId).single(),
        supabase.from('leads').select('*').eq('id', removeId).single(),
      ]);

      if (keepResult.data && removeResult.data) {
        const keep = keepResult.data;
        const remove = removeResult.data;

        // Merge: fill in missing fields from the removed lead
        const mergedFields: Record<string, unknown> = {};
        const fieldsToMerge = ['phone', 'company', 'service_type', 'project_type', 'location',
          'budget_range', 'urgency', 'timeframe', 'message', 'source'];

        for (const field of fieldsToMerge) {
          if (!keep[field] && remove[field]) {
            mergedFields[field] = remove[field];
          }
        }

        // Update the kept lead with merged data
        if (Object.keys(mergedFields).length > 0) {
          await supabase.from('leads').update(mergedFields).eq('id', keepId);
        }

        // Move notes, status changes, etc. to kept lead
        await supabase.from('lead_notes').update({ lead_id: keepId }).eq('lead_id', removeId);
        await supabase.from('lead_status_changes').update({ lead_id: keepId }).eq('lead_id', removeId);

        // Mark removed lead as merged
        await supabase.from('leads').update({
          status: 'lost',
          notes: `Merged into lead ${keepId}`,
        }).eq('id', removeId);

        // Add system note
        await supabase.from('lead_notes').insert({
          lead_id: keepId,
          content: `Merged with duplicate lead (${remove.first_name} ${remove.last_name}, ${remove.email})`,
          is_system: true,
        });
      }
    }

    // Update flag status
    const { data: updated, error: updateError } = await supabase
      .from('duplicate_flags')
      .update({
        status,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Duplicate flag update error:', updateError);
      return NextResponse.json({ error: 'Failed to update duplicate flag' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Duplicate flag update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
