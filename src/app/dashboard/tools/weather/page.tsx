'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
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
  Play,
  Pause,
} from 'lucide-react';

interface Campaign {
  id: string;
  name: string;
  triggerType: 'rain' | 'heatwave' | 'storm' | 'cold_snap' | 'wind';
  targetArea: string;
  message: string;
  active: boolean;
  totalTriggers: number;
}

interface TriggerLog {
  id: string;
  campaignName: string;
  triggerType: string;
  area: string;
  timestamp: string;
  leadsCaptured: number;
}

const triggerConfig: Record<string, { icon: typeof CloudRain; color: string; label: string; bg: string }> = {
  rain: { icon: Droplets, color: '#4070D0', label: 'Heavy Rain', bg: 'rgba(64,112,208,0.08)' },
  heatwave: { icon: Thermometer, color: '#E8636C', label: 'Heatwave', bg: 'rgba(232,99,108,0.08)' },
  storm: { icon: Zap, color: '#C48020', label: 'Storm', bg: 'rgba(196,128,32,0.08)' },
  cold_snap: { icon: Snowflake, color: '#5B8DEF', label: 'Cold Snap', bg: 'rgba(91,141,239,0.08)' },
  wind: { icon: Wind, color: '#6B7280', label: 'High Wind', bg: 'rgba(107,114,128,0.08)' },
};

const mockCampaigns: Campaign[] = [
  { id: '1', name: 'Storm Damage Response', triggerType: 'storm', targetArea: 'North Shore, NSW', message: 'Storm damage? We offer emergency repairs. Call now for priority service.', active: true, totalTriggers: 8 },
  { id: '2', name: 'Summer AC Push', triggerType: 'heatwave', targetArea: 'All Service Areas', message: 'Heatwave incoming! Book an AC service today and stay cool.', active: true, totalTriggers: 3 },
  { id: '3', name: 'Gutter Clean After Rain', triggerType: 'rain', targetArea: 'Northern Beaches, NSW', message: 'Heavy rain expected. Protect your home with a gutter clean. Book online.', active: false, totalTriggers: 12 },
];

const mockTriggerLog: TriggerLog[] = [
  { id: '1', campaignName: 'Storm Damage Response', triggerType: 'storm', area: 'North Shore', timestamp: '2026-03-05 14:30', leadsCaptured: 4 },
  { id: '2', campaignName: 'Summer AC Push', triggerType: 'heatwave', area: 'All Areas', timestamp: '2026-03-02 09:00', leadsCaptured: 7 },
  { id: '3', campaignName: 'Gutter Clean After Rain', triggerType: 'rain', area: 'Northern Beaches', timestamp: '2026-02-28 16:45', leadsCaptured: 2 },
  { id: '4', campaignName: 'Storm Damage Response', triggerType: 'storm', area: 'North Shore', timestamp: '2026-02-20 11:15', leadsCaptured: 3 },
];

export default function WeatherPage() {
  const { organization } = useOrganization();
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [showForm, setShowForm] = useState(false);

  const toggleCampaign = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => (c.id === id ? { ...c, active: !c.active } : c))
    );
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <a
            href="/dashboard/tools"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--le-text-muted)] hover:text-[var(--le-text-secondary)] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Tools
          </a>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-[var(--le-accent)]" />
                <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
                  Weather Campaigns
                </h1>
              </div>
              <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
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
                    <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1.5 block">Campaign Name</label>
                    <Input placeholder="e.g., Winter Heating Push" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1.5 block">Target Area</label>
                    <Input placeholder="e.g., All Service Areas" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1.5 block">Weather Trigger</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(triggerConfig).map(([key, config]) => {
                        const TriggerIcon = config.icon;
                        return (
                          <button
                            key={key}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--le-radius-sm)] border border-[var(--le-border-subtle)] hover:border-[var(--le-accent)]/30 text-xs font-medium text-[var(--le-text-secondary)] transition-colors"
                          >
                            <TriggerIcon className="w-3 h-3" style={{ color: config.color }} />
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1.5 block">Campaign Message</label>
                    <Input placeholder="Message to send when triggered..." />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button size="sm">
                    <Plus className="w-3.5 h-3.5" />
                    Create Campaign
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
            {campaigns.length === 0 ? (
              <EmptyState
                icon={CloudRain}
                title="No weather campaigns"
                description="Create campaigns that trigger automatically based on weather conditions."
                action={{ label: 'Create Campaign', onClick: () => setShowForm(true) }}
              />
            ) : (
              <div className="space-y-3">
                {campaigns.map((campaign, i) => {
                  const tc = triggerConfig[campaign.triggerType];
                  const TriggerIcon = tc.icon;
                  return (
                    <motion.div
                      key={campaign.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between p-4 rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)]"
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
                            <p className="text-sm font-semibold text-[var(--le-text-primary)]">{campaign.name}</p>
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-[4px]"
                              style={{ color: tc.color, backgroundColor: tc.bg }}
                            >
                              {tc.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="flex items-center gap-1 text-xs text-[var(--le-text-muted)]">
                              <MapPin className="w-3 h-3" />
                              {campaign.targetArea}
                            </span>
                            <span className="text-xs text-[var(--le-text-muted)]">{campaign.totalTriggers} triggers</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={campaign.active ? 'success' : 'default'} size="sm" dot>
                          {campaign.active ? 'Active' : 'Paused'}
                        </Badge>
                        <button
                          onClick={() => toggleCampaign(campaign.id)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            campaign.active ? 'bg-[var(--le-accent)]' : 'bg-[var(--le-bg-tertiary)]'
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

        {/* Trigger Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--le-accent)]" />
              <CardTitle>Recent Trigger Log</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockTriggerLog.map((log, i) => {
                const tc = triggerConfig[log.triggerType];
                const LogIcon = tc.icon;
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between py-3 border-b border-[var(--le-border-subtle)] last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <LogIcon className="w-4 h-4" style={{ color: tc.color }} />
                      <div>
                        <p className="text-sm font-medium text-[var(--le-text-primary)]">{log.campaignName}</p>
                        <p className="text-xs text-[var(--le-text-muted)]">{log.area}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium text-[var(--le-accent)]">{log.leadsCaptured} leads</p>
                      <p className="text-[10px] text-[var(--le-text-muted)]">{log.timestamp}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
