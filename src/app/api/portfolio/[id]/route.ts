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

    const { data: project, error } = await supabase
      .from('portfolio_projects')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Portfolio update error:', error);
      return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Portfolio update error:', error);
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
      .from('portfolio_projects')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Portfolio delete error:', error);
      return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Portfolio delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
