'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  Target,
  DollarSign,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
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
  const [showActions, setShowActions] = useState(false);

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

  if (error === 'upgrade') return null;
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--od-accent)]" />
          <span className="text-sm text-[var(--od-text-tertiary)]">Analyzing revenue...</span>
        </CardContent>
      </Card>
    );
  }
  if (error || !data) return null;

  const pct = data.monthly_target > 0
    ? Math.min(100, Math.round((data.current_revenue / data.monthly_target) * 100))
    : 0;
  const onTrack = data.gap <= 0;
  const pipelineCoversGap = data.weighted_pipeline >= data.gap;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[rgba(74,222,128,0.1)] flex items-center justify-center">
                <Target className="w-4 h-4 text-[#4ADE80]" />
              </div>
              <div>
                <CardTitle className="text-base">Revenue Tracker</CardTitle>
                <p className="text-xs text-[var(--od-text-muted)] mt-0.5">
                  {data.days_remaining} day{data.days_remaining !== 1 ? 's' : ''} left this month
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="p-1.5 rounded-md hover:bg-[var(--od-bg-tertiary)] transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[var(--od-text-muted)]" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress bar */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[var(--od-text-primary)]">
                  ${data.current_revenue.toLocaleString()}
                </span>
                <span className="text-sm text-[var(--od-text-muted)]">
                  / ${data.monthly_target.toLocaleString()}
                </span>
              </div>
              <Badge variant={onTrack ? 'success' : pipelineCoversGap ? 'default' : 'error'} size="sm">
                {onTrack ? 'Target hit' : `$${data.gap.toLocaleString()} to go`}
              </Badge>
            </div>
            <div className="h-3 rounded-full bg-[var(--od-bg-tertiary)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  background: onTrack
                    ? '#4ADE80'
                    : pct >= 60
                    ? 'linear-gradient(90deg, #4ADE80, #F59E0B)'
                    : 'linear-gradient(90deg, #EF4444, #F59E0B)',
                }}
              />
            </div>
            <p className="text-xs text-[var(--od-text-muted)] mt-1.5">{data.forecast}</p>
          </div>

          {/* Pipeline stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)]">
              <p className="text-xs text-[var(--od-text-muted)]">Pipeline Value</p>
              <p className="text-lg font-semibold text-[var(--od-text-primary)] mt-0.5">
                ${data.pipeline_value.toLocaleString()}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)]">
              <p className="text-xs text-[var(--od-text-muted)]">Weighted Forecast</p>
              <p className="text-lg font-semibold text-[var(--od-text-primary)] mt-0.5">
                ${data.weighted_pipeline.toLocaleString()}
              </p>
            </div>
          </div>

          {/* AI Insight */}
          {data.ai_insight && (
            <div className="p-3 rounded-lg bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-3 h-3 text-[var(--od-accent)]" />
                <span className="text-xs font-medium text-[var(--od-accent-text)]">AI Insight</span>
              </div>
              <p className="text-xs text-[var(--od-text-secondary)] leading-relaxed">{data.ai_insight}</p>
            </div>
          )}

          {/* Actions toggle */}
          {data.actions.length > 0 && !onTrack && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowActions(!showActions)}
                className="w-full text-xs justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {showActions ? 'Hide' : 'Show'} {data.actions.length} revenue opportunities
                </span>
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showActions ? 'rotate-90' : ''}`} />
              </Button>

              <AnimatePresence>
                {showActions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1.5 overflow-hidden"
                  >
                    {data.actions.map((action, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--od-border-subtle)] hover:border-[var(--od-border-default)] transition-colors cursor-pointer group"
                        onClick={() => onLeadClick?.(action.lead_id)}
                      >
                        {/* Probability ring */}
                        <div className="relative w-9 h-9 shrink-0">
                          <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--od-bg-tertiary)" strokeWidth="3" />
                            <circle
                              cx="18" cy="18" r="15.5" fill="none"
                              stroke={action.close_probability >= 60 ? '#4ADE80' : action.close_probability >= 30 ? '#F59E0B' : '#6B7280'}
                              strokeWidth="3"
                              strokeDasharray={`${action.close_probability * 0.974} 100`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-[var(--od-text-secondary)]">
                            {action.close_probability}%
                          </span>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[var(--od-text-primary)] truncate">
                            {action.lead_name}
                          </p>
                          <p className="text-xs text-[var(--od-text-muted)] truncate">{action.action}</p>
                        </div>

                        {/* Value */}
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold text-[#4ADE80]">
                            ${action.estimated_value.toLocaleString()}
                          </p>
                          <p className="text-[10px] text-[var(--od-text-muted)]">potential</p>
                        </div>

                        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--od-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
