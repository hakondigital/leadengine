import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Verifies the authenticated caller belongs to the given organization.
 * Returns { unauthorized: NextResponse } if the check fails, or { unauthorized: null } if OK.
 *
 * Usage in a GET handler:
 *   const { unauthorized } = await requireCallerOwnsOrg(orgId);
 *   if (unauthorized) return unauthorized;
 */
export async function requireCallerOwnsOrg(
  requestedOrgId: string
): Promise<{ unauthorized: NextResponse | null }> {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user: authUser } } = await authClient.auth.getUser();

    if (!authUser) {
      return { unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    const supabase = await createServiceRoleClient();
    const { data: profile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_id', authUser.id)
      .maybeSingle();

    if (!profile) {
      return { unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }

    if (profile.organization_id !== requestedOrgId) {
      return { unauthorized: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return { unauthorized: null };
  } catch {
    return { unauthorized: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}
