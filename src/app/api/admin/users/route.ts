import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkSuperAdmin } from '@/lib/super-admin';

export async function GET(request: NextRequest) {
  const { isSuperAdmin } = await checkSuperAdmin(request);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const orgId = request.nextUrl.searchParams.get('org_id');
  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();
  const { data: users } = await supabase
    .from('users')
    .select('id, full_name, email, role, created_at')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: true });

  return NextResponse.json({ users: users || [] });
}
