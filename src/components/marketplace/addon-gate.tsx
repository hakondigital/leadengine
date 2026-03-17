'use client';

import { useMarketplace } from '@/hooks/use-marketplace';
import { MARKETPLACE_ADDONS } from '@/lib/marketplace';
import { Button } from '@/components/ui/button';
import { Store, Plus, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

interface AddonGateProps {
  addonId: string;
  children: React.ReactNode;
}

/**
 * Wraps a marketplace tool page. If the add-on is not enabled,
 * shows a prompt to enable it instead of the page content.
 */
export function AddonGate({ addonId, children }: AddonGateProps) {
  const { isEnabled, toggleAddon, loading } = useMarketplace();
  const [enabling, setEnabling] = useState(false);

  const addon = MARKETPLACE_ADDONS.find((a) => a.id === addonId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--od-accent)]" />
      </div>
    );
  }

  // Add-on is enabled — render the page
  if (isEnabled(addonId)) {
    return <>{children}</>;
  }

  // Add-on is not enabled — show activation prompt
  const Icon = addon?.icon || Store;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div
          className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${addon?.color || '#4FD1E5'}15` }}
        >
          <Icon className="w-8 h-8" style={{ color: addon?.color || '#4FD1E5' }} />
        </div>

        <div>
          <h2 className="text-lg font-bold text-[var(--od-text-primary)] mb-2">
            {addon?.name || 'Add-on'} is not enabled
          </h2>
          <p className="text-sm text-[var(--od-text-tertiary)] leading-relaxed">
            {addon?.longDescription || 'Enable this add-on from the Marketplace to start using it.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/dashboard/marketplace">
              <ArrowLeft className="w-3.5 h-3.5" />
              Marketplace
            </Link>
          </Button>
          <Button
            size="sm"
            disabled={enabling}
            onClick={async () => {
              setEnabling(true);
              await toggleAddon(addonId);
              setEnabling(false);
            }}
          >
            {enabling ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Enable {addon?.name || 'Add-on'}
          </Button>
        </div>
      </div>
    </div>
  );
}
