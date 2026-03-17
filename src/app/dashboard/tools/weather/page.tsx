'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useWeatherCampaigns } from '@/hooks/use-weather-campaigns';
import { AddonGate } from '@/components/marketplace/addon-gate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  CloudRain,
  Plus,
  ArrowLeft,
  Thermometer,
  Wind,
  Droplets,
  Sun,
  Snowflake,
  Zap,
  X,
  Clock,
  MapPin,
} from 'lucide-react';

const triggerConfig: Record<string, { icon: typeof CloudRain; color: string; label: string; bg: string }> = {
  rain: { icon: Droplets, color: '#4070D0', label: 'Heavy Rain', bg: 'rgba(64,112,208,0.08)' },
  heatwave: { icon: Thermometer, color: '#E8636C', label: 'Heatwave', bg: 'rgba(232,99,108,0.08)' },
  storm: { icon: Zap, color: '#C48020', label: 'Storm', bg: 'rgba(196,128,32,0.08)' },
  cold_snap: { icon: Snowflake, color: '#5B8DEF', label: 'Cold Snap', bg: 'rgba(91,141,239,0.08)' },
  wind: { icon: Wind, color: '#6B7280', label: 'High Wind', bg: 'rgba(107,114,128,0.08)' },
};

export default function WeatherPage() {
  return <AddonGate addonId="weather-campaigns"><WeatherPageContent /></AddonGate>;
}

function WeatherPageContent() {
  const { organization } = useOrganization();
  const { campaigns, loading, createCampaign, toggleCampaign, deleteCampaign } = useWeatherCampaigns(organization?.id);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    targetArea: '',
    triggerType: 'storm' as keyof typeof triggerConfig,
    message: '',
  });

  const handleCreate = async () => {
    if (!newCampaign.name.trim()) return;
    setSaving(true);
    await createCampaign({
      name: newCampaign.name,
      triggerType: newCampaign.triggerType,
      targetArea: newCampaign.targetArea,
      message: newCampaign.message,
    });
    setNewCampaign({ name: '', targetArea: '', triggerType: 'storm', message: '' });
    setShowForm(false);
    setSaving(false);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <a
            href="/dashboard/marketplace"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Marketplace
          </a>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-[var(--od-accent)]" />
                <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
                  Weather Campaigns
                </h1>
              </div>
              <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
                Trigger automated campaigns based on weather events
              </p>
            </div>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-3.5 h-3.5" />
              Create Campaign
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* Create Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Create Weather Campaign</CardTitle>
                  <Button variant="ghost" size="icon-sm" onClick={() => setShowForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Campaign Name</label>
                    <Input
                      placeholder="e.g., Winter Heating Push"
                      value={newCampaign.name}
                      onChange={(e) => setNewCampaign((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Target Area</label>
                    <Input
                      placeholder="e.g., All Service Areas"
                      value={newCampaign.targetArea}
                      onChange={(e) => setNewCampaign((p) => ({ ...p, targetArea: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Weather Trigger</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(triggerConfig).map(([key, config]) => {
                        const TriggerIcon = config.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => setNewCampaign((p) => ({ ...p, triggerType: key as keyof typeof triggerConfig }))}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--od-radius-sm)] border text-xs font-medium transition-colors ${
                              newCampaign.triggerType === key
                                ? 'border-[var(--od-accent)] bg-[var(--od-accent-muted)] text-[var(--od-accent)]'
                                : 'border-[var(--od-border-subtle)] text-[var(--od-text-secondary)] hover:border-[var(--od-accent)]/30'
                            }`}
                          >
                            <TriggerIcon className="w-3 h-3" style={{ color: config.color }} />
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Campaign Message</label>
                    <Input
                      placeholder="Message to send when triggered..."
                      value={newCampaign.message}
                      onChange={(e) => setNewCampaign((p) => ({ ...p, message: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button size="sm" onClick={handleCreate} disabled={saving}>
                    <Plus className="w-3.5 h-3.5" />
                    {saving ? 'Creating...' : 'Create Campaign'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Campaigns */}
        <Card>
          <CardHeader>
            <CardTitle>Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-[var(--od-text-muted)] py-4">
                <div className="w-3 h-3 border-2 border-[var(--od-accent)] border-t-transparent rounded-full animate-spin" />
                Loading campaigns...
              </div>
            ) : campaigns.length === 0 ? (
              <EmptyState
                icon={CloudRain}
                title="No weather campaigns"
                description="Create campaigns that trigger automatically based on weather conditions."
                action={{ label: 'Create Campaign', onClick: () => setShowForm(true) }}
              />
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign, i) => {
                  const tc = triggerConfig[campaign.triggerType] || triggerConfig.storm;
                  const TriggerIcon = tc.icon;
                  return (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between p-4 rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)]"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center w-10 h-10 rounded-lg"
                          style={{ backgroundColor: tc.bg }}
                        >
                          <TriggerIcon className="w-5 h-5" style={{ color: tc.color }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--od-text-primary)]">{campaign.name}</p>
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-[4px]"
                              style={{ color: tc.color, backgroundColor: tc.bg }}
                            >
                              {tc.label}
                            </span>
                          </div>
                          {campaign.targetArea && (
                            <span className="flex items-center gap-1 text-xs text-[var(--od-text-muted)] mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {campaign.targetArea}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={campaign.active ? 'success' : 'default'} size="sm" dot>
                          {campaign.active ? 'Active' : 'Paused'}
                        </Badge>
                        <button
                          onClick={() => toggleCampaign(campaign.id, !campaign.active)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            campaign.active ? 'bg-[var(--od-accent)]' : 'bg-[var(--od-bg-tertiary)]'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              campaign.active ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            }`}
                          />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
