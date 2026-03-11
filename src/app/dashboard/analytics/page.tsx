'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { StatCard } from '@/components/dashboard/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { pipelineStages } from '@/lib/design-tokens';
import { useOrganization } from '@/hooks/use-organization';
import { useLeads } from '@/hooks/use-leads';
import type { WinLossInsights } from '@/lib/ai-actions';
import {
  TrendingUp,
  Clock,
  Target,
  Users,
  Percent,
  Sparkles,
  Loader2,
  Lightbulb,
  Trophy,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';

export default function AnalyticsPage() {
  const { organization } = useOrganization();
  const { leads, loading } = useLeads(organization?.id);
  const [insights, setInsights] = useState<WinLossInsights | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const total = leads.length;
  const won = leads.filter((l) => l.status === 'won').length;
  const lost = leads.filter((l) => l.status === 'lost').length;
  const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
  const avgScore = Math.round(leads.reduce((a, l) => a + (l.ai_score || 0), 0) / (total || 1));
  const totalRevenue = leads
    .filter((l) => l.status === 'won')
    .reduce((a, l) => a + ((l as unknown as Record<string, unknown>).won_value as number || 0), 0);

  const runAnalysis = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch('/api/ai/analysis');
      if (res.ok) {
        const data = await res.json();
        setInsights(data);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setInsightsLoading(false);
    }
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
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
            Analytics
          </h1>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
            Lead performance and conversion insights
          </p>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total Leads" value={total} icon={Users} color="#6C8EEF" index={0} />
          <StatCard label="Conversion Rate" value={`${conversionRate}%`} icon={Percent} color="#4ADE80" index={1} />
          <StatCard label="Avg. AI Score" value={avgScore} icon={Target} color="#4FD1E5" index={2} />
          <StatCard label="Won / Lost" value={`${won} / ${lost}`} icon={TrendingUp} color="#60C3D0" index={3} />
          <StatCard label="Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} color="#4ADE80" index={4} />
        </div>

        {/* AI Win/Loss Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--od-accent)]" />
                <CardTitle>AI Win/Loss Analysis</CardTitle>
              </div>
              <Button
                size="sm"
                onClick={runAnalysis}
                disabled={insightsLoading || total === 0}
              >
                {insightsLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {insights ? 'Refresh Analysis' : 'Run AI Analysis'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!insights && !insightsLoading && (
              <div className="text-center py-8">
                <Sparkles className="w-8 h-8 text-[var(--od-accent)] mx-auto mb-3 opacity-40" />
                <p className="text-sm text-[var(--od-text-muted)]">
                  Click &quot;Run AI Analysis&quot; to get AI-powered insights about your pipeline
                </p>
              </div>
            )}

            {insightsLoading && (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--od-accent)] mx-auto mb-3" />
                <p className="text-sm text-[var(--od-text-muted)]">Analyzing your pipeline data...</p>
              </div>
            )}

            {insights && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Summary */}
                <div className="bg-[var(--od-accent-muted)] rounded-lg p-4 border border-[rgba(79,209,229,0.2)]">
                  <p className="text-sm text-[var(--od-text-secondary)] leading-relaxed">{insights.summary}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Win Patterns */}
                  <div className="bg-[var(--od-bg-secondary)] rounded-lg p-4 border border-[var(--od-border-subtle)]">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
                      <span className="text-xs font-semibold text-[#4ADE80] uppercase tracking-wider">Win Patterns</span>
                    </div>
                    <ul className="space-y-2">
                      {insights.win_patterns.map((pattern, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Trophy className="w-3 h-3 text-[#4ADE80] mt-0.5 shrink-0" />
                          <span className="text-xs text-[var(--od-text-secondary)]">{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Loss Patterns */}
                  <div className="bg-[var(--od-bg-secondary)] rounded-lg p-4 border border-[var(--od-border-subtle)]">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-4 h-4 text-[#F87171]" />
                      <span className="text-xs font-semibold text-[#F87171] uppercase tracking-wider">Loss Patterns</span>
                    </div>
                    <ul className="space-y-2">
                      {insights.loss_patterns.map((pattern, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 text-[#F87171] mt-0.5 shrink-0" />
                          <span className="text-xs text-[var(--od-text-secondary)]">{pattern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-[var(--od-bg-secondary)] rounded-lg p-4 border border-[var(--od-border-subtle)]">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-[var(--od-accent)]" />
                    <span className="text-xs font-semibold text-[var(--od-accent)] uppercase tracking-wider">Top Recommendations</span>
                  </div>
                  <ul className="space-y-2">
                    {insights.top_recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-xs font-bold text-[var(--od-accent)] mt-0.5">{i + 1}.</span>
                        <span className="text-xs text-[var(--od-text-secondary)]">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Best Sources & Revenue */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-[var(--od-bg-secondary)] rounded-lg p-4 border border-[var(--od-border-subtle)]">
                    <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider mb-2">Best Lead Sources</p>
                    <div className="space-y-1.5">
                      {insights.best_sources.map((src, i) => (
                        <p key={i} className="text-xs text-[var(--od-text-secondary)]">{src}</p>
                      ))}
                    </div>
                  </div>
                  <div className="bg-[var(--od-bg-secondary)] rounded-lg p-4 border border-[var(--od-border-subtle)]">
                    <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider mb-2">Revenue Insights</p>
                    <p className="text-xs text-[var(--od-text-secondary)]">{insights.revenue_insights}</p>
                    <p className="text-xs text-[var(--od-text-muted)] mt-2">{insights.avg_response_time_impact}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pipelineStages.map((stage) => {
                const count = leads.filter((l) => l.status === stage.id).length;
                const pct = total > 0 ? (count / total) * 100 : 0;

                return (
                  <div key={stage.id} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-[var(--od-text-secondary)] font-medium">
                      {stage.label}
                    </div>
                    <div className="flex-1 h-6 bg-[var(--od-bg-tertiary)] rounded-[var(--od-radius-sm)] overflow-hidden relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-[var(--od-radius-sm)] flex items-center px-2"
                        style={{ backgroundColor: `${stage.color}30` }}
                      >
                        {pct > 15 && (
                          <span className="text-[10px] font-semibold" style={{ color: stage.color }}>
                            {count}
                          </span>
                        )}
                      </motion.div>
                      {pct <= 15 && count > 0 && (
                        <span className="absolute left-[calc(var(--w)+8px)] top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[var(--od-text-muted)]" style={{ '--w': `${pct}%` } as React.CSSProperties}>
                          {count}
                        </span>
                      )}
                    </div>
                    <div className="w-10 text-right text-xs text-[var(--od-text-muted)]">
                      {Math.round(pct)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lead sources */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(
                leads.reduce((acc, l) => {
                  const src = l.source || 'unknown';
                  acc[src] = (acc[src] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              )
                .sort(([, a], [, b]) => b - a)
                .map(([source, count]) => (
                  <div key={source} className="flex items-center justify-between py-2 border-b border-[var(--od-border-subtle)] last:border-0">
                    <span className="text-sm text-[var(--od-text-secondary)] capitalize">{source}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--od-text-primary)]">{count}</span>
                      <span className="text-xs text-[var(--od-text-muted)]">
                        ({Math.round((count / total) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
