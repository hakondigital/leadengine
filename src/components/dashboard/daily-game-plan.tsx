'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';

interface GamePlanAction {
  type: 'call' | 'follow_up' | 'send_quote' | 'review_request' | 'reengage' | 'check_in' | 'prepare';
  priority: 'critical' | 'high' | 'medium' | 'low';
  lead_id: string;
  lead_name: string;
  title: string;
  reason: string;
  suggested_action: string;
  estimated_value: number | null;
  channel: 'phone' | 'email' | 'sms';
  urgency_score: number;
}

interface DailyGamePlanData {
  greeting: string;
  summary: string;
  actions: GamePlanAction[];
  revenue_at_stake: number;
  quick_wins: number;
}

interface DailyGamePlanProps {
  organizationId: string;
  onLeadClick?: (leadId: string) => void;
}

const priorityMeta: Record<GamePlanAction['priority'], { label: string; variant: 'error' | 'warning' | 'info' | 'default' }> = {
  critical: { label: 'Critical', variant: 'error' },
  high: { label: 'High pressure', variant: 'warning' },
  medium: { label: 'In motion', variant: 'info' },
  low: { label: 'Monitor', variant: 'default' },
};

const typeIcons: Record<GamePlanAction['type'], typeof Phone> = {
  call: Phone,
  follow_up: Mail,
  send_quote: DollarSign,
  review_request: Star,
  reengage: RefreshCw,
  check_in: CheckCircle2,
  prepare: Calendar,
};

const typeLabels: Record<GamePlanAction['type'], string> = {
  call: 'Call now',
  follow_up: 'Follow up',
  send_quote: 'Send quote',
  review_request: 'Request review',
  reengage: 'Re-engage',
  check_in: 'Check in',
  prepare: 'Prepare',
};

const channelIcons: Record<GamePlanAction['channel'], typeof Phone> = {
  phone: Phone,
  email: Mail,
  sms: MessageSquare,
};

