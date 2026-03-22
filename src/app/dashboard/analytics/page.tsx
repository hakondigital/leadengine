'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOrganization } from '@/hooks/use-organization';
import { useLeads } from '@/hooks/use-leads';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Clock,
  Users,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

// ── Chart colors ──────────────────────────────────────────────
const COLORS = {
  primary: '#6366F1',
  won: '#22C55E',
  lost: '#EF4444',
  quoted: '#F59E0B',
  contacted: '#0EA5E9',
  reviewed: '#8B5CF6',
};

const STAGE_COLORS: Record<string, string> = {
  new: '#6366F1',
  reviewed: '#8B5CF6',
  contacted: '#0EA5E9',
  quote_sent: '#F59E0B',
  won: '#22C55E',
  lost: '#EF4444',
};

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  reviewed: 'Reviewed',
  contacted: 'Contacted',
  quote_sent: 'Quote Sent',
  won: 'Won',
  lost: 'Lost',
};

const PIE_COLORS = ['#6366F1', '#0EA5E9', '#22C55E', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899', '#14B8A6'];

type DateRange = '7d' | '30d' | '90d' | 'all';

// ── Helpers ───────────────────────────────────────────────────
function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function formatCurrency(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toLocaleString()}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

function formatMonth(d: Date): string {
  return d.toLocaleDateString('en-AU', { month: 'short', year: '2-digit' });
}

// ── Custom Tooltip ────────────────────────────────────────────
function ChartTooltip({ active, payload, label, formatter }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-[rgba(0,0,0,0.06)] px-3 py-2 text-xs">
      <p className="text-[#A3A3A3] mb-1 font-medium">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-[#404040] font-medium">
            {entry.name}: {formatter ? formatter(entry.value) : entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  change,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  change?: number;
  icon: typeof DollarSign;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 lg:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-[var(--od-text-primary)] tracking-tight">{value}</p>
          </div>
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${color}14` }}
          >
            <Icon className="w-4.5 h-4.5" style={{ color }} />
          </div>
        </div>
        {change !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {change >= 0 ? (
              <ArrowUpRight className="w-3 h-3 text-[#22C55E]" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-[#EF4444]" />
            )}
            <span
              className="text-xs font-semibold"
              style={{ color: change >= 0 ? '#22C55E' : '#EF4444' }}
            >
              {Math.abs(change)}%
            </span>
            <span className="text-xs text-[var(--od-text-muted)]">vs prior period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { organization } = useOrganization();
  const { leads, loading } = useLeads(organization?.id);
  const [range, setRange] = useState<DateRange>('30d');

  // ── Filter leads by date range ──────────────────────────────
  const filteredLeads = useMemo(() => {
    if (range === 'all') return leads;
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoff = daysAgo(days);
    return leads.filter((l) => new Date(l.created_at) >= cutoff);
  }, [leads, range]);

  const priorLeads = useMemo(() => {
    if (range === 'all') return [];
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const cutoffCurrent = daysAgo(days);
    const cutoffPrior = daysAgo(days * 2);
    return leads.filter((l) => {
      const d = new Date(l.created_at);
      return d >= cutoffPrior && d < cutoffCurrent;
    });
  }, [leads, range]);

  // ── KPI Calculations ───────────────────────────────────────
  const kpis = useMemo(() => {
    const total = filteredLeads.length;
    const won = filteredLeads.filter((l) => l.status === 'won');
    const wonCount = won.length;
    const totalRevenue = won.reduce((a, l) => a + (l.won_value || 0), 0);
    const conversionRate = total > 0 ? Math.round((wonCount / total) * 100) : 0;

    // Avg response time (created_at to updated_at as proxy for first status change)
    const responded = filteredLeads.filter((l) => l.status !== 'new' && l.updated_at !== l.created_at);
    let avgResponseHrs = 0;
    if (responded.length > 0) {
      const totalMs = responded.reduce((a, l) => {
        return a + (new Date(l.updated_at).getTime() - new Date(l.created_at).getTime());
      }, 0);
      avgResponseHrs = Math.round(totalMs / responded.length / 1000 / 60 / 60);
    }

    // Prior period for comparison
    const priorTotal = priorLeads.length;
    const priorWon = priorLeads.filter((l) => l.status === 'won');
    const priorRevenue = priorWon.reduce((a, l) => a + (l.won_value || 0), 0);
    const priorConversion = priorTotal > 0 ? Math.round((priorWon.length / priorTotal) * 100) : 0;

    const revenueChange = priorRevenue > 0 ? Math.round(((totalRevenue - priorRevenue) / priorRevenue) * 100) : undefined;
    const conversionChange = priorConversion > 0 ? conversionRate - priorConversion : undefined;
    const volumeChange = priorTotal > 0 ? Math.round(((total - priorTotal) / priorTotal) * 100) : undefined;

    return {
      totalRevenue,
      conversionRate,
      avgResponseHrs,
      leadVolume: total,
      revenueChange,
      conversionChange,
      volumeChange,
    };
  }, [filteredLeads, priorLeads]);

  // ── Lead Volume Over Time (Area) ────────────────────────────
  const volumeData = useMemo(() => {
    const map = new Map<string, number>();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    // Build empty buckets
    for (let i = days - 1; i >= 0; i--) {
      const d = daysAgo(i);
      const key = range === '90d' || range === 'all'
        ? `${d.getFullYear()}-W${Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)}`
        : d.toISOString().slice(0, 10);
      map.set(key, 0);
    }
    filteredLeads.forEach((l) => {
      const d = new Date(l.created_at);
      const key = range === '90d' || range === 'all'
        ? `${d.getFullYear()}-W${Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)}`
        : d.toISOString().slice(0, 10);
      map.set(key, (map.get(key) || 0) + 1);
    });
    // Deduplicate and sort
    const entries = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    return entries.map(([key, count]) => {
      let label: string;
      if (key.includes('W')) {
        label = key;
      } else {
        label = formatDate(new Date(key + 'T00:00:00'));
      }
      return { date: label, leads: count };
    });
  }, [filteredLeads, range]);

  // ── Revenue Over Time (Bar) ─────────────────────────────────
  const revenueData = useMemo(() => {
    const map = new Map<string, number>();
    const wonLeads = filteredLeads.filter((l) => l.status === 'won' && l.won_value);
    wonLeads.forEach((l) => {
      const d = new Date(l.won_date || l.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + (l.won_value || 0));
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, revenue]) => ({
        month: formatMonth(new Date(key + '-01T00:00:00')),
        revenue,
      }));
  }, [filteredLeads]);

  // ── Lead Sources (Pie) ─────────────────────────────────────
  const sourceData = useMemo(() => {
    const map = new Map<string, number>();
    filteredLeads.forEach((l) => {
      const src = l.source || 'direct';
      map.set(src, (map.get(src) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [filteredLeads]);

  // ── Conversion Funnel (Horizontal Bar) ──────────────────────
  const funnelData = useMemo(() => {
    const stages = ['new', 'reviewed', 'contacted', 'quote_sent', 'won'] as const;
    const total = filteredLeads.length || 1;
    // Count leads that reached each stage (cumulative: reaching quote_sent means they passed contacted etc.)
    const stageOrder = { new: 0, reviewed: 1, contacted: 2, quote_sent: 3, won: 4, lost: 2 };
    const counts = stages.map((stage) => {
      const stageIdx = stageOrder[stage];
      const count = filteredLeads.filter((l) => {
        const leadIdx = stageOrder[l.status as keyof typeof stageOrder] ?? 0;
        return leadIdx >= stageIdx;
      }).length;
      return {
        stage: STAGE_LABELS[stage],
        count,
        pct: Math.round((count / total) * 100),
        fill: STAGE_COLORS[stage],
      };
    });
    return counts;
  }, [filteredLeads]);

  // ── Pipeline Distribution Over Time (Stacked Bar) ──────────
  const pipelineTimeData = useMemo(() => {
    const weeks = new Map<string, Record<string, number>>();
    filteredLeads.forEach((l) => {
      const d = new Date(l.created_at);
      // Group by week
      const weekStart = new Date(d);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const key = weekStart.toISOString().slice(0, 10);
      if (!weeks.has(key)) {
        weeks.set(key, { new: 0, reviewed: 0, contacted: 0, quote_sent: 0, won: 0, lost: 0 });
      }
      const bucket = weeks.get(key)!;
      bucket[l.status] = (bucket[l.status] || 0) + 1;
    });
    return Array.from(weeks.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, statuses]) => ({
        week: formatDate(new Date(key + 'T00:00:00')),
        ...statuses,
      }));
  }, [filteredLeads]);

  // ── Top Sources Table ───────────────────────────────────────
  const topSources = useMemo(() => {
    const map = new Map<string, { leads: number; won: number; revenue: number }>();
    filteredLeads.forEach((l) => {
      const src = l.source || 'direct';
      const entry = map.get(src) || { leads: 0, won: 0, revenue: 0 };
      entry.leads++;
      if (l.status === 'won') {
        entry.won++;
        entry.revenue += l.won_value || 0;
      }
      map.set(src, entry);
    });
    return Array.from(map.entries())
      .map(([source, data]) => ({
        source: source.charAt(0).toUpperCase() + source.slice(1),
        ...data,
        conversion: data.leads > 0 ? Math.round((data.won / data.leads) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);
  }, [filteredLeads]);

  // ── Loading State ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--od-accent)]" />
      </div>
    );
  }

  const rangeOptions: { value: DateRange; label: string }[] = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: 'all', label: 'All time' },
  ];

  return (
    <div className="min-h-screen">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">Reports</h1>
            <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
              Performance metrics and conversion insights
            </p>
          </div>
          <div className="flex items-center gap-1 bg-[var(--od-bg-tertiary)] rounded-lg p-1">
            {rangeOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  range === opt.value
                    ? 'bg-white text-[var(--od-text-primary)] shadow-sm'
                    : 'text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* ── KPI Row ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label="Total Revenue"
            value={formatCurrency(kpis.totalRevenue)}
            change={kpis.revenueChange}
            icon={DollarSign}
            color={COLORS.won}
          />
          <KpiCard
            label="Conversion Rate"
            value={`${kpis.conversionRate}%`}
            change={kpis.conversionChange}
            icon={TrendingUp}
            color={COLORS.primary}
          />
          <KpiCard
            label="Avg Response Time"
            value={kpis.avgResponseHrs < 1 ? '<1h' : `${kpis.avgResponseHrs}h`}
            icon={Clock}
            color={COLORS.contacted}
          />
          <KpiCard
            label="Lead Volume"
            value={kpis.leadVolume.toLocaleString()}
            change={kpis.volumeChange}
            icon={Users}
            color={COLORS.reviewed}
          />
        </div>

        {/* ── Charts Row 1 ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Lead Volume Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Lead Volume Over Time</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-64">
                {volumeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={volumeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: '#A3A3A3' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#A3A3A3' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="leads"
                        stroke={COLORS.primary}
                        strokeWidth={2}
                        fill="url(#leadGrad)"
                        name="Leads"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No lead data for this period" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Revenue Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-64">
                {revenueData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: '#A3A3A3' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#A3A3A3' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => formatCurrency(v)}
                      />
                      <Tooltip content={<ChartTooltip formatter={formatCurrency} />} />
                      <Bar dataKey="revenue" fill={COLORS.won} radius={[4, 4, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No revenue data for this period" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Charts Row 2 ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Lead Sources Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Lead Sources</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-64 flex items-center">
                {sourceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sourceData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={0}
                      >
                        {sourceData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0];
                          return (
                            <div className="bg-white rounded-xl shadow-lg border border-[rgba(0,0,0,0.06)] px-3 py-2 text-xs">
                              <span className="text-[#404040] font-medium">
                                {d.name}: {(d.value as number).toLocaleString()} leads
                              </span>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No source data" />
                )}
                {/* Legend */}
                {sourceData.length > 0 && (
                  <div className="flex flex-col gap-2 pr-4 min-w-[120px]">
                    {sourceData.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="text-xs text-[var(--od-text-secondary)] truncate">{s.name}</span>
                        <span className="text-xs text-[var(--od-text-muted)] ml-auto">{s.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Conversion Funnel</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="h-64">
                {funnelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={funnelData}
                      layout="vertical"
                      margin={{ top: 4, right: 40, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#A3A3A3' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="stage"
                        tick={{ fontSize: 11, fill: '#A3A3A3' }}
                        axisLine={false}
                        tickLine={false}
                        width={80}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white rounded-xl shadow-lg border border-[rgba(0,0,0,0.06)] px-3 py-2 text-xs">
                              <p className="text-[#404040] font-medium">{d.stage}: {d.count} leads ({d.pct}%)</p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]} name="Leads">
                        {funnelData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <EmptyChart message="No funnel data" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Charts Row 3 — Pipeline Distribution ────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Pipeline Distribution Over Time</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-72">
              {pipelineTimeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineTimeData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.04)" vertical={false} />
                    <XAxis
                      dataKey="week"
                      tick={{ fontSize: 11, fill: '#A3A3A3' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#A3A3A3' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white rounded-xl shadow-lg border border-[rgba(0,0,0,0.06)] px-3 py-2 text-xs">
                            <p className="text-[#A3A3A3] mb-1 font-medium">{label}</p>
                            {payload.filter(p => (p.value as number) > 0).map((p, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                                <span className="text-[#404040] font-medium">
                                  {STAGE_LABELS[p.dataKey as string] || String(p.dataKey)}: {String(p.value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }}
                    />
                    {['new', 'reviewed', 'contacted', 'quote_sent', 'won', 'lost'].map((stage) => (
                      <Bar
                        key={stage}
                        dataKey={stage}
                        stackId="pipeline"
                        fill={STAGE_COLORS[stage]}
                        radius={stage === 'lost' ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        name={STAGE_LABELS[stage]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart message="No pipeline data for this period" />
              )}
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-3 justify-center">
              {Object.entries(STAGE_LABELS).map(([id, label]) => (
                <div key={id} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: STAGE_COLORS[id] }} />
                  <span className="text-xs text-[var(--od-text-muted)]">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Top Performing Sources Table ─────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Performing Sources</CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            {topSources.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--od-border-subtle)]">
                      <th className="text-left py-2.5 px-3 text-xs font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                        Source
                      </th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                        Leads
                      </th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                        Won
                      </th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                        Revenue
                      </th>
                      <th className="text-right py-2.5 px-3 text-xs font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                        Conv. Rate
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topSources.map((src) => (
                      <tr
                        key={src.source}
                        className="border-b border-[var(--od-border-subtle)] last:border-0 hover:bg-[var(--od-bg-tertiary)] transition-colors"
                      >
                        <td className="py-2.5 px-3 font-medium text-[var(--od-text-primary)]">
                          {src.source}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--od-text-secondary)]">
                          {src.leads}
                        </td>
                        <td className="py-2.5 px-3 text-right text-[var(--od-text-secondary)]">
                          {src.won}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-[var(--od-text-primary)]">
                          {formatCurrency(src.revenue)}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                              src.conversion >= 30
                                ? 'bg-[rgba(34,197,94,0.1)] text-[#22C55E]'
                                : src.conversion >= 15
                                ? 'bg-[rgba(245,158,11,0.1)] text-[#F59E0B]'
                                : 'bg-[rgba(163,163,163,0.1)] text-[#A3A3A3]'
                            }`}
                          >
                            {src.conversion}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-[var(--od-text-muted)] text-center py-8">
                No source data available for this period
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Empty Chart Placeholder ───────────────────────────────────
function EmptyChart({ message }: { message: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <p className="text-sm text-[var(--od-text-muted)]">{message}</p>
    </div>
  );
}
