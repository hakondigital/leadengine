'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Brain,
  Calculator,
  CloudRain,
  Copy,
  FileText,
  Ghost,
  Map,
  MapPin,
  Megaphone,
  RotateCcw,
  Settings,
  Target,
  Upload,
  Users,
  Wrench,
  Zap,
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
  category: 'agent' | 'operations' | 'growth';
}

const tools: Tool[] = [
  {
    id: 'daily-game-plan',
    title: 'Agent task queue',
    description: 'Morning action plan for what should be called, rescued, quoted, or progressed first.',
    icon: Zap,
    color: '#F59E0B',
    enabled: true,
    href: '/dashboard/settings',
    configurable: true,
    category: 'agent',
  },
  {
    id: 'revenue-gap',
    title: 'Revenue pressure',
    description: 'Turn target gaps into a focused execution queue instead of passive reporting.',
    icon: Target,
    color: '#4ADE80',
    enabled: true,
    href: '/dashboard/settings',
    configurable: true,
    category: 'agent',
  },
  {
    id: 'ghost-recovery',
    title: 'Ghost recovery',
    description: 'Analyse why leads went quiet and generate recovery moves with context.',
    icon: Ghost,
    color: '#8B7CF6',
    enabled: true,
    href: '/dashboard/settings',
    configurable: true,
    category: 'agent',
  },
  {
    id: 'post-job-lifecycle',
    title: 'Lifecycle follow-up',
    description: 'Trigger review requests, referral asks, and post-job check-ins from a single flow.',
    icon: RotateCcw,
    color: '#34C77B',
    enabled: true,
    href: '/dashboard/tools/lifecycle',
    configurable: true,
    category: 'agent',
  },
  {
    id: 'meeting-briefing',
    title: 'Meeting briefing',
    description: 'Prepare talking points and customer context before calls and appointments.',
    icon: FileText,
    color: '#4FD1E5',
    enabled: true,
    href: '/dashboard/settings',
    configurable: true,
    category: 'agent',
  },
  {
    id: 'ai-strategy',
    title: 'Agent console',
    description: 'Query Odyssey data through a live agent surface built for decisions, not reports.',
    icon: Brain,
    color: '#A78BFA',
    enabled: true,
    href: '/dashboard/tools/strategy',
    configurable: true,
    category: 'agent',
  },
  {
    id: 'service-areas',
    title: 'Service area map',
    description: 'Define where work is accepted so routing and qualification stay accurate.',
    icon: Map,
    color: '#4070D0',
    enabled: true,
    href: '/dashboard/tools/service-areas',
    configurable: true,
    category: 'operations',
  },
  {
    id: 'estimator',
    title: 'Ballpark estimator',
    description: 'Capture rough pricing intent on the website before the team engages manually.',
    icon: Calculator,
    color: '#1F9B5A',
    enabled: true,
    href: '/dashboard/tools/estimator',
    configurable: true,
    category: 'operations',
  },
  {
    id: 'duplicate',
    title: 'Duplicate detection',
    description: 'Merge noisy lead records before they create pipeline confusion.',
    icon: Copy,
    color: '#8B7CF6',
    enabled: true,
    configurable: false,
    category: 'operations',
  },
  {
    id: 'import',
    title: 'CSV import',
    description: 'Bring external leads into Odyssey with guided mapping and cleaner onboarding.',
    icon: Upload,
    color: '#C48020',
    enabled: true,
    href: '/dashboard/tools/import',
    configurable: true,
    category: 'operations',
  },
  {
    id: 'routing',
    title: 'Team routing',
    description: 'Assign work by rules, territory, or availability so the queue stays controlled.',
    icon: Users,
    color: '#E8636C',
    enabled: false,
    href: '/dashboard/tools/routing',
    configurable: true,
    category: 'operations',
  },
  {
    id: 'territory',
    title: 'Territory management',
    description: 'Map coverage zones so lead ownership is predictable across the team.',
    icon: MapPin,
    color: '#34C77B',
    enabled: false,
    configurable: false,
    category: 'operations',
  },
  {
    id: 'weather',
    title: 'Weather campaigns',
    description: 'Launch automation when local conditions create service demand spikes.',
    icon: CloudRain,
    color: '#5B8DEF',
    enabled: false,
    href: '/dashboard/tools/weather',
    configurable: true,
    category: 'growth',
  },
  {
    id: 'social-proof',
    title: 'Social proof widget',
    description: 'Show live demand signals on-site to strengthen trust and conversion intent.',
    icon: Megaphone,
    color: '#F59E0B',
    enabled: true,
    configurable: false,
    category: 'growth',
  },
];

const toolSettingsMap: Record<string, string> = {
  'daily-game-plan': 'game_plan_enabled',
  'revenue-gap': 'revenue_gap_enabled',
  'ghost-recovery': 'ghost_recovery_enabled',
  'post-job-lifecycle': 'post_job_lifecycle_enabled',
  'meeting-briefing': 'meeting_briefing_enabled',
};

const groupMeta: Record<Tool['category'], { label: string; description: string }> = {
  agent: {
    label: 'Agent systems',
    description: 'The core layer that makes Odyssey feel like a live operator rather than a passive website.',
  },
  operations: {
    label: 'Operational systems',
    description: 'Infrastructure for routing, qualification, intake quality, and controlled execution.',
  },
  growth: {
    label: 'Growth systems',
    description: 'Optional programs that expand demand capture and improve conversion leverage.',
  },
};

