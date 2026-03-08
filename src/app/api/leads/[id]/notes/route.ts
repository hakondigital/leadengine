import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createServiceRoleClient();

    const { data: note, error } = await supabase
      .from('lead_notes')
      .insert({
        lead_id: id,
        user_id: body.user_id || null,
        content: body.content,
        is_system: body.is_system || false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to add note' }, { status: 500 });
    }

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error('Note creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
