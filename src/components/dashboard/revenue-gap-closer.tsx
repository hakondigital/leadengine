'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowUpRight,
  ChevronRight,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';

interface RevenueGapAction {
  lead_id: string;
  lead_name: string;
  estimated_value: number;
  close_probability: number;
  action: string;
  reason: string;
}

interface RevenueGapData {
  monthly_target: number;
  current_revenue: number;
  gap: number;
  days_remaining: number;
  pipeline_value: number;
  weighted_pipeline: number;
  actions: RevenueGapAction[];
  forecast: string;
  ai_insight: string;
}

interface RevenueGapCloserProps {
  organizationId: string;
  onLeadClick?: (leadId: string) => void;
}

export function RevenueGapCloser({ organizationId, onLeadClick }: RevenueGapCloserProps) {
  const [data, setData] = useState<RevenueGapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllActions, setShowAllActions] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/revenue-gap?organization_id=${organizationId}`);
      if (!res.ok) {
        if (res.status === 403) {
          setError('upgrade');
          return;
        }
        throw new Error('Failed to fetch');
      }

      setData(await res.json());
    } catch {
      setError('Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) fetchData();
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = useMemo(() => {
    if (!data?.monthly_target) return 0;
    return Math.min(100, Math.round((data.current_revenue / data.monthly_target) * 100));
  }, [data]);

  if (error === 'upgrade') return null;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-10">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--od-accent)]" />
          <span className="text-sm text-[var(--od-text-tertiary)]">Building the revenue pressure view...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) return null;

  const onTrack = data.gap <= 0;
  const pipelineCoversGap = data.weighted_pipeline >= data.gap;
  const coverageRatio = data.gap > 0 ? Math.min(100, Math.round((data.weighted_pipeline / data.gap) * 100)) : 100;
  const visibleActions = showAllActions ? data.actions : data.actions.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.08 }}
    >
      <Card className="overflow-hidden border-[var(--od-border-default)] bg-[linear-gradient(180deg,rgba(74,222,128,0.08),transparent_36%),var(--od-bg-secondary)]">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#42D48B]/12">
                  <Target className="h-4 w-4 text-[#85F0B6]" />
                </div>
                <div>
                  <CardTitle className="text-lg">Revenue pressure</CardTitle>
                  <p className="mt-1 text-sm text-[var(--od-text-tertiary)]">
                    Turn target tracking into an execution queue the user can actually act on.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={fetchData}
              className="rounded-xl border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] p-2 text-[var(--od-text-muted)] transition-colors hover:border-[var(--od-border-default)] hover:text-[var(--od-text-secondary)]"
              title="Refresh revenue view"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5 rounded-[24px] border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={onTrack ? 'success' : pipelineCoversGap ? 'warning' : 'error'} size="sm">
                    {onTrack ? 'On target' : pipelineCoversGap ? 'Recoverable gap' : 'Revenue at risk'}
                  </Badge>
                  <span className="text-xs text-[var(--od-text-muted)]">
                    {data.days_remaining} day{data.days_remaining === 1 ? '' : 's'} left this month
                  </span>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <span className="text-3xl font-semibold tracking-tight text-[var(--od-text-primary)]">
                    ${data.current_revenue.toLocaleString()}
                  </span>
                  <span className="pb-1 text-sm text-[var(--od-text-muted)]">
                    of ${data.monthly_target.toLocaleString()}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-7 text-[var(--od-text-secondary)]">{data.forecast}</p>
              </div>

              <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[320px]">
                <PressureStat label="Gap" value={onTrack ? 'Covered' : `$${data.gap.toLocaleString()}`} />
                <PressureStat label="Pipeline" value={`$${data.pipeline_value.toLocaleString()}`} />
                <PressureStat label="Coverage" value={`${coverageRatio}%`} />
              </div>
            </div>

            <div className="mt-4">
              <div className="h-3 overflow-hidden rounded-full bg-[var(--od-bg-tertiary)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.75, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{
                    background: onTrack
                      ? 'linear-gradient(90deg,#42D48B,#73F5B1)'
                      : pipelineCoversGap
                      ? 'linear-gradient(90deg,#E8A652,#FFD08B)'
                      : 'linear-gradient(90deg,#F07F86,#E8A652)',
                  }}
                />
              </div>
            </div>
          </div>

          {data.ai_insight ? (
            <div className="mt-4 rounded-[20px] border border-[rgba(79,209,229,0.16)] bg-[var(--od-accent-muted)] p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[var(--od-accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-accent-text)]">
                  Agent directive
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--od-text-secondary)]">{data.ai_insight}</p>
            </div>
          ) : null}
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {!onTrack && data.actions.length > 0 ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
                    Best recovery moves
                  </p>
                  <p className="mt-1 text-sm text-[var(--od-text-tertiary)]">
                    Surface the opportunities most likely to close the gap quickly.
                  </p>
                </div>

                {data.actions.length > 3 ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowAllActions((current) => !current)}
                  >
                    {showAllActions ? 'Show fewer' : `Show all ${data.actions.length}`}
                    <ChevronRight className={`h-3.5 w-3.5 transition-transform ${showAllActions ? 'rotate-90' : ''}`} />
                  </Button>
                ) : null}
              </div>

              <AnimatePresence initial={false}>
                <div className="space-y-3">
                  {visibleActions.map((action, index) => (
                    <motion.button
                      key={`${action.lead_id}-${index}`}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ delay: index * 0.04 }}
                      onClick={() => onLeadClick?.(action.lead_id)}
                      className="group flex w-full items-start gap-4 rounded-[22px] border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-4 text-left transition-all hover:border-[var(--od-border-default)] hover:bg-[rgba(255,255,255,0.04)]"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)]">
                        <div className="flex flex-col items-center leading-none">
                          <span className="text-xs font-semibold text-[var(--od-text-primary)]">
                            {action.close_probability}%
                          </span>
                          <span className="mt-1 text-[10px] text-[var(--od-text-muted)]">likely</span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={action.close_probability >= 60 ? 'success' : action.close_probability >= 35 ? 'warning' : 'default'} size="sm">
                            {action.close_probability >= 60 ? 'Strong chance' : action.close_probability >= 35 ? 'Worth pushing' : 'Longer shot'}
                          </Badge>
                          <Badge variant="accent" size="sm">
                            ${action.estimated_value.toLocaleString()} potential
                          </Badge>
                        </div>

                        <h3 className="mt-3 text-sm font-semibold tracking-tight text-[var(--od-text-primary)]">
                          {action.lead_name}
                        </h3>
                        <p className="mt-1 text-sm leading-7 text-[var(--od-text-secondary)]">{action.action}</p>
                        <p className="mt-1 text-xs leading-6 text-[var(--od-text-tertiary)]">{action.reason}</p>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-[var(--od-text-muted)]">
                        <span>Open lead</span>
                        <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </AnimatePresence>
            </>
          ) : (
            <div className="rounded-[22px] border border-[#42D48B]/20 bg-[#42D48B]/10 p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="mt-0.5 h-4 w-4 text-[#85F0B6]" />
                <div>
                  <p className="text-sm font-semibold text-[#85F0B6]">Target pressure is under control</p>
                  <p className="mt-1 text-sm leading-7 text-[var(--od-text-secondary)]">
                    The revenue gap is covered. Keep the agent focused on protecting quote momentum and closing cleanly.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PressureStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--od-text-muted)]">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-tight text-[var(--od-text-primary)]">{value}</p>
    </div>
  );
}
