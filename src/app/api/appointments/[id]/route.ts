import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !appointment) {
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Appointment fetch error:', error);
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

    const { data: appointment, error } = await supabase
      .from('appointments')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Appointment update error:', error);
      return NextResponse.json({ error: 'Failed to update appointment' }, { status: 500 });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('Appointment update error:', error);
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
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Appointment delete error:', error);
      return NextResponse.json({ error: 'Failed to delete appointment' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Appointment delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
