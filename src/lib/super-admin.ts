import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS || '')
  .replace(/['"]/g, '') // strip any accidental quotes from env var
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function isSuperAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  return SUPER_ADMIN_EMAILS.includes(normalizedEmail);
}

// Check if the currently authenticated user is a super admin
// Tries cookie-based auth first, then falls back to Authorization header token
export async function checkSuperAdmin(request?: Request): Promise<{
  isSuperAdmin: boolean;
  userId?: string;
  email?: string;
}> {
  try {
    // Method 1: Cookie-based auth
    const authClient = await createServerSupabaseClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (user?.email) {
      return {
        isSuperAdmin: isSuperAdminEmail(user.email),
        userId: user.id,
        email: user.email,
      };
    }

    // Method 2: Authorization header token (fallback for when cookies don't work)
    if (request) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');
      if (token) {
        const supabase = await createServiceRoleClient();
        const { data: { user: tokenUser } } = await supabase.auth.getUser(token);
        if (tokenUser?.email) {
          return {
            isSuperAdmin: isSuperAdminEmail(tokenUser.email),
            userId: tokenUser.id,
            email: tokenUser.email,
          };
        }
      }
    }

    return { isSuperAdmin: false };
  } catch {
    return { isSuperAdmin: false };
  }
}

// Get all organizations with usage stats (for admin panel)
export async function getAllOrganizations() {
  const supabase = await createServiceRoleClient();

  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
    .order('created_at', { ascending: false });

  if (!orgs) return [];

  // Get counts for each org
  const enriched = await Promise.all(
    orgs.map(async (org) => {
      const [leads, users, forms] = await Promise.all([
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id),
        supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id),
        supabase
          .from('forms')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id),
      ]);

      const settings = (org.settings as Record<string, unknown>) || {};

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: (settings.plan as string) || null,
        billing_status: (settings.billing_status as string) || null,
        created_at: org.created_at,
        notification_email: org.notification_email || null,
        phone: org.phone || null,
        lead_count: leads.count || 0,
        user_count: users.count || 0,
        form_count: forms.count || 0,
      };
    })
  );

  return enriched;
}
