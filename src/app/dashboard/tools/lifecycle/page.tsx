'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { getEffectivePlanLimits } from '@/lib/client-plan';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  RotateCcw,
  ArrowLeft,
  Lock,
  ArrowUpRight,
  Loader2,
  Mail,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  Pencil,
  RefreshCw,
} from 'lucide-react';

interface LifecycleMessage {
  email_subject: string;
  email_body: string;
  sms_body: string;
}

interface WonLead {
  id: string;
  lead_id: string;
  client_name: string;
  email: string;
  phone: string | null;
  service_type: string | null;
  won_date: string;
  won_value: number | null;
}

const STAGES = [
  { key: 'check_in', label: 'Check-in', day: 1, description: 'Quick follow-up to make sure everything looks good' },
  { key: 'review_request', label: 'Review Request', day: 3, description: 'Ask for a Google review at peak satisfaction' },
  { key: 'referral_ask', label: 'Referral Ask', day: 14, description: 'Ask if they know anyone who needs similar work' },
  { key: 'cross_sell', label: 'Cross-sell', day: 30, description: 'Suggest related services they might need' },
  { key: 'maintenance', label: 'Maintenance', day: 90, description: 'Seasonal maintenance reminder' },
  { key: 'anniversary', label: 'Anniversary', day: 365, description: '1 year check-in for repeat business' },
] as const;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function StageStatus({ daysSinceWon, stageDay }: { daysSinceWon: number; stageDay: number }) {
  if (daysSinceWon >= stageDay) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
        <CheckCircle2 className="w-2.5 h-2.5" /> Due
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--od-bg-muted)] text-[var(--od-text-muted)]">
      <Clock className="w-2.5 h-2.5" /> Day {stageDay}
    </span>
  );
}

