'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useSequences } from '@/hooks/use-sequences';
import { usePlan } from '@/hooks/use-plan';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Zap,
  Plus,
  Mail,
  MessageSquare,
  Phone,
  Clock,
  Users,
  ChevronRight,
  ArrowLeft,
  Play,
  Pause,
  Settings,
} from 'lucide-react';

interface SequenceStep {
  id: string;
  type: 'email' | 'sms' | 'call' | 'wait';
  label: string;
  delay: string;
  subject?: string;
}

interface Sequence {
  id: string;
  name: string;
  triggerType: string;
  triggerLabel: string;
  stepsCount: number;
  activeEnrollments: number;
  totalCompleted: number;
  active: boolean;
  steps: SequenceStep[];
}

const mockSequences: Sequence[] = [
  {
    id: '1',
    name: 'New Lead Welcome',
    triggerType: 'new_lead',
    triggerLabel: 'New Lead Created',
    stepsCount: 4,
    activeEnrollments: 12,
    totalCompleted: 87,
    active: true,
    steps: [
      { id: 's1', type: 'email', label: 'Welcome Email', delay: 'Immediately', subject: 'Thanks for reaching out!' },
      { id: 's2', type: 'wait', label: 'Wait', delay: '24 hours' },
      { id: 's3', type: 'sms', label: 'Follow-up SMS', delay: 'After wait' },
      { id: 's4', type: 'email', label: 'Value Proposition', delay: '72 hours', subject: 'Here\'s what we can do for you' },
    ],
  },
  {
    id: '2',
    name: 'Quote Follow-Up',
    triggerType: 'quote_sent',
    triggerLabel: 'Quote Sent',
    stepsCount: 3,
    activeEnrollments: 5,
    totalCompleted: 34,
    active: true,
    steps: [
      { id: 's1', type: 'wait', label: 'Wait', delay: '48 hours' },
      { id: 's2', type: 'email', label: 'Quote Check-in', delay: 'After wait', subject: 'Any questions about your quote?' },
      { id: 's3', type: 'call', label: 'Follow-up Call', delay: '5 days' },
    ],
  },
  {
    id: '3',
    name: 'Re-engagement',
    triggerType: 'no_response',
    triggerLabel: 'No Response (7 days)',
    stepsCount: 5,
    activeEnrollments: 8,
    totalCompleted: 22,
    active: false,
    steps: [
      { id: 's1', type: 'email', label: 'We Miss You', delay: '7 days', subject: 'Still interested?' },
      { id: 's2', type: 'wait', label: 'Wait', delay: '3 days' },
      { id: 's3', type: 'sms', label: 'Quick Check-in', delay: 'After wait' },
      { id: 's4', type: 'wait', label: 'Wait', delay: '5 days' },
      { id: 's5', type: 'email', label: 'Final Follow-up', delay: 'After wait', subject: 'Last chance - special offer inside' },
    ],
  },
  {
    id: '4',
    name: 'Post-Job Review Request',
    triggerType: 'job_completed',
    triggerLabel: 'Job Completed',
    stepsCount: 2,
    activeEnrollments: 3,
    totalCompleted: 56,
    active: true,
    steps: [
      { id: 's1', type: 'wait', label: 'Wait', delay: '24 hours' },
      { id: 's2', type: 'email', label: 'Review Request', delay: 'After wait', subject: 'How did we do?' },
    ],
  },
];

const stepTypeConfig: Record<string, { icon: typeof Mail; color: string; bg: string }> = {
  email: { icon: Mail, color: '#4070D0', bg: 'rgba(91,141,239,0.08)' },
  sms: { icon: MessageSquare, color: '#1F9B5A', bg: 'rgba(52,199,123,0.08)' },
  call: { icon: Phone, color: '#C48020', bg: 'rgba(240,160,48,0.08)' },
  wait: { icon: Clock, color: '#6B7280', bg: 'rgba(107,114,128,0.08)' },
};

