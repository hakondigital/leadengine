import { createServiceRoleClient } from '@/lib/supabase/server';
import { getPlanLimits, PLAN_LIMITS, type PlanLimits } from '@/lib/plan-limits';
import { isSuperAdminEmail } from '@/lib/super-admin';

// Unlimited limits for super admins — everything unlocked
const SUPER_ADMIN_LIMITS: PlanLimits = {
  ...PLAN_LIMITS.enterprise,
  leads_per_month: -1,
  forms: -1,
  users: -1,
  sequences: -1,
  tracking_numbers: -1,
  sms_per_month: -1,
  ai_actions_per_month: -1,
};

interface OrgPlan {
  organizationId: string;
  plan: string | null;
  limits: PlanLimits;
  isSuperAdmin: boolean;
}

// Get the plan and limits for an organization
export async function getOrgPlan(organizationId: string): Promise<OrgPlan> {
  const supabase = await createServiceRoleClient();

  const { data: org } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  const settings = (org?.settings as Record<string, unknown>) || {};
  const plan = (settings.plan as string) || null;
  const billingStatus = settings.billing_status as string | undefined;

  // Check if any user in this org is a super admin
  const { data: orgUsers } = await supabase
    .from('users')
    .select('email')
    .eq('organization_id', organizationId);

  const hasSuperAdmin = orgUsers?.some((u) => isSuperAdminEmail(u.email)) || false;

  if (hasSuperAdmin) {
    return { organizationId, plan: 'enterprise', limits: SUPER_ADMIN_LIMITS, isSuperAdmin: true };
  }

  // If subscription is cancelled/past_due, downgrade to free limits
  if (billingStatus === 'cancelled' || billingStatus === 'past_due') {
    return { organizationId, plan: null, limits: getPlanLimits(null), isSuperAdmin: false };
  }

  return { organizationId, plan, limits: getPlanLimits(plan), isSuperAdmin: false };
}

// Check if a feature is available on the org's plan
export async function checkFeature(
  organizationId: string,
  feature: keyof PlanLimits
): Promise<{ allowed: boolean; plan: string | null; limitValue: number | boolean }> {
  const { plan, limits } = await getOrgPlan(organizationId);
  const value = limits[feature];
  const allowed = typeof value === 'boolean' ? value : value !== 0;
  return { allowed, plan, limitValue: value };
}

// Check if a numeric limit has been reached (e.g. leads this month)
export async function checkLimit(
  organizationId: string,
  feature: keyof PlanLimits,
  currentCount: number
): Promise<{ allowed: boolean; plan: string | null; limit: number; current: number }> {
  const { plan, limits } = await getOrgPlan(organizationId);
  const limit = limits[feature] as number;

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, plan, limit, current: currentCount };
  }

  return { allowed: currentCount < limit, plan, limit, current: currentCount };
}

// Count leads created this month for an org
export async function countLeadsThisMonth(organizationId: string): Promise<number> {
  const supabase = await createServiceRoleClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', startOfMonth.toISOString());

  return count || 0;
}

// Count SMS sent this month for an org
export async function countSmsThisMonth(organizationId: string): Promise<number> {
  const supabase = await createServiceRoleClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('sms_logs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .gte('created_at', startOfMonth.toISOString());

  return count || 0;
}

// Count forms for an org
export async function countForms(organizationId: string): Promise<number> {
  const supabase = await createServiceRoleClient();

  const { count } = await supabase
    .from('forms')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  return count || 0;
}

// Count sequences for an org
export async function countSequences(organizationId: string): Promise<number> {
  const supabase = await createServiceRoleClient();

  const { count } = await supabase
    .from('sequences')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  return count || 0;
}

// Count tracking numbers for an org
export async function countTrackingNumbers(organizationId: string): Promise<number> {
  const supabase = await createServiceRoleClient();

  const { count } = await supabase
    .from('tracking_numbers')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('is_active', true);

  return count || 0;
}