export default function LifecyclePage() {
  const { organization, user } = useOrganization();
  const orgSettings = (organization?.settings as Record<string, unknown>) || {};
  const orgPlan = (orgSettings.plan as string) || null;
  const canUse = getEffectivePlanLimits(orgPlan, user?.email).post_job_lifecycle;

  const [wonLeads, setWonLeads] = useState<WonLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, LifecycleMessage>>({});
  const [generating, setGenerating] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Record<string, 'email' | 'sms' | 'both'>>({});
  const [customInstructions, setCustomInstructions] = useState<Record<string, string>>({});

  // Load custom templates from org settings
  useEffect(() => {
    if (organization) {
      const templates = (orgSettings.lifecycle_templates as Record<string, string>) || {};
      setCustomInstructions(templates);
    }
  }, [organization]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch won leads
  useEffect(() => {
    if (!organization?.id) return;
    setLoadingLeads(true);
    fetch(`/api/jobs?organization_id=${organization.id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setWonLeads(data);
        } else if (data.jobs) {
          setWonLeads(data.jobs);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingLeads(false));
  }, [organization?.id]);

  const generateMessage = async (leadId: string, stage: string) => {
    if (!organization?.id) return;
    const key = `${leadId}:${stage}`;
    setGenerating(key);

    try {
      const res = await fetch('/api/ai/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organization.id,
          lead_id: leadId,
          stage,
          custom_template: customInstructions[stage] || undefined,
        }),
      });

      if (res.ok) {
        const msg = await res.json();
        setMessages(prev => ({ ...prev, [key]: msg }));
        setExpandedStage(key);
      }
    } catch {
      // silent
    } finally {
      setGenerating(null);
    }
  };

  const updateMessage = (key: string, field: keyof LifecycleMessage, value: string) => {
    setMessages(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const sendMessage = async (leadId: string, stage: string, channel: 'email' | 'sms') => {
    if (!organization?.id) return;
    const key = `${leadId}:${stage}`;
    const msg = messages[key];
    if (!msg) return;

    setSending(`${key}:${channel}`);

    try {
      const res = await fetch('/api/ai/lifecycle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organization.id,
          lead_id: leadId,
          stage,
          channel,
          email_subject: msg.email_subject,
          email_body: msg.email_body,
          sms_body: msg.sms_body,
        }),
      });

      if (res.ok) {
        setSent(prev => {
          const existing = prev[key];
          if (existing === 'email' && channel === 'sms') return { ...prev, [key]: 'both' };
          if (existing === 'sms' && channel === 'email') return { ...prev, [key]: 'both' };
          return { ...prev, [key]: channel };
        });
      }
    } catch {
      // silent
    } finally {
      setSending(null);
    }
  };

  // Locked state
  if (!canUse) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
          <div className="px-4 lg:px-6 py-4">
            <a href="/dashboard/tools" className="inline-flex items-center gap-1.5 text-xs text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] mb-2">
              <ArrowLeft className="w-3 h-3" /> Tools
            </a>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-400" />
              <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">Post-Job Lifecycle</h1>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-sm">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--od-bg-tertiary)] mx-auto mb-4">
              <Lock className="w-7 h-7 text-[var(--od-text-muted)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--od-text-primary)] mb-2">Upgrade to unlock</h2>
            <p className="text-sm text-[var(--od-text-tertiary)] mb-5">
              Post-Job Lifecycle sends AI-personalised follow-ups after every completed job — reviews, referrals, and repeat business. Available on Professional and Enterprise plans.
            </p>
            <a
              href="/dashboard/settings?tab=billing"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[var(--od-radius-md)] text-sm font-semibold bg-[var(--od-accent)] text-white hover:brightness-110 transition-all"
            >
              Upgrade plan
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <a href="/dashboard/tools" className="inline-flex items-center gap-1.5 text-xs text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] mb-2">
            <ArrowLeft className="w-3 h-3" /> Tools
          </a>
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">Post-Job Lifecycle</h1>
          </div>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
            AI-generated follow-ups for completed jobs — preview, customise, and send
          </p>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 max-w-4xl mx-auto space-y-4">
        {/* Custom instructions card */}
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Pencil className="w-3.5 h-3.5 text-[var(--od-accent)]" />
              <span className="text-sm font-semibold text-[var(--od-text-primary)]">Custom AI Instructions</span>
              <span className="text-[10px] text-[var(--od-text-muted)]">optional</span>
            </div>
            <p className="text-xs text-[var(--od-text-tertiary)]">
              Add custom instructions per stage to guide how the AI writes your messages. Leave blank for fully automatic AI generation.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {STAGES.slice(0, 4).map(stage => (
                <div key={stage.key}>
                  <label className="text-[10px] font-medium text-[var(--od-text-muted)] uppercase tracking-wider mb-1 block">
                    {stage.label}
                  </label>
                  <textarea
                    value={customInstructions[stage.key] || ''}
                    onChange={e => setCustomInstructions(prev => ({ ...prev, [stage.key]: e.target.value }))}
                    placeholder={`e.g. "Always mention our warranty" or "Include Google review link"`}
                    rows={2}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)] resize-none"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Jobs list */}
        {loadingLeads ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-[var(--od-accent)] animate-spin" />
          </div>
        ) : wonLeads.length === 0 ? (
          <div className="text-center py-16">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--od-bg-tertiary)] mx-auto mb-4">
              <RotateCcw className="w-6 h-6 text-[var(--od-text-muted)]" />
            </div>
            <h2 className="text-base font-semibold text-[var(--od-text-primary)] mb-1">No completed jobs yet</h2>
            <p className="text-sm text-[var(--od-text-tertiary)] max-w-sm mx-auto">
              Once you mark leads as &quot;Won&quot; in your pipeline, they&apos;ll appear here for lifecycle follow-ups.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
              {wonLeads.length} completed job{wonLeads.length !== 1 ? 's' : ''}
            </p>
            {wonLeads.map((lead, i) => {
              const isExpanded = expandedLead === lead.id;
              const elapsed = daysSince(lead.won_date);

              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="overflow-hidden">
                    <button
                      onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[var(--od-bg-secondary)] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--od-text-primary)] truncate">
                            {lead.client_name}
                          </p>
                          <p className="text-xs text-[var(--od-text-muted)] truncate">
                            {lead.service_type || 'Service'}{lead.won_value ? ` — $${lead.won_value.toLocaleString()}` : ''} — completed {elapsed} day{elapsed !== 1 ? 's' : ''} ago
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {STAGES.slice(0, 4).map(s => (
                          <StageStatus key={s.key} daysSinceWon={elapsed} stageDay={s.day} />
                        ))}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--od-text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--od-text-muted)]" />}
                      </div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-[var(--od-border-subtle)] space-y-3">
                            {STAGES.map(stage => {
                              const key = `${lead.id}:${stage.key}`;
                              const msg = messages[key];
                              const isStageExpanded = expandedStage === key;
                              const isSent = sent[key];
                              const isGenerating = generating === key;

                              return (
                                <div key={stage.key} className="rounded-xl border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] overflow-hidden">
                                  {/* Stage header */}
                                  <div className="px-3.5 py-2.5 flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                      <StageStatus daysSinceWon={elapsed} stageDay={stage.day} />
                                      <div>
                                        <p className="text-xs font-semibold text-[var(--od-text-primary)]">
                                          Day {stage.day} — {stage.label}
                                        </p>
                                        <p className="text-[10px] text-[var(--od-text-muted)]">{stage.description}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      {isSent && (
                                        <span className="text-[10px] font-medium text-emerald-400 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" />
                                          Sent via {isSent}
                                        </span>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => generateMessage(lead.id, stage.key)}
                                        disabled={!!isGenerating}
                                        className="h-7 text-[10px] gap-1"
                                      >
                                        {isGenerating ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : msg ? (
                                          <RefreshCw className="w-3 h-3" />
                                        ) : (
                                          <Sparkles className="w-3 h-3" />
                                        )}
                                        {msg ? 'Regenerate' : 'Generate'}
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Generated message (editable) */}
                                  {msg && (
                                    <motion.div
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      className="px-3.5 pb-3.5 pt-1 border-t border-[var(--od-border-subtle)] space-y-3"
                                    >
                                      {/* Toggle expand */}
                                      <button
                                        onClick={() => setExpandedStage(isStageExpanded ? null : key)}
                                        className="flex items-center gap-1 text-[10px] font-medium text-[var(--od-accent)] hover:underline"
                                      >
                                        {isStageExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                        {isStageExpanded ? 'Collapse' : 'Edit message'}
                                      </button>

                                      <AnimatePresence>
                                        {isStageExpanded && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="space-y-2.5 overflow-hidden"
                                          >
                                            {/* Email subject */}
                                            <div>
                                              <label className="text-[10px] font-medium text-[var(--od-text-muted)] uppercase tracking-wider mb-1 block">
                                                Email Subject
                                              </label>
                                              <Input
                                                value={msg.email_subject}
                                                onChange={e => updateMessage(key, 'email_subject', e.target.value)}
                                                className="text-xs h-8"
                                              />
                                            </div>

                                            {/* Email body */}
                                            <div>
                                              <label className="text-[10px] font-medium text-[var(--od-text-muted)] uppercase tracking-wider mb-1 block">
                                                Email Body
                                              </label>
                                              <textarea
                                                value={msg.email_body}
                                                onChange={e => updateMessage(key, 'email_body', e.target.value)}
                                                rows={6}
                                                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)] resize-y"
                                              />
                                            </div>

                                            {/* SMS body */}
                                            <div>
                                              <label className="text-[10px] font-medium text-[var(--od-text-muted)] uppercase tracking-wider mb-1 block">
                                                SMS Body
                                                <span className="ml-1 text-[var(--od-text-muted)]">
                                                  ({msg.sms_body.length}/160)
                                                </span>
                                              </label>
                                              <textarea
                                                value={msg.sms_body}
                                                onChange={e => updateMessage(key, 'sms_body', e.target.value)}
                                                rows={2}
                                                maxLength={320}
                                                className="w-full px-3 py-2 text-xs rounded-lg border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)] resize-none"
                                              />
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>

                                      {/* Preview (when collapsed) */}
                                      {!isStageExpanded && (
                                        <div className="rounded-lg bg-[var(--od-bg-primary)] border border-[var(--od-border-subtle)] px-3 py-2">
                                          <p className="text-[10px] font-medium text-[var(--od-text-muted)] mb-0.5">
                                            Subject: {msg.email_subject}
                                          </p>
                                          <p className="text-xs text-[var(--od-text-tertiary)] line-clamp-2">
                                            {msg.email_body.substring(0, 150)}...
                                          </p>
                                        </div>
                                      )}

                                      {/* Send buttons */}
                                      <div className="flex items-center gap-2 pt-1">
                                        {lead.email && (
                                          <Button
                                            size="sm"
                                            onClick={() => sendMessage(lead.id, stage.key, 'email')}
                                            disabled={sending === `${key}:email` || isSent === 'email' || isSent === 'both'}
                                            className="h-7 text-[10px] gap-1"
                                          >
                                            {sending === `${key}:email` ? (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <Mail className="w-3 h-3" />
                                            )}
                                            Send Email
                                          </Button>
                                        )}
                                        {lead.phone && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => sendMessage(lead.id, stage.key, 'sms')}
                                            disabled={sending === `${key}:sms` || isSent === 'sms' || isSent === 'both'}
                                            className="h-7 text-[10px] gap-1"
                                          >
                                            {sending === `${key}:sms` ? (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <MessageSquare className="w-3 h-3" />
                                            )}
                                            Send SMS
                                          </Button>
                                        )}
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
