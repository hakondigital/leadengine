'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  MessageSquare,
  History,
  Loader2,
  BellRing,
  Trophy,
} from 'lucide-react';
import type { Lead, LeadWithRelations, LeadStatus, LeadNote, FollowUpReminder } from '@/lib/database.types';
import { pipelineStages, type PipelineStage } from '@/lib/design-tokens';
import { AIToolsPanel } from './ai-tools-panel';

interface LeadDetailDrawerProps {
  lead: LeadWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (leadId: string, status: LeadStatus, wonValue?: number) => void;
  onPriorityChange: (leadId: string, priority: string) => void;
  onAddNote: (leadId: string, content: string) => void;
}

type TabId = 'details' | 'notes' | 'activity' | 'ai';

export function LeadDetailDrawer({
  lead,
  isOpen,
  onClose,
  onStatusChange,
  onPriorityChange,
  onAddNote,
}: LeadDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [noteContent, setNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showWonModal, setShowWonModal] = useState(false);
  const [wonValue, setWonValue] = useState('');

  if (!lead) return null;

  const stage = pipelineStages.find((s) => s.id === lead.status);

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setIsAddingNote(true);
    await onAddNote(lead.id, noteContent);
    setNoteContent('');
    setIsAddingNote(false);
  };

  const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'details', label: 'Details', icon: Building2 },
    { id: 'notes', label: 'Notes', icon: MessageSquare },
    { id: 'ai', label: 'AI Tools', icon: Sparkles },
    { id: 'activity', label: 'Activity', icon: History },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-[var(--le-bg-primary)] border-l border-[var(--le-border-subtle)] z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--le-border-subtle)]">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                  style={{
                    backgroundColor: `${stage?.color}15`,
                    color: stage?.color,
                  }}
                >
                  {lead.first_name[0]}{lead.last_name[0]}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[var(--le-text-primary)] truncate tracking-tight">
                    {lead.first_name} {lead.last_name}
                  </h2>
                  <p className="text-xs text-[var(--le-text-tertiary)]">
                    Added {formatRelativeTime(lead.created_at)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Status & Priority quick actions */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--le-border-subtle)]">
              <div className="relative">
                <button
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
                  style={{
                    backgroundColor: `${stage?.color}15`,
                    color: stage?.color,
                    border: `1px solid ${stage?.color}30`,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {stage?.label}
                  <ChevronDown className="w-3 h-3" />
                </button>

                <AnimatePresence>
                  {showStatusMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-1 py-1 bg-[var(--le-bg-tertiary)] border border-[var(--le-border-default)] rounded-[var(--le-radius-md)] shadow-[var(--le-shadow-lg)] z-10 min-w-[160px]"
                    >
                      {pipelineStages.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => {
                            if (s.id === 'won' && lead.status !== 'won') {
                              setShowWonModal(true);
                              setWonValue('');
                            } else {
                              onStatusChange(lead.id, s.id as LeadStatus);
                            }
                            setShowStatusMenu(false);
                          }}
                          className={cn(
                            'flex items-center gap-2 w-full px-3 py-2 text-xs text-left hover:bg-[var(--le-bg-elevated)] transition-colors',
                            lead.status === s.id && 'bg-[var(--le-bg-elevated)]'
                          )}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="text-[var(--le-text-secondary)]">{s.label}</span>
                          {lead.status === s.id && (
                            <CheckCircle2 className="w-3 h-3 ml-auto text-[var(--le-accent)]" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {lead.ai_score !== null && lead.ai_score !== undefined && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[var(--le-bg-tertiary)] border border-[var(--le-border-subtle)]">
                  <Sparkles className="w-3 h-3 text-[var(--le-accent)]" />
                  <span className="text-xs font-medium text-[var(--le-text-secondary)]">
                    Score: {lead.ai_score}
                  </span>
                </div>
              )}
            </div>

            {/* AI Summary */}
            {lead.ai_summary && (
              <div className="mx-4 mt-4 p-3 rounded-[var(--le-radius-md)] bg-[var(--le-accent-muted)] border border-[rgba(79,209,229,0.2)]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--le-accent)]" />
                  <span className="text-xs font-semibold text-[var(--le-accent)]">AI Insight</span>
                </div>
                <p className="text-xs text-[var(--le-text-secondary)] leading-relaxed">
                  {lead.ai_summary}
                </p>
                {lead.ai_recommended_action && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[rgba(79,209,229,0.15)]">
                    <AlertCircle className="w-3 h-3 text-[var(--le-accent)]" />
                    <span className="text-[11px] text-[var(--le-accent)] font-medium">
                      {lead.ai_recommended_action}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-[var(--le-border-subtle)] px-4 mt-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors',
                    activeTab === tab.id
                      ? 'text-[var(--le-accent)] border-[var(--le-accent)]'
                      : 'text-[var(--le-text-muted)] border-transparent hover:text-[var(--le-text-secondary)]'
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'details' && (
                <div className="p-4 space-y-4">
                  {/* Contact info */}
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--le-text-muted)] uppercase tracking-wider mb-3">
                      Contact
                    </h4>
                    <div className="space-y-2.5">
                      <DetailRow icon={Mail} label="Email" value={lead.email} isLink href={`mailto:${lead.email}`} />
                      {lead.phone && <DetailRow icon={Phone} label="Phone" value={lead.phone} isLink href={`tel:${lead.phone}`} />}
                      {lead.company && <DetailRow icon={Building2} label="Company" value={lead.company} />}
                      {lead.location && <DetailRow icon={MapPin} label="Location" value={lead.location} />}
                    </div>
                  </div>

                  {/* Project info */}
                  <div>
                    <h4 className="text-xs font-semibold text-[var(--le-text-muted)] uppercase tracking-wider mb-3">
                      Project
                    </h4>
                    <div className="space-y-2.5">
                      {lead.service_type && <DetailRow icon={Building2} label="Service" value={lead.service_type} />}
                      {lead.project_type && <DetailRow icon={Building2} label="Type" value={lead.project_type} />}
                      {lead.budget_range && <DetailRow icon={DollarSign} label="Budget" value={lead.budget_range} />}
                      {lead.urgency && <DetailRow icon={Clock} label="Urgency" value={lead.urgency} />}
                      {lead.timeframe && <DetailRow icon={Calendar} label="Timeframe" value={lead.timeframe} />}
                    </div>
                  </div>

                  {/* Message */}
                  {lead.message && (
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--le-text-muted)] uppercase tracking-wider mb-3">
                        Message
                      </h4>
                      <p className="text-sm text-[var(--le-text-secondary)] leading-relaxed bg-[var(--le-bg-secondary)] rounded-[var(--le-radius-md)] p-3 border border-[var(--le-border-subtle)]">
                        {lead.message}
                      </p>
                    </div>
                  )}

                  {/* Won value display */}
                  {lead.status === 'won' && lead.won_value && (
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--le-text-muted)] uppercase tracking-wider mb-3">
                        Revenue
                      </h4>
                      <div className="flex items-center gap-3 p-3 rounded-[var(--le-radius-md)] bg-[#4ADE80]/10 border border-[#4ADE80]/20">
                        <Trophy className="w-5 h-5 text-[#4ADE80]" />
                        <div>
                          <p className="text-lg font-bold text-[#4ADE80]">
                            ${Number(lead.won_value).toLocaleString()}
                          </p>
                          {lead.won_date && (
                            <p className="text-[10px] text-[var(--le-text-muted)]">
                              Won {formatRelativeTime(lead.won_date)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Follow-up reminders */}
                  {lead.reminders && lead.reminders.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-[var(--le-text-muted)] uppercase tracking-wider mb-3">
                        Upcoming Reminders
                      </h4>
                      <div className="space-y-2">
                        {lead.reminders.map((reminder: FollowUpReminder) => (
                          <div
                            key={reminder.id}
                            className="flex items-center gap-3 p-2.5 rounded-[var(--le-radius-md)] bg-[var(--le-bg-secondary)] border border-[var(--le-border-subtle)]"
                          >
                            <BellRing className="w-3.5 h-3.5 text-[var(--le-accent)] shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-[var(--le-text-secondary)] font-medium capitalize">
                                {reminder.reminder_type.replace(/_/g, ' ')}
                              </p>
                              <p className="text-[10px] text-[var(--le-text-muted)]">
                                {new Date(reminder.scheduled_for) > new Date()
                                  ? `Due ${formatRelativeTime(reminder.scheduled_for)}`
                                  : `Overdue — was ${formatRelativeTime(reminder.scheduled_for)}`
                                }
                              </p>
                            </div>
                            <Badge size="sm" variant={
                              new Date(reminder.scheduled_for) > new Date() ? 'default' : 'warning'
                            }>
                              {reminder.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick actions */}
                  <div className="flex gap-2 pt-2">
                    {lead.phone && (
                      <Button variant="secondary" size="sm" asChild>
                        <a href={`tel:${lead.phone}`}>
                          <Phone className="w-3.5 h-3.5" />
                          Call
                        </a>
                      </Button>
                    )}
                    <Button variant="secondary" size="sm" asChild>
                      <a href={`mailto:${lead.email}`}>
                        <Mail className="w-3.5 h-3.5" />
                        Email
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div className="p-4">
                  {/* Add note */}
                  <div className="mb-4">
                    <Textarea
                      placeholder="Add a note..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={handleAddNote}
                        disabled={!noteContent.trim() || isAddingNote}
                      >
                        {isAddingNote ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        Add Note
                      </Button>
                    </div>
                  </div>

                  {/* Notes list */}
                  <div className="space-y-3">
                    {(!lead.notes || lead.notes.length === 0) ? (
                      <p className="text-xs text-[var(--le-text-muted)] text-center py-8">
                        No notes yet. Add the first one above.
                      </p>
                    ) : (
                      lead.notes.map((note: LeadNote) => (
                        <div
                          key={note.id}
                          className={cn(
                            'p-3 rounded-[var(--le-radius-md)] border',
                            note.is_system
                              ? 'bg-[var(--le-bg-tertiary)]/50 border-[var(--le-border-subtle)]'
                              : 'bg-[var(--le-bg-secondary)] border-[var(--le-border-subtle)]'
                          )}
                        >
                          <p className="text-sm text-[var(--le-text-secondary)] leading-relaxed">
                            {note.content}
                          </p>
                          <p className="text-[10px] text-[var(--le-text-muted)] mt-2">
                            {formatRelativeTime(note.created_at)}
                            {note.is_system && ' (system)'}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'ai' && (
                <div className="p-4">
                  <AIToolsPanel leadId={lead.id} leadStatus={lead.status} />
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="p-4">
                  <div className="space-y-3">
                    {(!lead.status_changes || lead.status_changes.length === 0) ? (
                      <p className="text-xs text-[var(--le-text-muted)] text-center py-8">
                        No activity recorded yet.
                      </p>
                    ) : (
                      lead.status_changes.map((change) => {
                        const fromStage = pipelineStages.find((s) => s.id === change.from_status);
                        const toStage = pipelineStages.find((s) => s.id === change.to_status);

                        return (
                          <div
                            key={change.id}
                            className="flex items-center gap-3 py-2"
                          >
                            <div className="w-6 h-6 rounded-full bg-[var(--le-bg-tertiary)] flex items-center justify-center shrink-0">
                              <History className="w-3 h-3 text-[var(--le-text-muted)]" />
                            </div>
                            <div className="text-xs">
                              <span className="text-[var(--le-text-secondary)]">
                                Status changed
                                {change.from_status && (
                                  <>
                                    {' from '}
                                    <span style={{ color: fromStage?.color }}>{fromStage?.label}</span>
                                  </>
                                )}
                                {' to '}
                                <span style={{ color: toStage?.color }}>{toStage?.label}</span>
                              </span>
                              <p className="text-[var(--le-text-muted)] mt-0.5">
                                {formatRelativeTime(change.created_at)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Won Value Modal */}
            <AnimatePresence>
              {showWonModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center p-6"
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[var(--le-bg-secondary)] border border-[var(--le-border-default)] rounded-xl p-5 w-full max-w-xs shadow-xl"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="w-5 h-5 text-[#4ADE80]" />
                      <h3 className="text-base font-semibold text-[var(--le-text-primary)]">
                        Mark as Won
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--le-text-tertiary)] mb-4">
                      What&apos;s the value of this job? This helps track your revenue.
                    </p>
                    <Input
                      label="Job Value ($)"
                      type="number"
                      placeholder="e.g. 5000"
                      value={wonValue}
                      onChange={(e) => setWonValue(e.target.value)}
                    />
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          onStatusChange(lead.id, 'won');
                          setShowWonModal(false);
                        }}
                      >
                        Skip
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const value = wonValue ? parseFloat(wonValue) : undefined;
                          onStatusChange(lead.id, 'won', value);
                          setShowWonModal(false);
                        }}
                      >
                        <Trophy className="w-3.5 h-3.5" />
                        Confirm Won
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  isLink,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  isLink?: boolean;
  href?: string;
}) {
  const content = (
    <div className="flex items-center gap-3 py-1.5">
      <Icon className="w-3.5 h-3.5 text-[var(--le-text-muted)] shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-[var(--le-text-muted)] uppercase tracking-wider">{label}</p>
        <p className={cn(
          'text-sm truncate',
          isLink ? 'text-[var(--le-accent)] hover:underline' : 'text-[var(--le-text-secondary)]'
        )}>
          {value}
        </p>
      </div>
    </div>
  );

  if (isLink && href) {
    return <a href={href} className="block">{content}</a>;
  }
  return content;
}