export default function SequencesPage() {
  const { organization } = useOrganization();
  const { canUseSequences, planName, loading: planLoading } = usePlan();
  const { sequences: fetchedSequences, loading, createSequence, toggleSequence } = useSequences(organization?.id);
  const [localSequences, setLocalSequences] = useState(mockSequences);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (planLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[var(--le-accent)] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!canUseSequences) {
    return <UpgradeBanner feature="Sequences" requiredPlan="Professional" currentPlan={planName} />;
  }
  const sequences: Sequence[] = fetchedSequences.length > 0
    ? fetchedSequences.map((s) => ({
        id: s.id,
        name: s.name,
        triggerType: s.trigger,
        triggerLabel: s.trigger === 'new_lead' ? 'New Lead Created' : s.trigger === 'status_change' ? 'Status Change' : 'Manual',
        stepsCount: s.steps?.length || 0,
        activeEnrollments: s.enrolled_count,
        totalCompleted: s.completed_count,
        active: s.is_active,
        steps: (s.steps || []).map((step) => ({
          id: step.id,
          type: step.type as 'email' | 'sms' | 'call' | 'wait',
          label: step.subject || step.type.charAt(0).toUpperCase() + step.type.slice(1),
          delay: step.delay_days === 0 ? 'Immediately' : `${step.delay_days} days`,
          subject: step.subject,
        })),
      }))
    : localSequences;

  const selectedSequence = sequences.find((s) => s.id === selectedId);

  const toggleActive = (id: string) => {
    if (fetchedSequences.length > 0) {
      const seq = fetchedSequences.find((s) => s.id === id);
      toggleSequence(id, !seq?.is_active);
    } else {
      setLocalSequences((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
      );
    }
  };

  if (selectedSequence) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
          <div className="px-4 lg:px-6 py-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)} className="mb-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Sequences
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
                  {selectedSequence.name}
                </h1>
                <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
                  Trigger: {selectedSequence.triggerLabel}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={selectedSequence.active ? 'success' : 'default'} dot>
                  {selectedSequence.active ? 'Active' : 'Paused'}
                </Badge>
                <Button variant="outline" size="sm">
                  <Settings className="w-3.5 h-3.5" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 lg:px-6 py-6">
          <Card>
            <CardHeader>
              <CardTitle>Sequence Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {selectedSequence.steps.map((step, i) => {
                  const config = stepTypeConfig[step.type];
                  const StepIcon = config.icon;
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex gap-4 pb-6 last:pb-0"
                    >
                      {/* Timeline */}
                      <div className="flex flex-col items-center">
                        <div
                          className="flex items-center justify-center w-8 h-8 rounded-full border-2 shrink-0"
                          style={{ backgroundColor: config.bg, borderColor: config.color }}
                        >
                          <StepIcon className="w-3.5 h-3.5" style={{ color: config.color }} />
                        </div>
                        {i < selectedSequence.steps.length - 1 && (
                          <div className="w-0.5 flex-1 bg-[var(--le-border-subtle)] mt-1" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 pb-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--le-text-primary)]">
                            Step {i + 1}: {step.label}
                          </p>
                          <span className="text-[10px] font-medium text-[var(--le-text-muted)] uppercase tracking-wider px-1.5 py-0.5 bg-[var(--le-bg-tertiary)] rounded-[4px]">
                            {step.type}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--le-text-tertiary)] mt-0.5">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {step.delay}
                        </p>
                        {step.subject && (
                          <p className="text-xs text-[var(--le-text-secondary)] mt-1 italic">
                            Subject: &quot;{step.subject}&quot;
                          </p>
                        )}
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

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
              Follow-Up Sequences
            </h1>
            <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
              Automate your lead follow-up with multi-step sequences
            </p>
          </div>
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" />
            Create Sequence
          </Button>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--le-text-muted)] mb-4">
            <div className="w-3 h-3 border-2 border-[var(--le-accent)] border-t-transparent rounded-full animate-spin" />
            Loading sequences...
          </div>
        )}
        {sequences.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No sequences yet"
            description="Create automated follow-up sequences to nurture your leads."
            action={{ label: 'Create Sequence', onClick: () => {} }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sequences.map((seq, i) => (
              <motion.div
                key={seq.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="hover:border-[var(--le-accent)]/30 transition-colors cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1" onClick={() => setSelectedId(seq.id)}>
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-[var(--le-accent)]" />
                          <h3 className="text-sm font-semibold text-[var(--le-text-primary)]">
                            {seq.name}
                          </h3>
                        </div>
                        <p className="text-xs text-[var(--le-text-tertiary)] mt-1">
                          Trigger: {seq.triggerLabel}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActive(seq.id);
                        }}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          seq.active ? 'bg-[var(--le-accent)]' : 'bg-[var(--le-bg-tertiary)]'
                        }`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            seq.active ? 'translate-x-[18px]' : 'translate-x-[3px]'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--le-border-subtle)]">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-3 h-3 text-[var(--le-text-muted)]" />
                        <span className="text-xs text-[var(--le-text-tertiary)]">{seq.stepsCount} steps</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 text-[var(--le-text-muted)]" />
                        <span className="text-xs text-[var(--le-text-tertiary)]">{seq.activeEnrollments} active</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-[var(--le-text-muted)]">{seq.totalCompleted} completed</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--le-text-muted)] ml-auto" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
