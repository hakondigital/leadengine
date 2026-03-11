'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  ClipboardList,
  Calendar,
  User,
  Loader2,
  AlertCircle,
  Hammer,
  Eye,
  CircleDot,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Stage = 'planning' | 'in_progress' | 'review' | 'completed';

interface ChecklistItem {
  label: string;
  done: boolean;
}

interface Job {
  id: string;
  lead_id: string;
  client_name: string;
  email: string;
  phone: string;
  service_type: string;
  won_value: number;
  won_date: string;
  stage: Stage;
  checklist: ChecklistItem[];
  notes: string;
  target_completion: string | null;
  assigned_to: string | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STAGES: { key: Stage; label: string; color: string; bg: string; border: string }[] = [
  { key: 'planning', label: 'Planning', color: '#5B8DEF', bg: 'rgba(91,141,239,0.08)', border: 'rgba(91,141,239,0.20)' },
  { key: 'in_progress', label: 'In Progress', color: '#F0A030', bg: 'rgba(240,160,48,0.08)', border: 'rgba(240,160,48,0.20)' },
  { key: 'review', label: 'Review', color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.20)' },
  { key: 'completed', label: 'Completed', color: '#34C77B', bg: 'rgba(52,199,123,0.08)', border: 'rgba(52,199,123,0.20)' },
];

const stageMap = Object.fromEntries(STAGES.map((s) => [s.key, s]));

const stageIcon: Record<Stage, typeof ClipboardList> = {
  planning: ClipboardList,
  in_progress: Hammer,
  review: Eye,
  completed: CheckCircle2,
};

/* ------------------------------------------------------------------ */
/*  Helper                                                             */
/* ------------------------------------------------------------------ */

function currency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function JobsPage() {
  const { organization } = useOrganization();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Stage | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  /* ---- Fetch ---------------------------------------------------- */

  const fetchJobs = useCallback(async () => {
    if (!organization?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs?organization_id=${organization.id}`);
      if (!res.ok) throw new Error(`Failed to load jobs (${res.status})`);
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  /* ---- Patch helper --------------------------------------------- */

  const patchJob = useCallback(
    async (leadId: string, patch: Record<string, unknown>) => {
      setSaving((s) => ({ ...s, [leadId]: true }));
      try {
        const res = await fetch('/api/jobs', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead_id: leadId, organization_id: organization?.id, ...patch }),
        });
        if (!res.ok) throw new Error('Update failed');
        const data = await res.json();
        // Optimistic: update local state from response or re-fetch
        if (data.job) {
          setJobs((prev) => prev.map((j) => (j.lead_id === leadId ? { ...j, ...data.job } : j)));
        } else {
          setJobs((prev) =>
            prev.map((j) => (j.lead_id === leadId ? { ...j, ...patch } as Job : j))
          );
        }
      } catch {
        // Silently fail - could add toast here
      } finally {
        setSaving((s) => ({ ...s, [leadId]: false }));
      }
    },
    [organization?.id],
  );

  /* ---- Handlers ------------------------------------------------- */

  const handleStageChange = (job: Job, newStage: Stage) => {
    patchJob(job.lead_id, { stage: newStage });
  };

  const handleChecklistToggle = (job: Job, idx: number) => {
    const updated = job.checklist.map((item, i) =>
      i === idx ? { ...item, done: !item.done } : item,
    );
    // Optimistic local update
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, checklist: updated } : j)),
    );
    patchJob(job.lead_id, { checklist: updated });
  };

  const handleNotesBlur = (job: Job, value: string) => {
    if (value !== job.notes) {
      patchJob(job.lead_id, { notes: value });
    }
  };

  const handleTargetDateChange = (job: Job, value: string) => {
    patchJob(job.lead_id, { target_completion: value || null });
  };

  /* ---- Derived data --------------------------------------------- */

  const filtered = activeFilter === 'all' ? jobs : jobs.filter((j) => j.stage === activeFilter);
  const totalJobs = jobs.length;
  const inProgressCount = jobs.filter((j) => j.stage === 'in_progress').length;
  const completedCount = jobs.filter((j) => j.stage === 'completed').length;

  const stageCounts: Record<Stage | 'all', number> = {
    all: totalJobs,
    planning: jobs.filter((j) => j.stage === 'planning').length,
    in_progress: inProgressCount,
    review: jobs.filter((j) => j.stage === 'review').length,
    completed: completedCount,
  };

  /* ---- Stats ---------------------------------------------------- */

  const stats = [
    { label: 'Total Jobs', value: totalJobs, icon: Briefcase, color: '#5B8DEF' },
    { label: 'In Progress', value: inProgressCount, icon: Hammer, color: '#F0A030' },
    { label: 'Completed', value: completedCount, icon: CheckCircle2, color: '#34C77B' },
  ];

  /* ---- Render --------------------------------------------------- */

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
                Job Tracker
              </h1>
              <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
                Post-sale project tracking
              </p>
            </div>

            {/* Stats summary (desktop) */}
            {!loading && jobs.length > 0 && (
              <div className="hidden md:flex items-center gap-4">
                {stats.map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg"
                      style={{ backgroundColor: `${s.color}12` }}
                    >
                      <s.icon className="w-4 h-4" style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                        {s.label}
                      </p>
                      <p className="text-base font-bold text-[var(--od-text-primary)] leading-none mt-0.5">
                        {s.value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* Mobile stats cards */}
        {!loading && jobs.length > 0 && (
          <div className="grid grid-cols-3 gap-3 md:hidden">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                        style={{ backgroundColor: `${s.color}12` }}
                      >
                        <s.icon className="w-4 h-4" style={{ color: s.color }} />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                          {s.label}
                        </p>
                        <p className="text-lg font-bold text-[var(--od-text-primary)] leading-none mt-0.5">
                          {s.value}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Stage filter tabs */}
        {!loading && jobs.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1">
            {[{ key: 'all' as const, label: 'All', color: 'var(--od-text-secondary)' }, ...STAGES].map(
              (tab) => {
                const isActive = activeFilter === tab.key;
                const count = stageCounts[tab.key];
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveFilter(tab.key)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--od-radius-md)] text-xs font-medium
                      whitespace-nowrap transition-all duration-200
                      ${isActive
                        ? 'bg-[var(--od-bg-tertiary)] text-[var(--od-text-primary)] border border-[var(--od-border-strong)] shadow-sm'
                        : 'text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-tertiary)]/50 border border-transparent'
                      }
                    `}
                  >
                    {tab.key !== 'all' && (
                      <CircleDot
                        className="w-3 h-3"
                        style={{ color: (tab as typeof STAGES[number]).color }}
                      />
                    )}
                    {tab.label}
                    <span
                      className={`
                        inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold
                        ${isActive
                          ? 'bg-[var(--od-accent)]/10 text-[var(--od-accent)]'
                          : 'bg-[var(--od-bg-tertiary)] text-[var(--od-text-muted)]'
                        }
                      `}
                    >
                      {count}
                    </span>
                  </button>
                );
              },
            )}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 text-[var(--od-accent)] animate-spin" />
            <p className="text-sm text-[var(--od-text-muted)]">Loading jobs...</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[rgba(232,99,108,0.08)] border border-[rgba(232,99,108,0.15)]">
              <AlertCircle className="w-6 h-6 text-[#E8636C]" />
            </div>
            <p className="text-sm font-medium text-[var(--od-text-primary)]">Failed to load jobs</p>
            <p className="text-xs text-[var(--od-text-muted)] max-w-xs text-center">{error}</p>
            <Button variant="secondary" size="sm" onClick={fetchJobs}>
              Try again
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && jobs.length === 0 && (
          <EmptyState
            icon={Briefcase}
            title="No jobs yet"
            description="Jobs appear here automatically when a lead is marked as won. Close a deal to get started."
          />
        )}

        {/* Filtered empty */}
        {!loading && !error && jobs.length > 0 && filtered.length === 0 && (
          <EmptyState
            icon={ClipboardList}
            title={`No ${stageMap[activeFilter as Stage]?.label ?? ''} jobs`}
            description="There are no jobs in this stage right now."
            action={{ label: 'View all jobs', onClick: () => setActiveFilter('all') }}
          />
        )}

        {/* Job cards */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((job, i) => {
                const stage = stageMap[job.stage];
                const StageIcon = stageIcon[job.stage];
                const isExpanded = expandedId === job.id;
                const doneCount = job.checklist.filter((c) => c.done).length;
                const totalChecklist = job.checklist.length;
                const progress = totalChecklist > 0 ? (doneCount / totalChecklist) * 100 : 0;
                const isSaving = saving[job.lead_id];

                return (
                  <motion.div
                    key={job.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                  >
                    <Card className="overflow-hidden">
                      {/* Card header / summary row */}
                      <div
                        className="p-4 cursor-pointer hover:bg-[var(--od-bg-tertiary)]/40 transition-colors"
                        onClick={() => setExpandedId(isExpanded ? null : job.id)}
                      >
                        <div className="flex items-start gap-4">
                          {/* Stage icon */}
                          <div
                            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 mt-0.5"
                            style={{ backgroundColor: stage.bg }}
                          >
                            <StageIcon className="w-5 h-5" style={{ color: stage.color }} />
                          </div>

                          {/* Main info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-semibold text-[var(--od-text-primary)] truncate">
                                {job.client_name}
                              </h3>
                              <span
                                className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] border shrink-0"
                                style={{
                                  color: stage.color,
                                  backgroundColor: stage.bg,
                                  borderColor: stage.border,
                                }}
                              >
                                {stage.label}
                              </span>
                              {isSaving && (
                                <Loader2 className="w-3 h-3 text-[var(--od-accent)] animate-spin shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-[var(--od-text-tertiary)] mt-0.5 truncate">
                              {job.service_type}
                            </p>

                            {/* Meta row */}
                            <div className="flex items-center gap-4 mt-2 flex-wrap">
                              <span className="text-sm font-semibold text-[var(--od-text-primary)]">
                                {currency(job.won_value)}
                              </span>

                              {/* Checklist progress */}
                              {totalChecklist > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-1.5 rounded-full bg-[var(--od-bg-tertiary)] overflow-hidden">
                                    <motion.div
                                      className="h-full rounded-full"
                                      style={{ backgroundColor: stage.color }}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${progress}%` }}
                                      transition={{ duration: 0.4, ease: 'easeOut' }}
                                    />
                                  </div>
                                  <span className="text-[10px] text-[var(--od-text-muted)] whitespace-nowrap">
                                    {doneCount}/{totalChecklist}
                                  </span>
                                </div>
                              )}

                              {/* Target date */}
                              {job.target_completion && (
                                <span className="flex items-center gap-1 text-[10px] text-[var(--od-text-muted)]">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(job.target_completion)}
                                </span>
                              )}

                              {/* Assigned to */}
                              {job.assigned_to && (
                                <span className="flex items-center gap-1 text-[10px] text-[var(--od-text-muted)]">
                                  <User className="w-3 h-3" />
                                  {job.assigned_to}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Expand toggle */}
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="shrink-0 mt-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(isExpanded ? null : job.id);
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded detail panel */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-0 border-t border-[var(--od-border-subtle)]">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-4">
                                {/* Left column: Checklist + Notes */}
                                <div className="space-y-4">
                                  {/* Checklist */}
                                  {totalChecklist > 0 && (
                                    <div>
                                      <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider mb-2">
                                        Checklist
                                      </p>
                                      <div className="space-y-1.5">
                                        {job.checklist.map((item, idx) => (
                                          <label
                                            key={idx}
                                            className="flex items-center gap-2.5 p-2 rounded-[var(--od-radius-md)] hover:bg-[var(--od-bg-tertiary)]/50 transition-colors cursor-pointer group"
                                          >
                                            <div
                                              className={`
                                                flex items-center justify-center w-4.5 h-4.5 rounded border transition-all duration-200
                                                ${item.done
                                                  ? 'border-[#34C77B] bg-[#34C77B]'
                                                  : 'border-[var(--od-border-strong)] bg-transparent group-hover:border-[var(--od-accent)]'
                                                }
                                              `}
                                              style={{ width: 18, height: 18 }}
                                            >
                                              {item.done && (
                                                <svg
                                                  viewBox="0 0 12 12"
                                                  className="w-3 h-3 text-white"
                                                  fill="none"
                                                  stroke="currentColor"
                                                  strokeWidth={2}
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                >
                                                  <path d="M2 6l3 3 5-5" />
                                                </svg>
                                              )}
                                            </div>
                                            <input
                                              type="checkbox"
                                              checked={item.done}
                                              onChange={() => handleChecklistToggle(job, idx)}
                                              className="sr-only"
                                            />
                                            <span
                                              className={`text-sm transition-colors ${
                                                item.done
                                                  ? 'text-[var(--od-text-muted)] line-through'
                                                  : 'text-[var(--od-text-primary)]'
                                              }`}
                                            >
                                              {item.label}
                                            </span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Notes */}
                                  <div>
                                    <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider mb-2">
                                      Notes
                                    </p>
                                    <NotesTextarea
                                      defaultValue={job.notes}
                                      onBlur={(val) => handleNotesBlur(job, val)}
                                    />
                                  </div>
                                </div>

                                {/* Right column: Stage + Date + Contact info */}
                                <div className="space-y-4">
                                  {/* Stage selector */}
                                  <div>
                                    <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider mb-2">
                                      Stage
                                    </p>
                                    <select
                                      value={job.stage}
                                      onChange={(e) => handleStageChange(job, e.target.value as Stage)}
                                      className="w-full h-9 px-3 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]"
                                    >
                                      {STAGES.map((s) => (
                                        <option key={s.key} value={s.key}>
                                          {s.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Target completion date */}
                                  <div>
                                    <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider mb-2">
                                      Target Completion
                                    </p>
                                    <input
                                      type="date"
                                      value={job.target_completion ?? ''}
                                      onChange={(e) => handleTargetDateChange(job, e.target.value)}
                                      className="w-full h-9 px-3 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]"
                                    />
                                  </div>

                                  {/* Contact info */}
                                  <div>
                                    <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider mb-2">
                                      Contact Details
                                    </p>
                                    <div className="space-y-1.5">
                                      <p className="text-xs text-[var(--od-text-secondary)]">
                                        {job.email}
                                      </p>
                                      {job.phone && (
                                        <p className="text-xs text-[var(--od-text-secondary)]">
                                          {job.phone}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Won info */}
                                  <div className="flex items-center gap-4">
                                    <div>
                                      <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                                        Won Value
                                      </p>
                                      <p className="text-sm font-bold text-[var(--od-text-primary)] mt-0.5">
                                        {currency(job.won_value)}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                                        Won Date
                                      </p>
                                      <p className="text-sm text-[var(--od-text-primary)] mt-0.5">
                                        {formatDate(job.won_date)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Notes textarea — separate component so defaultValue stays stable   */
/* ------------------------------------------------------------------ */

function NotesTextarea({
  defaultValue,
  onBlur,
}: {
  defaultValue: string;
  onBlur: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);

  // Sync if parent data refreshes
  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onBlur(value)}
      rows={4}
      placeholder="Add notes about this job..."
      className="w-full px-3 py-2 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)] resize-none"
    />
  );
}
