'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sparkles,
  Phone,
  Mail,
  MessageSquare,
  DollarSign,
  Clock,
  Star,
  RefreshCw,
  ChevronRight,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Loader2,
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

const priorityColors: Record<string, string> = {
  critical: '#EF4444',
  high: '#F59E0B',
  medium: '#6C8EEF',
  low: '#6B7280',
};

const typeIcons: Record<string, typeof Phone> = {
  call: Phone,
  follow_up: Mail,
  send_quote: DollarSign,
  review_request: Star,
  reengage: RefreshCw,
  check_in: CheckCircle2,
  prepare: Calendar,
};

const channelIcons: Record<string, typeof Phone> = {
  phone: Phone,
  email: Mail,
  sms: MessageSquare,
};

export function DailyGamePlan({ organizationId, onLeadClick }: DailyGamePlanProps) {
  const [data, setData] = useState<DailyGamePlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAction, setExpandedAction] = useState<number | null>(null);
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

  if (error === 'upgrade') return null; // Silently hide for non-Pro users
  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-[var(--od-accent)]" />
          <span className="text-sm text-[var(--od-text-tertiary)]">Loading your game plan...</span>
        </CardContent>
      </Card>
    );
  }
  if (error || !data) return null;
  if (data.actions.length === 0) return null;

  const remaining = data.actions.length - completedActions.size;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <Card className="overflow-hidden border-[rgba(79,209,229,0.15)]">
        {/* Header */}
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[var(--od-accent-muted)] flex items-center justify-center">
                <Zap className="w-4 h-4 text-[var(--od-accent)]" />
              </div>
              <div>
                <CardTitle className="text-base">Today's Game Plan</CardTitle>
                <p className="text-xs text-[var(--od-text-muted)] mt-0.5">
                  {remaining} action{remaining !== 1 ? 's' : ''} remaining
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data.revenue_at_stake > 0 && (
                <Badge variant="success" size="sm">
                  ${data.revenue_at_stake.toLocaleString()} at stake
                </Badge>
              )}
              <button
                onClick={fetchGamePlan}
                className="p-1.5 rounded-md hover:bg-[var(--od-bg-tertiary)] transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[var(--od-text-muted)]" />
              </button>
            </div>
          </div>
          {/* AI greeting */}
          <div className="mt-3 p-3 rounded-lg bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)]">
            <p className="text-sm text-[var(--od-text-secondary)] font-medium">{data.greeting}</p>
            <p className="text-xs text-[var(--od-text-muted)] mt-1">{data.summary}</p>
          </div>
        </CardHeader>

        {/* Action list */}
        <CardContent className="pt-0 space-y-1.5">
          <AnimatePresence>
            {data.actions.map((action, i) => {
              const isCompleted = completedActions.has(i);
              const isExpanded = expandedAction === i;
              const TypeIcon = typeIcons[action.type] || Clock;
              const ChannelIcon = channelIcons[action.channel] || Mail;

              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: isCompleted ? 0.5 : 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={`group rounded-lg border transition-all ${
                    isExpanded
                      ? 'bg-[var(--od-bg-secondary)] border-[var(--od-border-default)]'
                      : 'bg-transparent border-[var(--od-border-subtle)] hover:border-[var(--od-border-default)]'
                  }`}
                >
                  {/* Main row */}
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                    onClick={() => setExpandedAction(isExpanded ? null : i)}
                  >
                    {/* Completion checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markComplete(i);
                      }}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                        isCompleted
                          ? 'bg-[#4ADE80] border-[#4ADE80]'
                          : 'border-[var(--od-border-default)] hover:border-[var(--od-accent)]'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </button>

                    {/* Priority indicator */}
                    <div
                      className="w-1.5 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: priorityColors[action.priority] }}
                    />

                    {/* Icon */}
                    <div className="w-7 h-7 rounded-md bg-[var(--od-bg-tertiary)] flex items-center justify-center shrink-0">
                      <TypeIcon className="w-3.5 h-3.5 text-[var(--od-text-tertiary)]" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isCompleted ? 'line-through text-[var(--od-text-muted)]' : 'text-[var(--od-text-primary)]'}`}>
                        {action.title}
                      </p>
                      <p className="text-xs text-[var(--od-text-muted)] truncate mt-0.5">
                        {action.reason.split('.')[0]}
                      </p>
                    </div>

                    {/* Value + channel */}
                    <div className="flex items-center gap-2 shrink-0">
                      {action.estimated_value ? (
                        <span className="text-xs font-medium text-[#4ADE80]">
                          ${action.estimated_value.toLocaleString()}
                        </span>
                      ) : null}
                      <ChannelIcon className="w-3.5 h-3.5 text-[var(--od-text-muted)]" />
                      <ChevronRight
                        className={`w-3.5 h-3.5 text-[var(--od-text-muted)] transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-0 ml-[3.75rem] space-y-2">
                          <div className="text-xs text-[var(--od-text-secondary)] leading-relaxed">
                            {action.reason}
                          </div>
                          <div className="p-2 rounded-md bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)]">
                            <div className="flex items-center gap-1.5 mb-1">
                              <Sparkles className="w-3 h-3 text-[var(--od-accent)]" />
                              <span className="text-xs font-medium text-[var(--od-accent-text)]">Suggested action</span>
                            </div>
                            <p className="text-xs text-[var(--od-text-secondary)]">{action.suggested_action}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {action.lead_id && onLeadClick && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onLeadClick(action.lead_id);
                                }}
                                className="text-xs h-7"
                              >
                                View lead
                                <ChevronRight className="w-3 h-3 ml-1" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                markComplete(i);
                              }}
                              className="text-xs h-7"
                            >
                              {isCompleted ? 'Undo' : 'Mark done'}
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
