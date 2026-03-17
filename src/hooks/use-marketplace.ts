'use client';

import { useCallback, useEffect, useState } from 'react';
import { useOrganization } from './use-organization';
import { MARKETPLACE_ADDONS, type MarketplaceAddon } from '@/lib/marketplace';

export function useMarketplace() {
  const { organization, loading: orgLoading } = useOrganization();
  const [enabledAddons, setEnabledAddons] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Sync from organization data
  useEffect(() => {
    if (organization) {
      setEnabledAddons(organization.enabled_addons || []);
    }
  }, [organization]);

  const toggleAddon = useCallback(async (addonId: string) => {
    if (!organization?.id) return;

    const isCurrentlyEnabled = enabledAddons.includes(addonId);
    const updated = isCurrentlyEnabled
      ? enabledAddons.filter((id) => id !== addonId)
      : [...enabledAddons, addonId];

    // Optimistic update
    setEnabledAddons(updated);
    setSaving(true);

    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled_addons: updated }),
      });

      if (!res.ok) {
        // Revert on failure
        setEnabledAddons(enabledAddons);
      }
    } catch {
      setEnabledAddons(enabledAddons);
    } finally {
      setSaving(false);
    }
  }, [organization?.id, enabledAddons]);

  const isEnabled = useCallback(
    (addonId: string) => enabledAddons.includes(addonId),
    [enabledAddons]
  );

  return {
    addons: MARKETPLACE_ADDONS,
    enabledAddons,
    toggleAddon,
    isEnabled,
    saving,
    loading: orgLoading,
  };
}

// Lightweight hook for sidebar — just checks if an addon is enabled
export function useEnabledAddons(): string[] {
  const { organization } = useOrganization();
  return organization?.enabled_addons || [];
}
