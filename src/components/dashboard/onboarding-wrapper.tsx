'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/hooks/use-organization';
import { OnboardingTour } from '@/components/onboarding-tour';

export function OnboardingWrapper() {
  const { organization, loading } = useOrganization();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (loading || !organization) return;

    const settings = (organization.settings as Record<string, unknown>) || {};
    const hasCompletedOnboarding = !!settings.onboarding_completed;

    // Also check localStorage as a fallback (in case settings update fails)
    let localComplete = false;
    try {
      localComplete = localStorage.getItem(`le_onboarding_${organization.id}`) === 'done';
    } catch {
      // localStorage not available
    }

    if (!hasCompletedOnboarding && !localComplete) {
      // Small delay so dashboard renders first
      const timer = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(timer);
    }
  }, [organization, loading]);

  const handleComplete = useCallback(async () => {
    setShowTour(false);

    if (!organization?.id) return;

    // Mark locally immediately
    try {
      localStorage.setItem(`le_onboarding_${organization.id}`, 'done');
    } catch {
      // localStorage not available
    }

    // Mark in org settings via API
    try {
      await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organization.id,
          settings_update: { onboarding_completed: true },
        }),
      });
    } catch {
      // Non-critical — localStorage fallback is enough
    }
  }, [organization?.id]);

  if (!showTour) return null;

  return <OnboardingTour onComplete={handleComplete} />;
}
