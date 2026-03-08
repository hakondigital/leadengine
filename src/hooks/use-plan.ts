'use client';

import { useMemo, useState, useEffect } from 'react';
import { useOrganization } from './use-organization';
import { createClient } from '@/lib/supabase/client';
import { getPlanLimits, getPlanName, PLAN_LIMITS, type PlanId, type PlanLimits } from '@/lib/plan-limits';

export function usePlan() {
  const { organization, loading } = useOrganization();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  // Check super admin status — send access token explicitly since cookies may not work
  useEffect(() => {
    let cancelled = false;
    async function checkAdmin() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token || cancelled) {
          if (!cancelled) setAdminLoading(false);
          return;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data?.isSuperAdmin) setIsSuperAdmin(true);
        }
      } catch {
        // Network error or timeout — leave as non-admin
      } finally {
        if (!cancelled) setAdminLoading(false);
      }
    }
    checkAdmin();
    return () => { cancelled = true; };
  }, []);

  const plan = useMemo(() => {
    if (isSuperAdmin) return 'enterprise' as PlanId;
    const settings = (organization?.settings as Record<string, unknown>) || {};
    return (settings.plan as PlanId | null) || null;
  }, [organization, isSuperAdmin]);

  const limits: PlanLimits = useMemo(() => {
    if (isSuperAdmin) return { ...PLAN_LIMITS.enterprise };
    return getPlanLimits(plan);
  }, [plan, isSuperAdmin]);

  const planName = useMemo(() => {
    if (isSuperAdmin) return 'Admin';
    return getPlanName(plan);
  }, [plan, isSuperAdmin]);

  const billingStatus = useMemo(() => {
    const settings = (organization?.settings as Record<string, unknown>) || {};
    return (settings.billing_status as string) || null;
  }, [organization]);

  const isActive = isSuperAdmin || billingStatus === 'active' || billingStatus === null;

  return {
    plan,
    planName,
    limits,
    billingStatus,
    isActive,
    isSuperAdmin,
    adminLoading,
    loading: loading || adminLoading,
    // Quick feature checks — super admin bypasses all
    canUseSms: isSuperAdmin || limits.sms_enabled,
    canUseCallTracking: isSuperAdmin || limits.call_tracking,
    canUseCallRecording: isSuperAdmin || limits.call_recording,
    canUseSequences: isSuperAdmin || limits.sequences !== 0,
    canUseWebhooks: isSuperAdmin || limits.webhooks,
    canExportLeads: isSuperAdmin || limits.lead_export,
    canImportLeads: isSuperAdmin || limits.lead_import,
    canUseWeatherCampaigns: isSuperAdmin || limits.weather_campaigns,
    canUseWhiteLabel: isSuperAdmin || limits.white_label,
    canUseAdvancedAnalytics: isSuperAdmin || limits.analytics_advanced,
    canUseAiFollowUps: isSuperAdmin || limits.ai_follow_ups,
    canUseAiChat: isSuperAdmin || limits.ai_chat,
    canUseReviewRequests: isSuperAdmin || limits.review_requests,
    canUseAppointments: isSuperAdmin || limits.appointments,
    canUseQuotes: isSuperAdmin || limits.quotes,
    canUsePortfolio: isSuperAdmin || limits.portfolio,
  };
}
