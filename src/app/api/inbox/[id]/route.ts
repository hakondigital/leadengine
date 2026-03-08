import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createServiceRoleClient();

    // Only allow updating is_read and is_archived
    const updateData: Record<string, unknown> = {};
    if (body.is_read !== undefined) updateData.is_read = body.is_read;
    if (body.is_archived !== undefined) updateData.is_archived = body.is_archived;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update (is_read, is_archived)' },
        { status: 400 }
      );
    }

    const { data: message, error } = await supabase
      .from('inbox_messages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Inbox update error:', error);
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Inbox update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
