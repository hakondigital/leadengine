import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkSuperAdmin, getAllOrganizations } from '@/lib/super-admin';

// GET: List all organizations with stats (super admin only)
export async function GET(request: NextRequest) {
  const { isSuperAdmin } = await checkSuperAdmin(request);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const organizations = await getAllOrganizations();
  return NextResponse.json({ organizations });
}

// PATCH: Update an organization's plan or settings (super admin only)
export async function PATCH(request: NextRequest) {
  const { isSuperAdmin } = await checkSuperAdmin(request);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { organization_id, action, value } = await request.json();

  if (!organization_id || !action) {
    return NextResponse.json({ error: 'organization_id and action required' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  // Get current org settings
  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organization_id)
    .single();

  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  const settings = (org.settings as Record<string, unknown>) || {};

  switch (action) {
    case 'set_plan': {
      const validPlans = ['starter', 'professional', 'enterprise', null];
      if (!validPlans.includes(value)) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
      }
      await supabase
        .from('organizations')
        .update({
          settings: {
            ...settings,
            plan: value,
            billing_status: value ? 'active' : null,
          },
        })
        .eq('id', organization_id);
      break;
    }

    case 'set_billing_status': {
      await supabase
        .from('organizations')
        .update({
          settings: { ...settings, billing_status: value },
        })
        .eq('id', organization_id);
      break;
    }

    case 'delete_org': {
      // Delete org — CASCADE constraints on child tables handle cleanup
      await supabase.from('organizations').delete().eq('id', organization_id);
      break;
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  return NextResponse.json({ success: true, action, organization_id });
}
