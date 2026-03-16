'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Loader2,
  Mail,
  MessageSquare,
  Clock,
  DollarSign,
  ShieldAlert,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Phone,
  Lightbulb,
} from 'lucide-react';
import type { FollowUpDraft, ObjectionStrategy, ContactSuggestion, QuoteEstimate } from '@/lib/ai-actions';

interface AIToolsPanelProps {
  leadId: string;
  leadStatus: string;
}

type FollowUpType = 'initial_outreach' | 'quote_follow_up' | 'no_response' | 'check_in';
type ObjectionContext = 'went_cold' | 'quote_rejected' | 'chose_competitor' | 'budget_issue';

export function AIToolsPanel({ leadId, leadStatus }: AIToolsPanelProps) {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  // Follow-up state
  const [followUpLoading, setFollowUpLoading] = useState(false);
  const [followUpDraft, setFollowUpDraft] = useState<FollowUpDraft | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  // Objection state
  const [objectionLoading, setObjectionLoading] = useState(false);
  const [objectionStrategy, setObjectionStrategy] = useState<ObjectionStrategy | null>(null);

  // Schedule state
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [contactSuggestion, setContactSuggestion] = useState<ContactSuggestion | null>(null);

  // Quote state
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteEstimate, setQuoteEstimate] = useState<QuoteEstimate | null>(null);

  const toggleTool = (tool: string) => {
    setExpandedTool(expandedTool === tool ? null : tool);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const generateFollowUp = async (type: FollowUpType) => {
    setFollowUpLoading(true);
    try {
      const res = await fetch('/api/ai/follow-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, followUpType: type }),
      });
      const data = await res.json();
      setFollowUpDraft(data);
    } catch (err) {
      console.error('Follow-up generation failed:', err);
    } finally {
      setFollowUpLoading(false);
    }
  };

  const generateObjection = async (context: ObjectionContext) => {
    setObjectionLoading(true);
    try {
      const res = await fetch('/api/ai/objection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, context }),
      });
      const data = await res.json();
      setObjectionStrategy(data);
    } catch (err) {
      console.error('Objection handler failed:', err);
    } finally {
      setObjectionLoading(false);
    }
  };

  const generateSchedule = async () => {
    setScheduleLoading(true);
    try {
      const res = await fetch('/api/ai/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      setContactSuggestion(data);
    } catch (err) {
      console.error('Schedule suggestion failed:', err);
    } finally {
      setScheduleLoading(false);
    }
  };

  const generateQuote = async () => {
    setQuoteLoading(true);
    try {
      const res = await fetch('/api/ai/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });
      const data = await res.json();
      setQuoteEstimate(data);
    } catch (err) {
      console.error('Quote estimate failed:', err);
    } finally {
      setQuoteLoading(false);
    }
  };

  const sendEmail = async (subject: string, body: string) => {
    setSendingEmail(true);
    setSendStatus(null);
    try {
      const res = await fetch('/api/ai/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, subject, body }),
      });
      if (res.ok) {
        setSendStatus('Email sent!');
      } else {
        const data = await res.json();
        setSendStatus(data.error || 'Failed to send');
      }
    } catch {
      setSendStatus('Failed to send email');
    } finally {
      setSendingEmail(false);
      setTimeout(() => setSendStatus(null), 3000);
    }
  };

  const sendSMS = async (message: string) => {
    setSendingSMS(true);
    setSendStatus(null);
    try {
      const res = await fetch('/api/ai/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId, message }),
      });
      if (res.ok) {
        setSendStatus('SMS sent!');
      } else {
        const data = await res.json();
        setSendStatus(data.error || 'Failed to send');
      }
    } catch {
      setSendStatus('Failed to send SMS');
    } finally {
      setSendingSMS(false);
      setTimeout(() => setSendStatus(null), 3000);
    }
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="p-1 rounded hover:bg-[var(--od-bg-elevated)] transition-colors"
      title="Copy to clipboard"
    >
      {copiedField === field ? (
        <Check className="w-3 h-3 text-[#4ADE80]" />
      ) : (
        <Copy className="w-3 h-3 text-[var(--od-text-muted)]" />
      )}
    </button>
  );

  const tools = [
    {
      id: 'follow-up',
      label: 'Draft outreach',
      icon: Mail,
      description: 'Prepare email and SMS follow-up the user can send immediately.',
      color: '#6C8EEF',
    },
    {
      id: 'objection',
      label: 'Recover objection',
      icon: ShieldAlert,
      description: 'Handle resistance, silence, or loss with a clearer recovery response.',
      color: '#F87171',
      showWhen: ['lost', 'cold', 'contacted', 'qualified'],
    },
    {
      id: 'schedule',
      label: 'Plan contact window',
      icon: Clock,
      description: 'Suggest when and how the team should reach out next.',
      color: '#60C3D0',
    },
    {
      id: 'quote',
      label: 'Build quote draft',
      icon: DollarSign,
      description: 'Generate a fast pricing range and commercial talking points.',
      color: '#4ADE80',
    },
  ];

  const visibleTools = tools.filter(
    (t) => !t.showWhen || t.showWhen.includes(leadStatus)
  );

  return (
    <div className="space-y-2">
      <div className="rounded-[20px] border border-[rgba(79,209,229,0.16)] bg-[var(--od-accent-muted)] p-4">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[var(--od-accent)]" />
          <h4 className="text-xs font-semibold text-[var(--od-accent-text)] uppercase tracking-wider">
            Agent actions
          </h4>
        </div>
        <p className="mt-2 text-sm leading-7 text-[var(--od-text-secondary)]">
          The agent should help the user act faster here: draft outreach, recover stalled deals,
          plan timing, and prepare quote guidance from the lead context.
        </p>
      </div>

      {visibleTools.map((tool) => (
        <div
          key={tool.id}
          className="overflow-hidden rounded-[20px] border border-[var(--od-border-subtle)]"
        >
          <button
            onClick={() => toggleTool(tool.id)}
            className="flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--od-bg-secondary)]"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${tool.color}15` }}
            >
              <tool.icon className="w-3.5 h-3.5" style={{ color: tool.color }} />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--od-text-primary)]">{tool.label}</p>
              <p className="text-xs text-[var(--od-text-muted)]">{tool.description}</p>
            </div>
            {expandedTool === tool.id ? (
              <ChevronUp className="w-3.5 h-3.5 text-[var(--od-text-muted)] shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[var(--od-text-muted)] shrink-0" />
            )}
          </button>

          <AnimatePresence>
            {expandedTool === tool.id && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 border-t border-[var(--od-border-subtle)]">
                  {/* Follow-Up Writer */}
                  {tool.id === 'follow-up' && (
                    <div className="pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ['initial_outreach', 'First Contact'],
                          ['quote_follow_up', 'Quote Follow-Up'],
                          ['no_response', 'No Response'],
                          ['check_in', 'Check-In'],
                        ] as [FollowUpType, string][]).map(([type, label]) => (
                          <Button
                            key={type}
                            variant="secondary"
                            size="sm"
                            className="text-[10px]"
                            onClick={() => generateFollowUp(type)}
                            disabled={followUpLoading}
                          >
                            {followUpLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            {label}
                          </Button>
                        ))}
                      </div>

                      {followUpDraft && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <div className="bg-[var(--od-bg-tertiary)] rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase">Email</span>
                              <CopyButton text={`Subject: ${followUpDraft.subject}\n\n${followUpDraft.email_body}`} field="email" />
                            </div>
                            <p className="text-[11px] font-medium text-[var(--od-accent)]">{followUpDraft.subject}</p>
                            <p className="text-xs text-[var(--od-text-secondary)] whitespace-pre-line leading-relaxed">
                              {followUpDraft.email_body}
                            </p>
                          </div>

                          <div className="bg-[var(--od-bg-tertiary)] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase">SMS</span>
                              <CopyButton text={followUpDraft.sms_body} field="sms" />
                            </div>
                            <p className="text-xs text-[var(--od-text-secondary)]">{followUpDraft.sms_body}</p>
                          </div>

                          {/* Send buttons */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 text-[10px]"
                              onClick={() => sendEmail(followUpDraft.subject, followUpDraft.email_body)}
                              disabled={sendingEmail}
                            >
                              {sendingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                              Send Email
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="flex-1 text-[10px]"
                              onClick={() => sendSMS(followUpDraft.sms_body)}
                              disabled={sendingSMS}
                            >
                              {sendingSMS ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                              Send SMS
                            </Button>
                          </div>

                          {sendStatus && (
                            <p className={`text-[10px] text-center font-medium ${sendStatus.includes('sent') ? 'text-[#4ADE80]' : 'text-[#EF6C6C]'}`}>
                              {sendStatus}
                            </p>
                          )}

                          {followUpDraft.key_points.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {followUpDraft.key_points.map((point, i) => (
                                <Badge key={i} size="sm" variant="default">{point}</Badge>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Objection Handler */}
                  {tool.id === 'objection' && (
                    <div className="pt-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {([
                          ['went_cold', 'Went Cold'],
                          ['quote_rejected', 'Quote Rejected'],
                          ['chose_competitor', 'Chose Competitor'],
                          ['budget_issue', 'Budget Issue'],
                        ] as [ObjectionContext, string][]).map(([ctx, label]) => (
                          <Button
                            key={ctx}
                            variant="secondary"
                            size="sm"
                            className="text-[10px]"
                            onClick={() => generateObjection(ctx)}
                            disabled={objectionLoading}
                          >
                            {objectionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                            {label}
                          </Button>
                        ))}
                      </div>

                      {objectionStrategy && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <div className="bg-[var(--od-bg-tertiary)] rounded-lg p-3">
                            <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase mb-1">Likely Reason</p>
                            <p className="text-xs text-[var(--od-text-secondary)]">{objectionStrategy.likely_reason}</p>
                          </div>

                          <div className="bg-[var(--od-bg-tertiary)] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase">Re-engagement Email</span>
                              <CopyButton text={objectionStrategy.re_engagement_message} field="objection-email" />
                            </div>
                            <p className="text-xs text-[var(--od-text-secondary)] whitespace-pre-line leading-relaxed">
                              {objectionStrategy.re_engagement_message}
                            </p>
                          </div>

                          <div className="bg-[var(--od-bg-tertiary)] rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase">SMS</span>
                              <CopyButton text={objectionStrategy.sms_message} field="objection-sms" />
                            </div>
                            <p className="text-xs text-[var(--od-text-secondary)]">{objectionStrategy.sms_message}</p>
                          </div>

                          <div className="bg-[#4FD1E5]/10 rounded-lg p-3">
                            <p className="text-[10px] font-semibold text-[var(--od-accent)] uppercase mb-1">Alternative Offer</p>
                            <p className="text-xs text-[var(--od-text-secondary)]">{objectionStrategy.alternative_offer}</p>
                          </div>

                          {/* Send buttons */}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 text-[10px]"
                              onClick={() => sendEmail('Following up', objectionStrategy.re_engagement_message)}
                              disabled={sendingEmail}
                            >
                              {sendingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                              Send Email
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="flex-1 text-[10px]"
                              onClick={() => sendSMS(objectionStrategy.sms_message)}
                              disabled={sendingSMS}
                            >
                              {sendingSMS ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                              Send SMS
                            </Button>
                          </div>

                          {objectionStrategy.tips.length > 0 && (
                            <div className="space-y-1">
                              {objectionStrategy.tips.map((tip, i) => (
                                <div key={i} className="flex items-start gap-2">
                                  <Lightbulb className="w-3 h-3 text-[var(--od-accent)] mt-0.5 shrink-0" />
                                  <span className="text-[11px] text-[var(--od-text-secondary)]">{tip}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Smart Scheduling */}
                  {tool.id === 'schedule' && (
                    <div className="pt-3 space-y-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={generateSchedule}
                        disabled={scheduleLoading}
                        className="w-full"
                      >
                        {scheduleLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                        Suggest Best Contact Time
                      </Button>

                      {contactSuggestion && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <div className="bg-[#60C3D0]/10 rounded-lg p-3 border border-[#60C3D0]/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-[#60C3D0]" />
                              <span className="text-sm font-semibold text-[#60C3D0]">{contactSuggestion.best_time}</span>
                            </div>
                            <p className="text-xs text-[var(--od-text-secondary)]">{contactSuggestion.reasoning}</p>
                          </div>

                          <div className="flex items-center gap-2 bg-[var(--od-bg-tertiary)] rounded-lg p-3">
                            <span className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase">Best Channel:</span>
                            <Badge size="sm" variant={contactSuggestion.channel === 'phone' ? 'success' : 'default'}>
                              {contactSuggestion.channel === 'phone' ? <Phone className="w-3 h-3" /> : contactSuggestion.channel === 'sms' ? <MessageSquare className="w-3 h-3" /> : <Mail className="w-3 h-3" />}
                              {contactSuggestion.channel}
                            </Badge>
                            <span className="text-[10px] text-[var(--od-text-muted)] ml-auto">{contactSuggestion.estimated_duration}</span>
                          </div>

                          {contactSuggestion.talking_points.length > 0 && (
                            <div className="bg-[var(--od-bg-tertiary)] rounded-lg p-3">
                              <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase mb-2">Talking Points</p>
                              <ul className="space-y-1.5">
                                {contactSuggestion.talking_points.map((point, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <span className="text-[var(--od-accent)] text-xs mt-0.5">-</span>
                                    <span className="text-xs text-[var(--od-text-secondary)]">{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Quote Estimator */}
                  {tool.id === 'quote' && (
                    <div className="pt-3 space-y-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={generateQuote}
                        disabled={quoteLoading}
                        className="w-full"
                      >
                        {quoteLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3.5 h-3.5" />}
                        Generate Quote Estimate
                      </Button>

                      {quoteEstimate && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="space-y-2"
                        >
                          <div className="bg-[#4ADE80]/10 rounded-lg p-3 border border-[#4ADE80]/20">
                            <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase mb-2">Estimated Range ({quoteEstimate.currency})</p>
                            <div className="flex items-end gap-3">
                              <div className="text-center">
                                <p className="text-[10px] text-[var(--od-text-muted)]">Low</p>
                                <p className="text-sm font-semibold text-[var(--od-text-secondary)]">
                                  ${quoteEstimate.low_range.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] text-[#4ADE80]">Likely</p>
                                <p className="text-lg font-bold text-[#4ADE80]">
                                  ${quoteEstimate.mid_range.toLocaleString()}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className="text-[10px] text-[var(--od-text-muted)]">High</p>
                                <p className="text-sm font-semibold text-[var(--od-text-secondary)]">
                                  ${quoteEstimate.high_range.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-[var(--od-text-muted)]">Confidence:</span>
                            <Badge size="sm" variant={
                              quoteEstimate.confidence === 'high' ? 'success' :
                              quoteEstimate.confidence === 'medium' ? 'warning' : 'default'
                            }>
                              {quoteEstimate.confidence}
                            </Badge>
                          </div>

                          {quoteEstimate.factors.length > 0 && (
                            <div className="bg-[var(--od-bg-tertiary)] rounded-lg p-3">
                              <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase mb-2">Price Factors</p>
                              <ul className="space-y-1">
                                {quoteEstimate.factors.map((factor, i) => (
                                  <li key={i} className="text-xs text-[var(--od-text-secondary)] flex items-start gap-2">
                                    <span className="text-[var(--od-accent)]">-</span> {factor}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {quoteEstimate.upsell_opportunities.length > 0 && (
                            <div className="bg-[var(--od-accent-muted)] rounded-lg p-3 border border-[rgba(79,209,229,0.2)]">
                              <p className="text-[10px] font-semibold text-[var(--od-accent)] uppercase mb-2">Upsell Opportunities</p>
                              <div className="flex flex-wrap gap-1">
                                {quoteEstimate.upsell_opportunities.map((opp, i) => (
                                  <Badge key={i} size="sm" variant="default">{opp}</Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          <p className="text-[10px] text-[var(--od-text-muted)] italic">{quoteEstimate.disclaimer}</p>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
