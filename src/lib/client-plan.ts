// Client-side plan check that also handles super admin override.
// Server-side enforcement remains in check-plan.ts — this is for UI gating only.

import { getPlanLimits, PLAN_LIMITS, type PlanLimits } from './plan-limits';

const SUPER_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function getEffectivePlanLimits(
  plan: string | null | undefined,
  userEmail?: string | null
): PlanLimits {
  // Super admin gets enterprise
  if (userEmail && SUPER_ADMIN_EMAILS.includes(userEmail.toLowerCase())) {
    return PLAN_LIMITS.enterprise;
  }
  return getPlanLimits(plan);
}
