'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

interface UpgradeBannerProps {
  feature: string;
  requiredPlan?: string;
  currentPlan?: string;
}

export function UpgradeBanner({ feature, requiredPlan = 'Professional', currentPlan }: UpgradeBannerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--le-bg-muted)] flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-[var(--le-text-muted)]" />
      </div>
      <h2 className="text-xl font-semibold text-[var(--le-text-primary)] mb-2">
        {feature} — {requiredPlan}+ Plan
      </h2>
      <p className="text-[var(--le-text-secondary)] max-w-md mb-6">
        {feature} is available on the {requiredPlan} plan and above.
        {currentPlan ? ` You're currently on the ${currentPlan} plan.` : ' Upgrade to unlock this feature.'}
      </p>
      <Link
        href="/dashboard/settings"
        className="px-6 py-2.5 rounded-lg bg-[var(--le-accent)] text-white font-medium hover:opacity-90 transition-opacity"
      >
        Upgrade Plan
      </Link>
    </div>
  );
}
