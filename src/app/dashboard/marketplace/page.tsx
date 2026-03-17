'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMarketplace } from '@/hooks/use-marketplace';
import { MARKETPLACE_CATEGORIES, type MarketplaceAddon } from '@/lib/marketplace';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Store,
  Check,
  Plus,
  Loader2,
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Search,
} from 'lucide-react';
import Link from 'next/link';

export default function MarketplacePage() {
  const { addons, isEnabled, toggleAddon, saving, loading } = useMarketplace();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedAddon, setExpandedAddon] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const filtered = addons.filter((addon) => {
    const matchesCategory = activeCategory === 'all' || addon.category === activeCategory;
    const matchesSearch =
      !searchQuery ||
      addon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      addon.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const enabledCount = addons.filter((a) => isEnabled(a.id)).length;

  const handleToggle = async (addonId: string) => {
    setTogglingId(addonId);
    await toggleAddon(addonId);
    setTogglingId(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--od-accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="p-1.5 rounded-lg text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-tertiary)] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-[var(--od-accent)]" />
                  <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
                    Marketplace
                  </h1>
                </div>
                <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
                  Add-ons to extend your CRM &middot; {enabledCount} active
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* Search + Category Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--od-text-muted)]" />
            <input
              type="text"
              placeholder="Search add-ons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)] rounded-xl text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:border-[var(--od-accent)]/50 transition-colors"
            />
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2">
            {MARKETPLACE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[var(--od-accent)] text-white shadow-sm'
                    : 'bg-[var(--od-bg-secondary)] text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Add-on Grid */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((addon, i) => (
              <AddonCard
                key={addon.id}
                addon={addon}
                enabled={isEnabled(addon.id)}
                toggling={togglingId === addon.id}
                expanded={expandedAddon === addon.id}
                onToggle={() => handleToggle(addon.id)}
                onExpand={() => setExpandedAddon(expandedAddon === addon.id ? null : addon.id)}
                index={i}
              />
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <Store className="w-10 h-10 text-[var(--od-text-muted)] mx-auto mb-3 opacity-40" />
            <p className="text-sm text-[var(--od-text-muted)]">
              No add-ons match your search
            </p>
          </div>
        )}

        {/* Coming soon teaser */}
        <div className="mt-8 p-6 rounded-2xl border border-dashed border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)]/50 text-center">
          <Sparkles className="w-6 h-6 text-[var(--od-accent)] mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-[var(--od-text-secondary)]">
            More add-ons coming soon
          </p>
          <p className="text-xs text-[var(--od-text-muted)] mt-1">
            Have a feature request? Let us know and we&apos;ll build it for you.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Add-on Card ────────────────────────────────────────────────────────────

interface AddonCardProps {
  addon: MarketplaceAddon;
  enabled: boolean;
  toggling: boolean;
  expanded: boolean;
  onToggle: () => void;
  onExpand: () => void;
  index: number;
}

function AddonCard({ addon, enabled, toggling, expanded, onToggle, onExpand, index }: AddonCardProps) {
  const Icon = addon.icon;
  const categoryLabel = MARKETPLACE_CATEGORIES.find((c) => c.id === addon.category)?.label || addon.category;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Card
        className={`overflow-hidden transition-all cursor-pointer ${
          enabled
            ? 'border-[var(--od-accent)]/30 shadow-[0_0_0_1px_rgba(79,209,229,0.1)]'
            : 'hover:border-[var(--od-border-subtle)]'
        }`}
        onClick={onExpand}
      >
        <CardContent className="p-5">
          {/* Top row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
                style={{ backgroundColor: `${addon.color}15` }}
              >
                <Icon className="w-5.5 h-5.5" style={{ color: addon.color }} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--od-text-primary)]">
                  {addon.name}
                </h3>
                <span className="text-[10px] font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
                  {categoryLabel}
                </span>
              </div>
            </div>

            {/* Toggle button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              disabled={toggling}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                enabled
                  ? 'bg-[var(--od-accent)]/15 text-[var(--od-accent)] hover:bg-[var(--od-accent)]/25'
                  : 'bg-[var(--od-bg-tertiary)] text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-tertiary)]/80'
              }`}
            >
              {toggling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : enabled ? (
                <Check className="w-3 h-3" />
              ) : (
                <Plus className="w-3 h-3" />
              )}
              {enabled ? 'Enabled' : 'Enable'}
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-[var(--od-text-tertiary)] leading-relaxed">
            {addon.description}
          </p>

          {/* Expanded detail */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 border-t border-[var(--od-border-subtle)]">
                  <p className="text-xs text-[var(--od-text-secondary)] leading-relaxed mb-4">
                    {addon.longDescription}
                  </p>
                  {enabled && (
                    <Button size="sm" asChild>
                      <Link href={addon.href}>
                        Open
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