export function DailyGamePlan({ organizationId, onLeadClick }: DailyGamePlanProps) {
  const [data, setData] = useState<DailyGamePlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAction, setExpandedAction] = useState<number | null>(0);
  const [completedActions, setCompletedActions] = useState<Set<number>>(new Set());

  const fetchGamePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/daily-game-plan?organization_id=${organizationId}`);
      if (!res.ok) {
        if (res.status === 403) {
          setError('upgrade');
          return;
        }
        throw new Error('Failed to fetch');
      }

      const plan = await res.json();
      setData(plan);
    } catch {
      setError('Failed to load game plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) fetchGamePlan();
  }, [organizationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const markComplete = (index: number) => {
    setCompletedActions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  if (error === 'upgrade') return null;

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-10">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--od-accent)]" />
          <span className="text-sm text-[var(--od-text-tertiary)]">Building the agent task queue...</span>
        </CardContent>
      </Card>
    );
  }

  if (error || !data || data.actions.length === 0) return null;

  const remaining = data.actions.length - completedActions.size;
  const criticalCount = data.actions.filter((action) => action.priority === 'critical').length;
  const readyNowCount = data.actions.filter((action) => action.urgency_score >= 75).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="overflow-hidden border-[rgba(79,209,229,0.18)] bg-[linear-gradient(180deg,rgba(79,209,229,0.08),transparent_36%),var(--od-bg-secondary)]">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--od-accent-muted)]">
                  <Zap className="h-4 w-4 text-[var(--od-accent)]" />
                </div>
                <div>
                  <CardTitle className="text-lg">Agent task queue</CardTitle>
                  <p className="mt-1 text-sm text-[var(--od-text-tertiary)]">
                    Keep the user on the next best move instead of making them scan a widget stack.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:w-[280px]">
              <QueueStat label="Remaining" value={`${remaining}`} tone="default" />
              <QueueStat label="Critical" value={`${criticalCount}`} tone={criticalCount > 0 ? 'error' : 'default'} />
              <QueueStat label="Quick wins" value={`${data.quick_wins}`} tone="accent" />
              <QueueStat
                label="Revenue at stake"
                value={`$${data.revenue_at_stake.toLocaleString()}`}
                tone="success"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[24px] border border-[rgba(79,209,229,0.16)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[var(--od-accent)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-accent-text)]">
                  Agent brief
                </span>
              </div>
              <p className="mt-3 text-sm font-medium leading-7 text-[var(--od-text-secondary)]">
                {data.greeting}
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--od-text-tertiary)]">{data.summary}</p>
            </div>

            <div className="rounded-[24px] border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
                    Queue pressure
                  </p>
                  <p className="mt-2 text-xl font-semibold tracking-tight text-[var(--od-text-primary)]">
                    {readyNowCount} action{readyNowCount === 1 ? '' : 's'} should be worked now
                  </p>
                </div>
                <button
                  onClick={fetchGamePlan}
                  className="rounded-xl border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] p-2 text-[var(--od-text-muted)] transition-colors hover:border-[var(--od-border-default)] hover:text-[var(--od-text-secondary)]"
                  title="Refresh task queue"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-3 text-xs leading-6 text-[var(--od-text-tertiary)]">
                Prioritise contact velocity, quote momentum, and rescue work for leads most likely to convert.
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          <AnimatePresence>
            {data.actions.map((action, index) => {
              const isCompleted = completedActions.has(index);
              const isExpanded = expandedAction === index;
              const ActionIcon = typeIcons[action.type];
              const ChannelIcon = channelIcons[action.channel];
              const priority = priorityMeta[action.priority];

              return (
                <motion.div
                  key={`${action.lead_id}-${index}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: isCompleted ? 0.56 : 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`rounded-[24px] border transition-all ${
                    isExpanded
                      ? 'border-[var(--od-border-default)] bg-[rgba(255,255,255,0.04)]'
                      : 'border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.02)] hover:border-[var(--od-border-default)]'
                  }`}
                >
                  <div
                    className="cursor-pointer px-4 py-4 sm:px-5"
                    onClick={() => setExpandedAction(isExpanded ? null : index)}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          markComplete(index);
                        }}
                        className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
                          isCompleted
                            ? 'border-[#42D48B] bg-[#42D48B]'
                            : 'border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] hover:border-[var(--od-accent)]'
                        }`}
                        aria-label={isCompleted ? 'Mark task incomplete' : 'Mark task complete'}
                      >
                        {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={priority.variant} size="sm">
                            {priority.label}
                          </Badge>
                          <Badge variant="accent" size="sm">
                            {typeLabels[action.type]}
                          </Badge>
                          {action.estimated_value ? (
                            <Badge variant="success" size="sm">
                              ${action.estimated_value.toLocaleString()} potential
                            </Badge>
                          ) : null}
                        </div>

                        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)]">
                                <ActionIcon className="h-4 w-4 text-[var(--od-text-secondary)]" />
                              </div>
                              <div className="min-w-0">
                                <h3 className={`text-sm font-semibold tracking-tight ${isCompleted ? 'line-through text-[var(--od-text-muted)]' : 'text-[var(--od-text-primary)]'}`}>
                                  {action.title}
                                </h3>
                                <p className="mt-1 text-xs text-[var(--od-text-tertiary)]">
                                  Lead: {action.lead_name}
                                </p>
                              </div>
                            </div>

                            <p className="mt-3 text-sm leading-7 text-[var(--od-text-secondary)]">
                              {action.reason.split('.')[0]}.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 rounded-2xl border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] px-3 py-2 text-xs text-[var(--od-text-secondary)]">
                            <ChannelIcon className="h-3.5 w-3.5 text-[var(--od-accent)]" />
                            <span className="capitalize">{action.channel}</span>
                            <span className="text-[var(--od-text-muted)]">score {action.urgency_score}</span>
                            <ChevronRight className={`h-3.5 w-3.5 text-[var(--od-text-muted)] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-3 border-t border-[var(--od-border-subtle)] px-5 pb-5 pt-4">
                          <div className="rounded-[20px] border border-[rgba(79,209,229,0.16)] bg-[var(--od-accent-muted)] p-4">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-3.5 w-3.5 text-[var(--od-accent)]" />
                              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-accent-text)]">
                                Suggested execution
                              </span>
                            </div>
                            <p className="mt-3 text-sm leading-7 text-[var(--od-text-secondary)]">
                              {action.suggested_action}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {action.lead_id && onLeadClick ? (
                              <Button
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onLeadClick(action.lead_id);
                                }}
                              >
                                Open lead workspace
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}

                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(event) => {
                                event.stopPropagation();
                                markComplete(index);
                              }}
                            >
                              {isCompleted ? 'Return to queue' : 'Mark complete'}
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function QueueStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'default' | 'accent' | 'success' | 'error';
}) {
  const toneClass =
    tone === 'accent'
      ? 'border-[rgba(79,209,229,0.18)] bg-[var(--od-accent-muted)] text-[var(--od-accent-text)]'
      : tone === 'success'
      ? 'border-[#42D48B]/20 bg-[#42D48B]/10 text-[#85F0B6]'
      : tone === 'error'
      ? 'border-[#F07F86]/20 bg-[#F07F86]/10 text-[#FFB4BA]'
      : 'border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] text-[var(--od-text-primary)]';

  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.16em] opacity-70">{label}</p>
      <p className="mt-2 text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}