export default function ToolsPage() {
  const { organization } = useOrganization();
  const settings = (organization?.settings as Record<string, unknown>) || {};

  const [toolStates, setToolStates] = useState<Record<string, boolean>>(
    Object.fromEntries(
      tools.map((tool) => {
        const settingsKey = toolSettingsMap[tool.id];
        if (settingsKey && settings[settingsKey] !== undefined) {
          return [tool.id, settings[settingsKey] !== false];
        }
        return [tool.id, tool.enabled];
      })
    )
  );

  const groupedTools = useMemo(() => {
    return {
      agent: tools.filter((tool) => tool.category === 'agent'),
      operations: tools.filter((tool) => tool.category === 'operations'),
      growth: tools.filter((tool) => tool.category === 'growth'),
    };
  }, []);

  const activeCount = Object.values(toolStates).filter(Boolean).length;
  const activeAgentCount = groupedTools.agent.filter((tool) => toolStates[tool.id]).length;
  const configurableCount = tools.filter((tool) => tool.configurable).length;

  const toggleTool = async (id: string) => {
    const nextValue = !toolStates[id];
    setToolStates((current) => ({ ...current, [id]: nextValue }));

    const settingsKey = toolSettingsMap[id];
    if (settingsKey && organization?.id) {
      try {
        await fetch('/api/organization', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            settings_update: { [settingsKey]: nextValue },
          }),
        });
      } catch {
        setToolStates((current) => ({ ...current, [id]: !nextValue }));
      }
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)]/80 backdrop-blur-xl">
        <div className="px-4 py-5 lg:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--od-accent-text)]">
            Operator layer
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-[var(--od-accent)]" />
                <h1 className="text-2xl font-bold tracking-tight text-[var(--od-text-primary)]">
                  Agent systems
                </h1>
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--od-text-tertiary)]">
                Configure the systems that make Odyssey behave like a 24/7 agent: clear action
                surfaces, real automations, and deliberate operating rules.
              </p>
            </div>

            <Button asChild size="sm">
              <Link href="/dashboard/tools/strategy">
                Open agent console
                <Brain className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="space-y-8 px-4 py-6 lg:px-6">
        <section className="rounded-[28px] border border-[var(--od-border-default)] bg-[linear-gradient(180deg,rgba(79,209,229,0.1),transparent_38%),var(--od-bg-secondary)] p-6 shadow-[var(--od-shadow-md)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-accent-text)]">
                Systems posture
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--od-text-primary)]">
                Treat automation as part of the product, not a utilities shelf.
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--od-text-secondary)]">
                The highest-value systems should stay visible here because they change how the user
                experiences Odyssey every day: task prioritisation, pipeline pressure, recovery work,
                and live agent analysis.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[360px]">
              <SystemStat label="Active systems" value={`${activeCount}`} />
              <SystemStat label="Agent live" value={`${activeAgentCount}`} />
              <SystemStat label="Configurable" value={`${configurableCount}`} />
            </div>
          </div>
        </section>

        {(['agent', 'operations', 'growth'] as const).map((groupKey) => (
          <section key={groupKey} className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
                {groupMeta[groupKey].label}
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--od-text-tertiary)]">
                {groupMeta[groupKey].description}
              </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {groupedTools[groupKey].map((tool, index) => {
                const ToolIcon = tool.icon;
                const enabled = toolStates[tool.id];

                return (
                  <motion.div
                    key={tool.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    <Card className="h-full border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] hover:border-[var(--od-border-default)]">
                      <CardContent className="flex h-full flex-col gap-5 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div
                              className="flex h-11 w-11 items-center justify-center rounded-2xl"
                              style={{ backgroundColor: `${tool.color}14` }}
                            >
                              <ToolIcon className="h-5 w-5" style={{ color: tool.color }} />
                            </div>
                            <div>
                              <p className="text-base font-semibold tracking-tight text-[var(--od-text-primary)]">
                                {tool.title}
                              </p>
                              <p className="mt-2 text-sm leading-7 text-[var(--od-text-tertiary)]">
                                {tool.description}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => toggleTool(tool.id)}
                            className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${
                              enabled ? 'bg-[var(--od-accent)]' : 'bg-[var(--od-bg-tertiary)]'
                            }`}
                            aria-label={enabled ? `Disable ${tool.title}` : `Enable ${tool.title}`}
                          >
                            <span
                              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                enabled ? 'translate-x-[20px]' : 'translate-x-[3px]'
                              }`}
                            />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              enabled
                                ? 'bg-[#42D48B]/12 text-[#85F0B6]'
                                : 'bg-[var(--od-bg-tertiary)] text-[var(--od-text-muted)]'
                            }`}
                          >
                            {enabled ? 'Enabled' : 'Paused'}
                          </span>
                          <span className="text-[11px] text-[var(--od-text-muted)]">
                            {tool.configurable ? 'Configurable' : 'No extra setup required'}
                          </span>
                        </div>

                        <div className="mt-auto">
                          {tool.configurable && tool.href ? (
                            <Button asChild variant="secondary" size="sm">
                              <Link href={tool.href}>
                                Open settings
                                <Settings className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          ) : (
                            <div className="text-xs text-[var(--od-text-muted)]">
                              {enabled ? 'Running with current defaults.' : 'System is currently inactive.'}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function SystemStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--od-text-muted)]">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-tight text-[var(--od-text-primary)]">{value}</p>
    </div>
  );
}
