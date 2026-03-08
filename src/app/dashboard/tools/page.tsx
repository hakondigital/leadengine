'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Wrench,
  Map,
  Calculator,
  CloudRain,
  Copy,
  Upload,
  Users,
  MapPin,
  Megaphone,
  Settings,
  ChevronRight,
} from 'lucide-react';

interface Tool {
  id: string;
  title: string;
  description: string;
  icon: typeof Map;
  color: string;
  enabled: boolean;
  href?: string;
  configurable: boolean;
}

const tools: Tool[] = [
  {
    id: 'service-areas',
    title: 'Service Area Map',
    description: 'Define your service areas by postcode or suburb to auto-filter leads.',
    icon: Map,
    color: '#4070D0',
    enabled: true,
    href: '/dashboard/tools/service-areas',
    configurable: true,
  },
  {
    id: 'estimator',
    title: 'Ballpark Estimator',
    description: 'Let leads get instant rough estimates on your website before booking.',
    icon: Calculator,
    color: '#1F9B5A',
    enabled: true,
    href: '/dashboard/tools/estimator',
    configurable: true,
  },
  {
    id: 'weather',
    title: 'Weather Campaigns',
    description: 'Trigger automated campaigns based on weather events in your area.',
    icon: CloudRain,
    color: '#5B8DEF',
    enabled: false,
    href: '/dashboard/tools/weather',
    configurable: true,
  },
  {
    id: 'duplicate',
    title: 'Duplicate Detection',
    description: 'Automatically detect and merge duplicate lead entries.',
    icon: Copy,
    color: '#8B7CF6',
    enabled: true,
    configurable: false,
  },
  {
    id: 'import',
    title: 'CSV Import',
    description: 'Import leads from spreadsheets with smart column mapping.',
    icon: Upload,
    color: '#C48020',
    enabled: true,
    href: '/dashboard/tools/import',
    configurable: true,
  },
  {
    id: 'routing',
    title: 'Team Routing',
    description: 'Auto-assign leads to team members based on rules and availability.',
    icon: Users,
    color: '#E8636C',
    enabled: false,
    href: '/dashboard/tools/routing',
    configurable: true,
  },
  {
    id: 'territory',
    title: 'Territory Management',
    description: 'Assign geographic territories to team members for lead distribution.',
    icon: MapPin,
    color: '#34C77B',
    enabled: false,
    configurable: false,
  },
  {
    id: 'social-proof',
    title: 'Social Proof Widget',
    description: 'Show real-time notifications of recent leads and reviews on your site.',
    icon: Megaphone,
    color: '#F59E0B',
    enabled: true,
    configurable: false,
  },
];

export default function ToolsPage() {
  const { organization } = useOrganization();
  const [toolStates, setToolStates] = useState<Record<string, boolean>>(
    Object.fromEntries(tools.map((t) => [t.id, t.enabled]))
  );

  const toggleTool = (id: string) => {
    setToolStates((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[var(--le-accent)]" />
            <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
              Tools &amp; Automation
            </h1>
          </div>
          <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
            Configure niche tools and automations for your business
          </p>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool, i) => {
            const ToolIcon = tool.icon;
            const enabled = toolStates[tool.id];
            return (
              <motion.div
                key={tool.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card className="h-full hover:border-[var(--le-accent)]/30 transition-colors">
                  <CardContent className="p-5 flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-lg"
                        style={{ backgroundColor: `${tool.color}12` }}
                      >
                        <ToolIcon className="w-5 h-5" style={{ color: tool.color }} />
                      </div>
                      <button
                        onClick={() => toggleTool(tool.id)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          enabled ? 'bg-[var(--le-accent)]' : 'bg-[var(--le-bg-tertiary)]'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
                          }`}
                        />
                      </button>
                    </div>

                    <h3 className="text-sm font-semibold text-[var(--le-text-primary)] mb-1">
                      {tool.title}
                    </h3>
                    <p className="text-xs text-[var(--le-text-tertiary)] leading-relaxed flex-1 mb-4">
                      {tool.description}
                    </p>

                    {tool.configurable && tool.href ? (
                      <a
                        href={tool.href}
                        className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--le-accent-text)] bg-[var(--le-accent-muted)] hover:bg-[rgba(79,209,229,0.15)] px-3 py-2 rounded-[var(--le-radius-sm)] transition-colors"
                      >
                        <Settings className="w-3 h-3" />
                        Configure
                        <ChevronRight className="w-3 h-3" />
                      </a>
                    ) : (
                      <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-[var(--le-text-muted)] bg-[var(--le-bg-tertiary)] px-3 py-2 rounded-[var(--le-radius-sm)]">
                        {enabled ? 'Enabled' : 'Disabled'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
