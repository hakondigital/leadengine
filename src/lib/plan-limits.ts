// Centralized plan limits — enforced server-side on API routes.
// -1 means unlimited.

export type PlanId = 'starter' | 'professional' | 'enterprise';

export interface PlanLimits {
  leads_per_month: number;
  forms: number;
  users: number;
  sequences: number;
  tracking_numbers: number;
  sms_per_month: number;
  ai_actions_per_month: number;
  // Feature flags
  sms_enabled: boolean;
  call_tracking: boolean;
  call_recording: boolean;
  ai_qualification: boolean;
  ai_follow_ups: boolean;
  ai_chat: boolean;
  webhooks: boolean;
  lead_export: boolean;
  weather_campaigns: boolean;
  white_label: boolean;
  analytics_advanced: boolean;
  review_requests: boolean;
  appointments: boolean;
  quotes: boolean;
  portfolio: boolean;
  lead_import: boolean;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  starter: {
    leads_per_month: 100,
    forms: 1,
    users: 1,
    sequences: 0,
    tracking_numbers: 0,
    sms_per_month: 0,
    ai_actions_per_month: 50,
    sms_enabled: false,
    call_tracking: false,
    call_recording: false,
    ai_qualification: true,
    ai_follow_ups: false,
    ai_chat: false,
    webhooks: false,
    lead_export: false,
    weather_campaigns: false,
    white_label: false,
    analytics_advanced: false,
    review_requests: false,
    appointments: false,
    quotes: false,
    portfolio: false,
    lead_import: false,
  },
  professional: {
    leads_per_month: 500,
    forms: -1,
    users: 5,
    sequences: 5,
    tracking_numbers: 3,
    sms_per_month: 200,
    ai_actions_per_month: 500,
    sms_enabled: true,
    call_tracking: true,
    call_recording: false,
    ai_qualification: true,
    ai_follow_ups: true,
    ai_chat: true,
    webhooks: true,
    lead_export: true,
    weather_campaigns: true,
    white_label: false,
    analytics_advanced: true,
    review_requests: true,
    appointments: true,
    quotes: true,
    portfolio: true,
    lead_import: true,
  },
  enterprise: {
    leads_per_month: -1,
    forms: -1,
    users: -1,
    sequences: -1,
    tracking_numbers: -1,
    sms_per_month: -1,
    ai_actions_per_month: -1,
    sms_enabled: true,
    call_tracking: true,
    call_recording: true,
    ai_qualification: true,
    ai_follow_ups: true,
    ai_chat: true,
    webhooks: true,
    lead_export: true,
    weather_campaigns: true,
    white_label: true,
    analytics_advanced: true,
    review_requests: true,
    appointments: true,
    quotes: true,
    portfolio: true,
    lead_import: true,
  },
};

// Free/no-plan fallback — very limited, encourages signup
export const FREE_LIMITS: PlanLimits = {
  leads_per_month: 10,
  forms: 1,
  users: 1,
  sequences: 0,
  tracking_numbers: 0,
  sms_per_month: 0,
  ai_actions_per_month: 5,
  sms_enabled: false,
  call_tracking: false,
  call_recording: false,
  ai_qualification: true,
  ai_follow_ups: false,
  ai_chat: false,
  webhooks: false,
  lead_export: false,
  weather_campaigns: false,
  white_label: false,
  analytics_advanced: false,
  review_requests: false,
  appointments: false,
  quotes: false,
  portfolio: false,
  lead_import: false,
};

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  if (plan && plan in PLAN_LIMITS) {
    return PLAN_LIMITS[plan as PlanId];
  }
  return FREE_LIMITS;
}

export function getPlanName(plan: string | null | undefined): string {
  if (plan === 'starter') return 'Starter';
  if (plan === 'professional') return 'Professional';
  if (plan === 'enterprise') return 'Enterprise';
  return 'Free';
}
