'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DailyGamePlan, GamePlanAction } from '@/lib/ai-actions';
import {
  Zap,
  Loader2,
  Phone,
  Mail,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const priorityConfig = {
  critical: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', label: 'Critical' },
  high: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', label: 'High' },
  medium: { color: '#4FD1E5', bg: 'rgba(79,209,229,0.1)', label: 'Medium' },
  low: { color: '#6B7280', bg: 'rgba(107,114,128,0.1)', label: 'Low' },
};

const channelIcons = {
  phone: Phone,
  email: Mail,
  sms: MessageSquare,
};

export default function GamePlanPage() {
  const { organization } = useOrganization();
  const [plan, setPlan] = useState<DailyGamePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedAction, setExpandedAction] = useState<number | null>(null);

  const fetchPlan = async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/daily-game-plan?organization_id=${organization.id}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to generate plan');
        return;
      }
      const data = await res.json();
      setPlan(data);
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#F59E0B]" />
                <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
                  Daily Game Plan
                </h1>
              </div>
              <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
                AI-prioritised actions to win more today
              </p>
            </div>
            <Button
              onClick={fetchPlan}
              disabled={loading || !organization?.id}
              size="sm"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : plan ? (
                <RefreshCw className="w-3.5 h-3.5" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {plan ? 'Refresh' : 'Generate Plan'}
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6 max-w-4xl">
        {/* Empty state */}
        {!plan && !loading && !error && (
          <div className="text-center py-20">
            <Zap className="w-12 h-12 text-[#F59E0B] mx-auto mb-4 opacity-40" />
            <h2 className="text-lg font-semibold text-[var(--od-text-primary)] mb-2">
              Your Daily Game Plan
            </h2>
            <p className="text-sm text-[var(--od-text-muted)] max-w-md mx-auto mb-6">
              AI analyses your leads, quotes, and appointments to build a prioritised action list for today.
            </p>
            <Button onClick={fetchPlan} disabled={!organization?.id}>
              <Sparkles className="w-4 h-4" />
              Generate Today&apos;s Plan
            </Button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--od-accent)] mx-auto mb-3" />
            <p className="text-sm text-[var(--od-text-muted)]">Analysing your pipeline...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-12">
            <AlertTriangle className="w-8 h-8 text-[#F87171] mx-auto mb-3" />
            <p className="text-sm text-[#F87171] mb-4">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchPlan}>
              Try Again
            </Button>
          </div>
        )}

        {/* Plan results */}
        {plan && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Greeting + summary */}
            <div className="bg-gradient-to-br from-[#F59E0B]/10 to-[#F59E0B]/5 rounded-2xl p-6 border border-[#F59E0B]/20">
              <p className="text-lg font-bold text-[var(--od-text-primary)] mb-2">
                {plan.greeting}
              </p>
              <p className="text-sm text-[var(--od-text-secondary)] leading-relaxed">
                {plan.summary}
              </p>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--od-bg-secondary)] rounded-xl p-4 border border-[var(--od-border-subtle)] text-center">
                <Zap className="w-5 h-5 text-[#F59E0B] mx-auto mb-1" />
                <p className="text-2xl font-bold text-[var(--od-text-primary)]">{plan.actions.length}</p>
                <p className="text-[10px] text-[var(--od-text-muted)] uppercase tracking-wider">Actions</p>
              </div>
              <div className="bg-[var(--od-bg-secondary)] rounded-xl p-4 border border-[var(--od-border-subtle)] text-center">
                <DollarSign className="w-5 h-5 text-[#4ADE80] mx-auto mb-1" />
                <p className="text-2xl font-bold text-[var(--od-text-primary)]">
                  ${(plan.revenue_at_stake || 0).toLocaleString()}
                </p>
                <p className="text-[10px] text-[var(--od-text-muted)] uppercase tracking-wider">At Stake</p>
              </div>
              <div className="bg-[var(--od-bg-secondary)] rounded-xl p-4 border border-[var(--od-border-subtle)] text-center">
                <TrendingUp className="w-5 h-5 text-[var(--od-accent)] mx-auto mb-1" />
                <p className="text-2xl font-bold text-[var(--od-text-primary)]">{plan.quick_wins || 0}</p>
                <p className="text-[10px] text-[var(--od-text-muted)] uppercase tracking-wider">Quick Wins</p>
              </div>
            </div>

            {/* Action list */}
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--od-text-primary)]">
                Today&apos;s Actions
              </h2>
              {plan.actions.map((action, i) => (
                <ActionCard
                  key={i}
                  action={action}
                  index={i}
                  expanded={expandedAction === i}
                  onToggle={() => setExpandedAction(expandedAction === i ? null : i)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  action,
  index,
  expanded,
  onToggle,
}: {
  action: GamePlanAction;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const priority = priorityConfig[action.priority];
  const ChannelIcon = channelIcons[action.channel] || Mail;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className="cursor-pointer hover:border-[var(--od-accent)]/30 transition-colors"
        onClick={onToggle}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Priority indicator */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: priority.bg }}
            >
              <span className="text-xs font-bold" style={{ color: priority.color }}>
                {index + 1}
              </span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                  style={{ color: priority.color, backgroundColor: priority.bg }}
                >
                  {priority.label}
                </span>
                <ChannelIcon className="w-3 h-3 text-[var(--od-text-muted)]" />
              </div>
              <h3 className="text-sm font-semibold text-[var(--od-text-primary)] mb-0.5">
                {action.title}
              </h3>
              <p className="text-xs text-[var(--od-text-tertiary)] line-clamp-1">
                {action.reason}
              </p>
            </div>

            {/* Value + expand */}
            <div className="flex items-center gap-2 shrink-0">
              {action.estimated_value && (
                <span className="text-xs font-semibold text-[#4ADE80]">
                  ${action.estimated_value.toLocaleString()}
                </span>
              )}
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-[var(--od-text-muted)]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[var(--od-text-muted)]" />
              )}
            </div>
          </div>

          {/* Expanded details */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-[var(--od-border-subtle)] space-y-2">
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider mb-1">
                      Why
                    </p>
                    <p className="text-xs text-[var(--od-text-secondary)] leading-relaxed">
                      {action.reason}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider mb-1">
                      Suggested Action
                    </p>
                    <p className="text-xs text-[var(--od-text-secondary)] leading-relaxed">
                      {action.suggested_action}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
