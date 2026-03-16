'use client';

import { useState, type ElementType, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { pipelineStages } from '@/lib/design-tokens';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  AlertCircle,
  BellRing,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  DollarSign,
  History,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import type {
  FollowUpReminder,
  LeadNote,
  LeadPriority,
  LeadStatus,
  LeadWithRelations,
} from '@/lib/database.types';
import { AIToolsPanel } from './ai-tools-panel';

interface LeadDetailDrawerProps {
  lead: LeadWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, status: LeadStatus, wonValue?: number) => void;
  onPriorityChange: (leadId: string, priority: string) => void;
  onAddNote: (leadId: string, content: string) => void;
}

type TabId = 'agent' | 'details' | 'notes' | 'activity';

const priorityOptions: { id: LeadPriority; label: string }[] = [
  { id: 'critical', label: 'Critical' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
];

export function LeadDetailDrawer({
  lead,
  isOpen,
  onClose,
  onStatusChange,
  onPriorityChange,
  onAddNote,
}: LeadDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('agent');
  const [noteContent, setNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showWonModal, setShowWonModal] = useState(false);
  const [wonValue, setWonValue] = useState('');

  if (!lead) return null;

  const stage = pipelineStages.find((item) => item.id === lead.status);
  const reminders = lead.reminders || [];
  const nextAction = getNextAction(lead);
  const overdueReminders = reminders.filter(
    (reminder) => reminder.status !== 'dismissed' && new Date(reminder.scheduled_for) < new Date()
  ).length;

  const snapshot = [
    { label: 'Priority', value: priorityOptions.find((item) => item.id === lead.priority)?.label || 'Medium' },
    { label: 'Last touch', value: lead.last_contacted_at ? formatRelativeTime(lead.last_contacted_at) : 'Not contacted' },
    { label: 'Follow-up', value: lead.follow_up_date ? formatRelativeTime(lead.follow_up_date) : 'Not scheduled' },
    { label: 'Reminders', value: reminders.length ? `${reminders.length}${overdueReminders ? ` (${overdueReminders} overdue)` : ''}` : 'None' },
  ];

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setIsAddingNote(true);
    await onAddNote(lead.id, noteContent);
    setNoteContent('');
    setIsAddingNote(false);
  };

  const tabs: { id: TabId; label: string; icon: ElementType }[] = [
    { id: 'agent', label: 'Agent', icon: Sparkles },
    { id: 'details', label: 'Details', icon: Building2 },
    { id: 'notes', label: 'Notes', icon: MessageSquare },
    { id: 'activity', label: 'Activity', icon: History },
  ];

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/55 lg:hidden"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 flex w-full flex-col overflow-hidden border-l border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] sm:w-[560px] xl:w-[620px]"
          >
            <div className="border-b border-[var(--od-border-subtle)] px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-bold"
                      style={{
                        backgroundColor: `${stage?.color}18`,
                        color: stage?.color,
                      }}
                    >
                      {lead.first_name[0]}
                      {lead.last_name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
                        Lead workspace
                      </p>
                      <h2 className="mt-1 truncate text-lg font-semibold tracking-tight text-[var(--od-text-primary)]">
                        {lead.first_name} {lead.last_name}
                      </h2>
                      <p className="mt-1 truncate text-xs text-[var(--od-text-tertiary)]">
                        {lead.company || lead.service_type || lead.email}
                      </p>
                    </div>
                  </div>
                </div>

                <Button variant="ghost" size="icon-sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-4 border-b border-[var(--od-border-subtle)] px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => setShowStatusMenu((current) => !current)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-85"
                    style={{
                      backgroundColor: `${stage?.color}15`,
                      color: stage?.color,
                      borderColor: `${stage?.color}30`,
                    }}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {stage?.label}
                    <ChevronDown className="h-3 w-3" />
                  </button>

                  <AnimatePresence>
                    {showStatusMenu ? (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 z-10 mt-2 min-w-[170px] rounded-[var(--od-radius-md)] border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] py-1 shadow-[var(--od-shadow-lg)]"
                      >
                        {pipelineStages.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (item.id === 'won' && lead.status !== 'won') {
                                setShowWonModal(true);
                                setWonValue('');
                              } else {
                                onStatusChange(lead.id, item.id as LeadStatus);
                              }
                              setShowStatusMenu(false);
                            }}
                            className={cn(
                              'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[var(--od-bg-elevated)]',
                              lead.status === item.id && 'bg-[var(--od-bg-elevated)]'
                            )}
                          >
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[var(--od-text-secondary)]">{item.label}</span>
                            {lead.status === item.id ? (
                              <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-[var(--od-accent)]" />
                            ) : null}
                          </button>
                        ))}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>

                {lead.ai_score !== null && lead.ai_score !== undefined ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(79,209,229,0.2)] bg-[var(--od-accent-muted)] px-3 py-1.5 text-xs font-medium text-[var(--od-accent-text)]">
                    <Sparkles className="h-3 w-3" />
                    AI score {lead.ai_score}
                  </span>
                ) : null}

                {overdueReminders > 0 ? (
                  <Badge variant="warning" size="sm">
                    {overdueReminders} reminder{overdueReminders === 1 ? '' : 's'} overdue
                  </Badge>
                ) : null}
              </div>

              <div className="rounded-[24px] border border-[rgba(79,209,229,0.16)] bg-[linear-gradient(180deg,rgba(79,209,229,0.12),transparent_75%),var(--od-bg-secondary)] p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-[var(--od-accent)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-accent-text)]">
                    Next best action
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold tracking-tight text-[var(--od-text-primary)]">
                  {nextAction}
                </h3>
                <p className="mt-2 text-sm leading-7 text-[var(--od-text-secondary)]">
                  {lead.ai_summary || lead.message || 'Open the agent tools, decide the next move, and keep the lead progressing without losing momentum.'}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {lead.phone ? (
                    <Button variant="secondary" size="sm" asChild>
                      <a href={`tel:${lead.phone}`}>
                        <Phone className="h-3.5 w-3.5" />
                        Call now
                      </a>
                    </Button>
                  ) : null}
                  <Button variant="secondary" size="sm" asChild>
                    <a href={`mailto:${lead.email}`}>
                      <Mail className="h-3.5 w-3.5" />
                      Email
                    </a>
                  </Button>
                  <Button variant="accent" size="sm" onClick={() => setActiveTab('notes')}>
                    <MessageSquare className="h-3.5 w-3.5" />
                    Add operator note
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-4">
                {snapshot.map((item) => (
                  <SnapshotTile key={item.label} label={item.label} value={item.value} />
                ))}
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
                  Handling priority
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {priorityOptions.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onPriorityChange(lead.id, item.id)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                        lead.priority === item.id
                          ? 'border-[var(--od-border-default)] bg-[var(--od-text-primary)] text-[var(--od-bg-primary)]'
                          : 'border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] text-[var(--od-text-secondary)] hover:border-[var(--od-border-default)] hover:text-[var(--od-text-primary)]'
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex border-b border-[var(--od-border-subtle)] px-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-medium transition-colors',
                    activeTab === tab.id
                      ? 'border-[var(--od-accent)] text-[var(--od-accent)]'
                      : 'border-transparent text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)]'
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'agent' ? (
                <div className="space-y-4 p-4">
                  <SurfaceBlock
                    title="Operator snapshot"
                    subtitle="Everything the user needs to decide quickly before acting."
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoRow icon={Mail} label="Email" value={lead.email} href={`mailto:${lead.email}`} />
                      <InfoRow
                        icon={lead.phone ? Phone : Calendar}
                        label={lead.phone ? 'Phone' : 'Created'}
                        value={lead.phone || formatRelativeTime(lead.created_at)}
                        href={lead.phone ? `tel:${lead.phone}` : undefined}
                      />
                      <InfoRow icon={Building2} label="Service" value={lead.service_type || lead.project_type || 'Not specified'} />
                      <InfoRow icon={DollarSign} label="Budget" value={lead.budget_range || 'Budget not captured'} />
                    </div>
                  </SurfaceBlock>

                  {lead.ai_recommended_action ? (
                    <SurfaceBlock
                      title="Agent recommendation"
                      subtitle="The 24/7 agent should surface clear execution guidance, not generic commentary."
                      accent
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 text-[var(--od-accent)]" />
                        <p className="text-sm leading-7 text-[var(--od-text-secondary)]">
                          {lead.ai_recommended_action}
                        </p>
                      </div>
                    </SurfaceBlock>
                  ) : null}

                  <SurfaceBlock
                    title="Agent actions"
                    subtitle="Draft outreach, recover objections, plan follow-up timing, and prep estimates."
                  >
                    <AIToolsPanel leadId={lead.id} leadStatus={lead.status} />
                  </SurfaceBlock>
                </div>
              ) : null}

              {activeTab === 'details' ? (
                <div className="space-y-4 p-4">
                  <SurfaceBlock title="Contact profile" subtitle="Core lead information that supports execution.">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <InfoRow icon={Mail} label="Email" value={lead.email} href={`mailto:${lead.email}`} />
                      {lead.phone ? <InfoRow icon={Phone} label="Phone" value={lead.phone} href={`tel:${lead.phone}`} /> : null}
                      {lead.company ? <InfoRow icon={Building2} label="Company" value={lead.company} /> : null}
                      {lead.location ? <InfoRow icon={MapPin} label="Location" value={lead.location} /> : null}
                    </div>
                  </SurfaceBlock>

                  <SurfaceBlock title="Project context" subtitle="Service, timeframe, and commercial details for the job.">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {lead.service_type ? <InfoRow icon={Building2} label="Service" value={lead.service_type} /> : null}
                      {lead.project_type ? <InfoRow icon={Building2} label="Project type" value={lead.project_type} /> : null}
                      {lead.budget_range ? <InfoRow icon={DollarSign} label="Budget" value={lead.budget_range} /> : null}
                      {lead.urgency ? <InfoRow icon={Clock} label="Urgency" value={lead.urgency} /> : null}
                      {lead.timeframe ? <InfoRow icon={Calendar} label="Timeframe" value={lead.timeframe} /> : null}
                      <InfoRow icon={Calendar} label="Created" value={formatRelativeTime(lead.created_at)} />
                    </div>
                  </SurfaceBlock>

                  {lead.message ? (
                    <SurfaceBlock title="Lead message" subtitle="Original lead context from the form or contact request.">
                      <p className="text-sm leading-7 text-[var(--od-text-secondary)]">{lead.message}</p>
                    </SurfaceBlock>
                  ) : null}

                  {lead.status === 'won' && lead.won_value ? (
                    <SurfaceBlock title="Revenue captured" subtitle="Closed value already attributed to this lead.">
                      <div className="flex items-center gap-3 rounded-[20px] border border-[#42D48B]/20 bg-[#42D48B]/10 p-4">
                        <Trophy className="h-5 w-5 text-[#85F0B6]" />
                        <div>
                          <p className="text-lg font-semibold text-[#85F0B6]">
                            ${Number(lead.won_value).toLocaleString()}
                          </p>
                          {lead.won_date ? (
                            <p className="text-xs text-[var(--od-text-muted)]">
                              Won {formatRelativeTime(lead.won_date)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </SurfaceBlock>
                  ) : null}
                </div>
              ) : null}

              {activeTab === 'notes' ? (
                <div className="space-y-4 p-4">
                  <SurfaceBlock title="Operator notes" subtitle="Capture what changed, what was promised, and what happens next.">
                    <Textarea
                      placeholder="Add an operator note..."
                      value={noteContent}
                      onChange={(event) => setNoteContent(event.target.value)}
                      className="min-h-[110px]"
                    />
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!noteContent.trim() || isAddingNote}
                      >
                        {isAddingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Save note
                      </Button>
                    </div>
                  </SurfaceBlock>

                  <div className="space-y-3">
                    {!lead.notes || lead.notes.length === 0 ? (
                      <SurfaceBlock title="No notes yet" subtitle="Document the next move so anyone opening this workspace knows the state instantly." />
                    ) : (
                      lead.notes.map((note: LeadNote) => (
                        <div
                          key={note.id}
                          className={cn(
                            'rounded-[20px] border p-4',
                            note.is_system
                              ? 'border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)]'
                              : 'border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)]'
                          )}
                        >
                          <p className="text-sm leading-7 text-[var(--od-text-secondary)]">{note.content}</p>
                          <p className="mt-2 text-xs text-[var(--od-text-muted)]">
                            {formatRelativeTime(note.created_at)}
                            {note.is_system ? ' - system' : ''}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === 'activity' ? (
                <div className="space-y-4 p-4">
                  <SurfaceBlock title="Reminder timeline" subtitle="Scheduled follow-ups and reminders tied to this lead.">
                    {reminders.length === 0 ? (
                      <p className="text-sm text-[var(--od-text-tertiary)]">No reminders scheduled yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {reminders.map((reminder: FollowUpReminder) => (
                          <div
                            key={reminder.id}
                            className="flex items-start gap-3 rounded-[20px] border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-4"
                          >
                            <BellRing className="mt-0.5 h-4 w-4 text-[var(--od-accent)]" />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium capitalize text-[var(--od-text-primary)]">
                                  {reminder.reminder_type.replace(/_/g, ' ')}
                                </p>
                                <Badge
                                  size="sm"
                                  variant={new Date(reminder.scheduled_for) > new Date() ? 'default' : 'warning'}
                                >
                                  {reminder.status}
                                </Badge>
                              </div>
                              <p className="mt-1 text-xs text-[var(--od-text-tertiary)]">
                                {new Date(reminder.scheduled_for) > new Date()
                                  ? `Due ${formatRelativeTime(reminder.scheduled_for)}`
                                  : `Overdue, was ${formatRelativeTime(reminder.scheduled_for)}`}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </SurfaceBlock>

                  <SurfaceBlock title="Status history" subtitle="Track stage changes so the queue remains auditable.">
                    {!lead.status_changes || lead.status_changes.length === 0 ? (
                      <p className="text-sm text-[var(--od-text-tertiary)]">No activity recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {lead.status_changes.map((change) => {
                          const fromStage = pipelineStages.find((item) => item.id === change.from_status);
                          const toStage = pipelineStages.find((item) => item.id === change.to_status);

                          return (
                            <div
                              key={change.id}
                              className="flex items-start gap-3 rounded-[20px] border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-4"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--od-bg-tertiary)]">
                                <History className="h-3.5 w-3.5 text-[var(--od-text-muted)]" />
                              </div>
                              <div>
                                <p className="text-sm text-[var(--od-text-secondary)]">
                                  Status changed
                                  {change.from_status ? (
                                    <>
                                      {' from '}
                                      <span style={{ color: fromStage?.color }}>{fromStage?.label}</span>
                                    </>
                                  ) : null}
                                  {' to '}
                                  <span style={{ color: toStage?.color }}>{toStage?.label}</span>
                                </p>
                                <p className="mt-1 text-xs text-[var(--od-text-muted)]">
                                  {formatRelativeTime(change.created_at)}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </SurfaceBlock>
                </div>
              ) : null}
            </div>

            <AnimatePresence>
              {showWonModal ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 p-6"
                >
                  <motion.div
                    initial={{ scale: 0.96, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.96, opacity: 0 }}
                    className="w-full max-w-sm rounded-[24px] border border-[var(--od-border-default)] bg-[var(--od-bg-secondary)] p-5 shadow-[var(--od-shadow-lg)]"
                  >
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-[#85F0B6]" />
                      <h3 className="text-base font-semibold text-[var(--od-text-primary)]">Mark as won</h3>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--od-text-tertiary)]">
                      Capture the job value so Odyssey can treat closed revenue as operational signal instead of just a status change.
                    </p>
                    <div className="mt-4">
                      <Input
                        label="Job value ($)"
                        type="number"
                        placeholder="e.g. 5000"
                        value={wonValue}
                        onChange={(event) => setWonValue(event.target.value)}
                      />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          onStatusChange(lead.id, 'won');
                          setShowWonModal(false);
                        }}
                      >
                        Skip value
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const parsedValue = wonValue ? parseFloat(wonValue) : undefined;
                          onStatusChange(lead.id, 'won', parsedValue);
                          setShowWonModal(false);
                        }}
                      >
                        <Trophy className="h-3.5 w-3.5" />
                        Confirm
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function SurfaceBlock({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-[24px] border p-4',
        accent
          ? 'border-[rgba(79,209,229,0.16)] bg-[var(--od-accent-muted)]'
          : 'border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)]'
      )}
    >
      <p
        className={cn(
          'text-[11px] font-semibold uppercase tracking-[0.18em]',
          accent ? 'text-[var(--od-accent-text)]' : 'text-[var(--od-text-muted)]'
        )}
      >
        {title}
      </p>
      <p className="mt-2 text-sm leading-7 text-[var(--od-text-tertiary)]">{subtitle}</p>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

function SnapshotTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--od-text-muted)]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[var(--od-text-primary)]">{value}</p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <div className="flex items-start gap-3 rounded-[18px] border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] p-3">
      <Icon className="mt-0.5 h-3.5 w-3.5 text-[var(--od-text-muted)]" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--od-text-muted)]">{label}</p>
        <p className={cn('mt-1 text-sm', href ? 'text-[var(--od-accent-text)]' : 'text-[var(--od-text-secondary)]')}>
          {value}
        </p>
      </div>
    </div>
  );

  return href ? <a href={href}>{content}</a> : content;
}

function getNextAction(lead: LeadWithRelations) {
  if (lead.ai_recommended_action) return lead.ai_recommended_action;

  switch (lead.status) {
    case 'new':
      return 'Make first contact, confirm service fit, and book the next step while intent is fresh.';
    case 'reviewed':
      return 'Fill the missing context, then move this lead into active contact with a concrete next step.';
    case 'contacted':
      return 'Push for clarity on timing, budget, and the next commercial milestone.';
    case 'quote_sent':
      return 'Protect the quote with fast follow-up, objection handling, and a clear close path.';
    case 'won':
      return 'Treat this as a closed customer record and activate post-job review or referral follow-up.';
    case 'lost':
      return 'Decide whether this lead deserves a recovery sequence or should remain closed out.';
    default:
      return 'Open the agent tools and decide the most direct action to keep the lead moving.';
  }
}
