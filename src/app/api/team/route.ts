import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// ─── GET: List team members for caller's org ────────────────────────────────

export async function GET() {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user: authUser } } = await authClient.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    const { data: caller } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_id', authUser.id)
      .single();

    if (!caller) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: members, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, job_title, phone, specializations, is_available, is_active, max_leads_per_day, created_at')
      .eq('organization_id', caller.organization_id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ members: members || [] });
  } catch (error) {
    console.error('Team list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST: Invite a new team member ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user: authUser } } = await authClient.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    const { data: caller } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('auth_id', authUser.id)
      .single();

    if (!caller) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (caller.role !== 'owner' && caller.role !== 'admin') {
      return NextResponse.json({ error: 'Only owners and admins can invite members' }, { status: 403 });
    }

    const body = await request.json();
    const { email, full_name, role, job_title } = body;

    if (!email || !full_name) {
      return NextResponse.json({ error: 'email and full_name are required' }, { status: 400 });
    }

    const memberRole = role === 'admin' ? 'admin' : 'member';

    // Check if user already exists in this org
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('organization_id', caller.organization_id)
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'This email is already a team member' }, { status: 409 });
    }

    // Create the user record (no auth_id yet — they'll link when they sign up/accept)
    const { data: newMember, error: insertError } = await supabase
      .from('users')
      .insert({
        auth_id: `pending_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        organization_id: caller.organization_id,
        email: email.toLowerCase().trim(),
        full_name: full_name.trim(),
        role: memberRole,
        job_title: job_title || null,
        is_active: true,
        is_available: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert member error:', insertError);
      return NextResponse.json({ error: 'Failed to add team member' }, { status: 500 });
    }

    // Send invite email
    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', caller.organization_id)
        .single();

      const { sendTeamInviteEmail } = await import('@/lib/email');
      await sendTeamInviteEmail({
        to: email,
        orgName: org?.name || 'Your team',
        inviterName: authUser.user_metadata?.full_name || 'Your team admin',
        role: memberRole,
      });
    } catch (emailErr) {
      console.warn('Invite email failed (member still created):', emailErr);
    }

    return NextResponse.json({ member: newMember }, { status: 201 });
  } catch (error) {
    console.error('Team invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── PATCH: Update a team member ────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user: authUser } } = await authClient.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    const { data: caller } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('auth_id', authUser.id)
      .single();

    if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { member_id, ...updates } = body;

    if (!member_id) {
      return NextResponse.json({ error: 'member_id required' }, { status: 400 });
    }

    // Verify member belongs to same org
    const { data: member } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', member_id)
      .single();

    if (!member || member.organization_id !== caller.organization_id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Can't demote the owner
    if (member.role === 'owner' && updates.role && updates.role !== 'owner') {
      return NextResponse.json({ error: 'Cannot change the owner role' }, { status: 403 });
    }

    const allowedFields = ['full_name', 'role', 'job_title', 'phone', 'specializations', 'is_available', 'is_active', 'max_leads_per_day'];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        safeUpdates[key] = updates[key];
      }
    }

    const { data: updated, error } = await supabase
      .from('users')
      .update(safeUpdates)
      .eq('id', member_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ member: updated });
  } catch (error) {
    console.error('Team update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE: Remove a team member ───────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user: authUser } } = await authClient.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    const { data: caller } = await supabase
      .from('users')
      .select('organization_id, role, id')
      .eq('auth_id', authUser.id)
      .single();

    if (!caller || (caller.role !== 'owner' && caller.role !== 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const memberId = request.nextUrl.searchParams.get('member_id');
    if (!memberId) {
      return NextResponse.json({ error: 'member_id required' }, { status: 400 });
    }

    // Can't remove yourself
    if (memberId === caller.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 403 });
    }

    // Verify member belongs to same org and isn't owner
    const { data: member } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', memberId)
      .single();

    if (!member || member.organization_id !== caller.organization_id) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the organization owner' }, { status: 403 });
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', memberId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Team delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
