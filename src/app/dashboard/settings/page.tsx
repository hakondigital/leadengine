'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/hooks/use-organization';
import { useToast } from '@/components/ui/toast';
import {
  Building2,
  Palette,
  Key,
  Save,
  Sparkles,
  Phone,
  MessageSquare,
  Star,
  Loader2,
  CheckCircle2,
  Users,
  Zap,
  Target,
  Ghost,
  Calendar,
  RotateCcw,
  Sun,
  Shield,
  PhoneMissed,
} from 'lucide-react';

function Toggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={`w-10 h-5 rounded-full transition-colors relative ${
        enabled ? 'bg-[var(--od-accent)]' : 'bg-[var(--od-bg-muted)]'
      }`}
    >
      <div
        className={`w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export default function SettingsPage() {
  const { organization, loading } = useOrganization();
  const { success, error: showError } = useToast();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoQualify, setAutoQualify] = useState(true);
  const [aiEmailSummary, setAiEmailSummary] = useState(true);

  // Form state
  const [orgName, setOrgName] = useState('');
  const [notifEmail, setNotifEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [followUpEnabled, setFollowUpEnabled] = useState(true);
  const [googleReviewLink, setGoogleReviewLink] = useState('');
  const [assignmentMode, setAssignmentMode] = useState('manual');
  const [autoAssignEnabled, setAutoAssignEnabled] = useState(false);
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotGreeting, setChatbotGreeting] = useState('');
  const [chatbotHours, setChatbotHours] = useState('');
  const [chatbotServices, setChatbotServices] = useState('');
  const [chatbotInstructions, setChatbotInstructions] = useState('');

  // Automation settings
  const [gamePlanEnabled, setGamePlanEnabled] = useState(true);
  const [revenueGapEnabled, setRevenueGapEnabled] = useState(true);
  const [monthlyTarget, setMonthlyTarget] = useState('20000');
  const [ghostRecoveryEnabled, setGhostRecoveryEnabled] = useState(true);
  const [lifecycleEnabled, setLifecycleEnabled] = useState(true);
  const [lifecycleCheckIn, setLifecycleCheckIn] = useState(true);
  const [lifecycleReview, setLifecycleReview] = useState(true);
  const [lifecycleReferral, setLifecycleReferral] = useState(true);
  const [lifecycleCrossSell, setLifecycleCrossSell] = useState(true);
  const [lifecycleMaintenance, setLifecycleMaintenance] = useState(false);
  const [meetingBriefingEnabled, setMeetingBriefingEnabled] = useState(true);

  // New feature settings
  const [morningBriefingEnabled, setMorningBriefingEnabled] = useState(true);
  const [morningBriefingSms, setMorningBriefingSms] = useState(true);
  const [credibilityPackageEnabled, setCredibilityPackageEnabled] = useState(true);
  const [reviewScore, setReviewScore] = useState('');
  const [licenseInfo, setLicenseInfo] = useState('');
  const [missedCallSmsEnabled, setMissedCallSmsEnabled] = useState(true);
  const [missedCallSmsMessage, setMissedCallSmsMessage] = useState('');
  const [outboundChannel, setOutboundChannel] = useState<'sms' | 'email'>('email');

  // Integration statuses (fetched from server)
  const [integrationStatus, setIntegrationStatus] = useState<Record<string, boolean | string>>({});

  useEffect(() => {
    fetch('/api/integrations/status')
      .then((res) => res.json())
      .then((data) => setIntegrationStatus(data))
      .catch(() => {});
  }, []);

  // Populate form when org loads
  useEffect(() => {
    if (organization) {
      setOrgName(organization.name || '');
      setNotifEmail(organization.notification_email || '');
      setPhone(organization.phone || '');
      setSmsEnabled(organization.sms_notifications_enabled ?? false);
      setAutoReplyEnabled(organization.auto_reply_enabled ?? true);
      setFollowUpEnabled(organization.follow_up_enabled ?? true);
      setGoogleReviewLink(organization.google_review_link || '');
      const settings = (organization.settings as Record<string, unknown>) || {};
      setAssignmentMode((settings.assignment_mode as string) || 'manual');
      setAutoAssignEnabled(!!(settings.auto_assign_enabled));
      setChatbotEnabled(settings.chatbot_enabled !== false);
      setChatbotGreeting((settings.chatbot_greeting as string) || '');
      setChatbotHours((settings.chatbot_hours as string) || '');
      setChatbotServices((settings.chatbot_services as string) || '');
      setChatbotInstructions((settings.chatbot_instructions as string) || '');
      // Automation settings
      setGamePlanEnabled(settings.game_plan_enabled !== false);
      setRevenueGapEnabled(settings.revenue_gap_enabled !== false);
      setMonthlyTarget(String((settings.monthly_revenue_target as number) || 20000));
      setGhostRecoveryEnabled(settings.ghost_recovery_enabled !== false);
      setLifecycleEnabled(settings.post_job_lifecycle_enabled !== false);
      setLifecycleCheckIn(settings.lifecycle_check_in_enabled !== false);
      setLifecycleReview(settings.lifecycle_review_request_enabled !== false);
      setLifecycleReferral(settings.lifecycle_referral_ask_enabled !== false);
      setLifecycleCrossSell(settings.lifecycle_cross_sell_enabled !== false);
      setLifecycleMaintenance(!!(settings.lifecycle_maintenance_enabled));
      setMeetingBriefingEnabled(settings.meeting_briefing_enabled !== false);
      // New features
      setMorningBriefingEnabled(settings.morning_briefing_enabled !== false);
      setMorningBriefingSms(settings.morning_briefing_sms !== false);
      setCredibilityPackageEnabled(settings.credibility_package_enabled !== false);
      setReviewScore((settings.review_score as string) || '');
      setLicenseInfo((settings.license_info as string) || '');
      setMissedCallSmsEnabled(settings.missed_call_sms_enabled !== false);
      setMissedCallSmsMessage((settings.missed_call_sms_message as string) || '');
      setOutboundChannel((settings.outbound_channel as 'sms' | 'email') || 'email');
    }
  }, [organization]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          notification_email: notifEmail,
          phone: phone || null,
          sms_notifications_enabled: smsEnabled,
          auto_reply_enabled: autoReplyEnabled,
          follow_up_enabled: followUpEnabled,
          google_review_link: googleReviewLink || null,
          settings_update: {
            assignment_mode: assignmentMode,
            auto_assign_enabled: autoAssignEnabled,
            chatbot_enabled: chatbotEnabled,
            chatbot_greeting: chatbotGreeting || null,
            chatbot_hours: chatbotHours || null,
            chatbot_services: chatbotServices || null,
            chatbot_instructions: chatbotInstructions || null,
            // Automation settings
            game_plan_enabled: gamePlanEnabled,
            revenue_gap_enabled: revenueGapEnabled,
            monthly_revenue_target: parseInt(monthlyTarget, 10) || 20000,
            ghost_recovery_enabled: ghostRecoveryEnabled,
            post_job_lifecycle_enabled: lifecycleEnabled,
            lifecycle_check_in_enabled: lifecycleCheckIn,
            lifecycle_review_request_enabled: lifecycleReview,
            lifecycle_referral_ask_enabled: lifecycleReferral,
            lifecycle_cross_sell_enabled: lifecycleCrossSell,
            lifecycle_maintenance_enabled: lifecycleMaintenance,
            meeting_briefing_enabled: meetingBriefingEnabled,
            // New features
            morning_briefing_enabled: morningBriefingEnabled,
            morning_briefing_sms: morningBriefingSms,
            credibility_package_enabled: credibilityPackageEnabled,
            review_score: reviewScore || null,
            license_info: licenseInfo || null,
            missed_call_sms_enabled: missedCallSmsEnabled,
            missed_call_sms_message: missedCallSmsMessage || null,
            outbound_channel: outboundChannel,
          },
        }),
      });

      if (res.ok) {
        setSaved(true);
        success('Settings saved successfully');
        setTimeout(() => setSaved(false), 3000);
      } else {
        showError('Failed to save settings');
      }
    } catch {
      showError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
          <div className="px-4 lg:px-6 py-4">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-64 mt-1" />
          </div>
        </header>
        <div className="px-4 lg:px-6 py-6 max-w-2xl space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
            Configure your workspace and integrations
          </p>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 max-w-2xl space-y-6">
        {/* Organisation */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--od-accent)]" />
                <CardTitle>Organisation</CardTitle>
              </div>
              <CardDescription>Your business details and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div data-tour="business-name">
                <Input
                  label="Business Name"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <Input
                label="Notification Email"
                type="email"
                value={notifEmail}
                onChange={(e) => setNotifEmail(e.target.value)}
                hint="New lead notifications will be sent here"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* SMS & Phone */}
        <motion.div data-tour="sms-notifications" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#4ADE80]" />
                <CardTitle>SMS Notifications</CardTitle>
              </div>
              <CardDescription>Get instant lead alerts via text message</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Mobile Number"
                type="tel"
                placeholder="0400 000 000"
                value={phone}
                onChange={(e) => {
                  let val = e.target.value.replace(/[^\d+\s]/g, '');
                  setPhone(val);
                }}
                onBlur={() => {
                  // Auto-format: if starts with 0, convert to +61
                  let cleaned = phone.replace(/\s/g, '');
                  if (cleaned.startsWith('0') && cleaned.length >= 10) {
                    cleaned = '+61' + cleaned.slice(1);
                    setPhone(cleaned);
                  }
                }}
                hint="Australian numbers starting with 0 are auto-converted to +61"
              />
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[var(--od-text-secondary)]">SMS lead alerts</span>
                  <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Get a text when a new lead comes in</p>
                </div>
                <Toggle enabled={smsEnabled} onChange={setSmsEnabled} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Outbound Communication Channel */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#A78BFA]" />
                <CardTitle>Outbound Communication</CardTitle>
              </div>
              <CardDescription>How automated messages (follow-ups, review requests, sequences) are sent to your leads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setOutboundChannel('email')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                    outboundChannel === 'email'
                      ? 'border-[var(--od-accent)] bg-[var(--od-accent-muted)] ring-1 ring-[var(--od-accent)]'
                      : 'border-[var(--od-border-subtle)] hover:border-[var(--od-accent)]/30'
                  }`}
                >
                  <Sparkles className={`w-5 h-5 ${outboundChannel === 'email' ? 'text-[var(--od-accent)]' : 'text-[var(--od-text-muted)]'}`} />
                  <div className="text-center">
                    <p className={`text-sm font-medium ${outboundChannel === 'email' ? 'text-[var(--od-accent)]' : 'text-[var(--od-text-secondary)]'}`}>
                      Email Only
                    </p>
                    <p className="text-[10px] text-[var(--od-text-muted)] mt-0.5 leading-tight">
                      Use your existing phone number. All automated outreach sent via email.
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setOutboundChannel('sms')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                    outboundChannel === 'sms'
                      ? 'border-[var(--od-accent)] bg-[var(--od-accent-muted)] ring-1 ring-[var(--od-accent)]'
                      : 'border-[var(--od-border-subtle)] hover:border-[var(--od-accent)]/30'
                  }`}
                >
                  <Phone className={`w-5 h-5 ${outboundChannel === 'sms' ? 'text-[var(--od-accent)]' : 'text-[var(--od-text-muted)]'}`} />
                  <div className="text-center">
                    <p className={`text-sm font-medium ${outboundChannel === 'sms' ? 'text-[var(--od-accent)]' : 'text-[var(--od-text-secondary)]'}`}>
                      SMS + Email
                    </p>
                    <p className="text-[10px] text-[var(--od-text-muted)] mt-0.5 leading-tight">
                      Requires a tracking number. Automated texts sent from your business number.
                    </p>
                  </div>
                </button>
              </div>
              <div className={`p-3 rounded-lg text-[10px] leading-relaxed ${
                outboundChannel === 'email'
                  ? 'bg-[rgba(91,141,239,0.06)] border border-[rgba(91,141,239,0.12)] text-[var(--od-accent)]'
                  : 'bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.12)] text-[#4ADE80]'
              }`}>
                {outboundChannel === 'email' ? (
                  <><strong>Email Only mode:</strong> Follow-ups, review requests, and sequences will be sent via email. No need to purchase a tracking number — keep using your existing phone number on your website and cards.</>
                ) : (
                  <><strong>SMS + Email mode:</strong> Automated messages will be sent via SMS from your provisioned tracking number, with email as a backup. Go to Call Tracking to purchase a number if you haven&apos;t already.</>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Smart Features */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#6C8EEF]" />
                <CardTitle>Smart Automation</CardTitle>
              </div>
              <CardDescription>AI-powered follow-ups and auto-responses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[var(--od-text-secondary)]">Smart auto-replies</span>
                  <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Send AI score-based response time estimates to prospects</p>
                </div>
                <Toggle enabled={autoReplyEnabled} onChange={setAutoReplyEnabled} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[var(--od-text-secondary)]">Follow-up reminders</span>
                  <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Auto-schedule reminders for quotes and no-responses</p>
                </div>
                <Toggle enabled={followUpEnabled} onChange={setFollowUpEnabled} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Automation Suite */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#F59E0B]" />
                <CardTitle>AI Automation Suite</CardTitle>
              </div>
              <CardDescription>Intelligent automations that help you close more deals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Daily Game Plan */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[var(--od-text-secondary)]">Daily Game Plan</span>
                  <p className="text-xs text-[var(--od-text-muted)] mt-0.5">AI-prioritised daily action list on your dashboard</p>
                </div>
                <Toggle enabled={gamePlanEnabled} onChange={setGamePlanEnabled} />
              </div>

              {/* Revenue Gap Closer */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[var(--od-text-secondary)]">Revenue Gap Closer</span>
                  <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Track progress toward your monthly revenue target</p>
                </div>
                <Toggle enabled={revenueGapEnabled} onChange={setRevenueGapEnabled} />
              </div>

              {revenueGapEnabled && (
                <div className="ml-4 pl-3 border-l-2 border-[var(--od-border-subtle)]">
                  <label className="block text-sm font-medium text-[var(--od-text-secondary)] mb-1.5">
                    Monthly Revenue Target
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--od-text-muted)]">$</span>
                    <input
                      type="number"
                      value={monthlyTarget}
                      onChange={(e) => setMonthlyTarget(e.target.value)}
                      placeholder="20000"
                      className="w-32 h-9 px-3 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                    />
                    <span className="text-xs text-[var(--od-text-muted)]">/ month</span>
                  </div>
                </div>
              )}

              {/* Smart Ghost Recovery */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <div>
                    <span className="text-sm text-[var(--od-text-secondary)]">Smart Ghost Recovery</span>
                    <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Auto-detects silent leads and escalates: email (5d) → SMS (10d) → flags for manual call (15d)</p>
                  </div>
                </div>
                <Toggle enabled={ghostRecoveryEnabled} onChange={setGhostRecoveryEnabled} />
              </div>

              {/* Meeting Briefing */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[var(--od-text-secondary)]">Pre-Meeting Briefing</span>
                  <p className="text-xs text-[var(--od-text-muted)] mt-0.5">AI talking points and conversation history before appointments</p>
                </div>
                <Toggle enabled={meetingBriefingEnabled} onChange={setMeetingBriefingEnabled} />
              </div>

              {/* Morning Briefing */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <div>
                    <span className="text-sm text-[var(--od-text-secondary)]">Morning Briefing</span>
                    <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Daily email + SMS at 6:30am with overnight leads, appointments, hot leads, and expiring quotes</p>
                  </div>
                </div>
                <Toggle enabled={morningBriefingEnabled} onChange={setMorningBriefingEnabled} />
              </div>

              {morningBriefingEnabled && (
                <div className="ml-4 pl-3 border-l-2 border-[var(--od-border-subtle)]">
                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <span className="text-sm text-[var(--od-text-secondary)]">Also send via SMS</span>
                      <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Get a concise text summary alongside the email</p>
                    </div>
                    <Toggle enabled={morningBriefingSms} onChange={setMorningBriefingSms} />
                  </div>
                </div>
              )}

              {/* Missed Call Auto-SMS */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <PhoneMissed className="w-3.5 h-3.5 text-[#E8636C]" />
                  <div>
                    <span className="text-sm text-[var(--od-text-secondary)]">Missed Call Auto-SMS</span>
                    <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Auto-text callers when you miss their call with an apology and booking link</p>
                  </div>
                </div>
                <Toggle enabled={missedCallSmsEnabled} onChange={setMissedCallSmsEnabled} />
              </div>

              {missedCallSmsEnabled && (
                <div className="ml-4 pl-3 border-l-2 border-[var(--od-border-subtle)]">
                  <label className="block text-sm font-medium text-[var(--od-text-secondary)] mb-1.5">
                    Custom SMS Message <span className="text-xs text-[var(--od-text-muted)] font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={missedCallSmsMessage}
                    onChange={(e) => setMissedCallSmsMessage(e.target.value)}
                    placeholder="Leave blank for default: 'Sorry we missed your call! Book a time here...'"
                    rows={2}
                    className="w-full px-3 py-2 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)] resize-none"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-[var(--od-border-subtle)]">
                <p className="text-xs text-[var(--od-text-muted)]">
                  Requires AI API key (OpenAI or Anthropic) for full functionality.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Post-Job Lifecycle */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.115 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#4ADE80]" />
                <CardTitle>Post-Job Lifecycle</CardTitle>
              </div>
              <CardDescription>Automated follow-ups after completing a job — reviews, referrals, and repeat business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[var(--od-text-secondary)]">Enable post-job lifecycle</span>
                  <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Automatically follow up after marking a lead as Won</p>
                </div>
                <Toggle enabled={lifecycleEnabled} onChange={setLifecycleEnabled} />
              </div>

              {lifecycleEnabled && (
                <div className="ml-4 pl-3 border-l-2 border-[var(--od-border-subtle)] space-y-2">
                  <p className="text-xs font-medium text-[var(--od-text-tertiary)] uppercase tracking-wider mb-2">
                    Lifecycle stages
                  </p>

                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <span className="text-sm text-[var(--od-text-secondary)]">Day 1 — Check-in</span>
                      <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Quick message to make sure everything looks good</p>
                    </div>
                    <Toggle enabled={lifecycleCheckIn} onChange={setLifecycleCheckIn} />
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <span className="text-sm text-[var(--od-text-secondary)]">Day 3 — Review request</span>
                      <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Ask for a Google review at peak satisfaction</p>
                    </div>
                    <Toggle enabled={lifecycleReview} onChange={setLifecycleReview} />
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <span className="text-sm text-[var(--od-text-secondary)]">Day 14 — Referral ask</span>
                      <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Ask if they know anyone who needs similar work</p>
                    </div>
                    <Toggle enabled={lifecycleReferral} onChange={setLifecycleReferral} />
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <span className="text-sm text-[var(--od-text-secondary)]">Day 30 — Cross-sell</span>
                      <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Suggest related services they might need</p>
                    </div>
                    <Toggle enabled={lifecycleCrossSell} onChange={setLifecycleCrossSell} />
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <div>
                      <span className="text-sm text-[var(--od-text-secondary)]">Seasonal — Maintenance</span>
                      <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Periodic maintenance reminders based on service type</p>
                    </div>
                    <Toggle enabled={lifecycleMaintenance} onChange={setLifecycleMaintenance} />
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-[var(--od-border-subtle)]">
                <p className="text-xs text-[var(--od-text-muted)]">
                  Messages are AI-generated and personalised. Each stage can be individually toggled.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Team & Assignment */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#8B5CF6]" />
                <CardTitle>Team & Lead Assignment</CardTitle>
              </div>
              <CardDescription>Control how new leads are assigned to your team</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--od-text-secondary)] mb-1.5">
                  Assignment Mode
                </label>
                <select
                  value={assignmentMode}
                  onChange={(e) => setAssignmentMode(e.target.value)}
                  className="w-full h-9 px-3 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                >
                  <option value="manual">Manual — assign leads yourself</option>
                  <option value="round_robin">Round Robin — distribute evenly across team</option>
                  <option value="service_match">Service Match — assign by specialisation</option>
                </select>
                <p className="text-xs text-[var(--od-text-muted)] mt-1">
                  {assignmentMode === 'manual' && 'You manually assign each lead to a team member.'}
                  {assignmentMode === 'round_robin' && 'New leads are automatically distributed evenly across available team members.'}
                  {assignmentMode === 'service_match' && 'Leads are matched to team members based on their service specialisations.'}
                </p>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[var(--od-text-secondary)]">Auto-assign new leads</span>
                  <p className="text-xs text-[var(--od-text-muted)] mt-0.5">
                    Automatically assign leads when they come in
                  </p>
                </div>
                <Toggle enabled={autoAssignEnabled} onChange={setAutoAssignEnabled} />
              </div>

              <div className="pt-2 border-t border-[var(--od-border-subtle)]">
                <a
                  href="/dashboard/tools/routing"
                  className="text-xs text-[var(--od-accent)] hover:underline"
                >
                  Advanced team routing rules &rarr;
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Chat Widget */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#4FD1E5]" />
                <CardTitle>AI Chat Widget</CardTitle>
              </div>
              <CardDescription>Configure the chatbot that appears on your public forms and booking pages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[var(--od-text-secondary)]">Enable chat widget</span>
                  <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Show a floating chat bubble on your public pages</p>
                </div>
                <Toggle enabled={chatbotEnabled} onChange={setChatbotEnabled} />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--od-text-secondary)] mb-1.5">
                  Greeting Message
                </label>
                <input
                  type="text"
                  value={chatbotGreeting}
                  onChange={(e) => setChatbotGreeting(e.target.value)}
                  placeholder="Hi there! How can we help you today?"
                  className="w-full h-9 px-3 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--od-text-secondary)] mb-1.5">
                  Business Hours
                </label>
                <input
                  type="text"
                  value={chatbotHours}
                  onChange={(e) => setChatbotHours(e.target.value)}
                  placeholder="e.g. Mon–Fri 8am–5pm, Sat 9am–1pm"
                  className="w-full h-9 px-3 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                />
                <p className="text-xs text-[var(--od-text-muted)] mt-1">The chatbot will tell visitors your hours if they ask</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--od-text-secondary)] mb-1.5">
                  Services Offered
                </label>
                <textarea
                  value={chatbotServices}
                  onChange={(e) => setChatbotServices(e.target.value)}
                  placeholder="e.g. Solar panel installation, battery storage, EV charger installation, solar maintenance plans"
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)] resize-none"
                />
                <p className="text-xs text-[var(--od-text-muted)] mt-1">Comma-separated list of your services — the chatbot will reference these</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--od-text-secondary)] mb-1.5">
                  Custom Instructions
                </label>
                <textarea
                  value={chatbotInstructions}
                  onChange={(e) => setChatbotInstructions(e.target.value)}
                  placeholder="e.g. We service the greater Sydney area. Typical installation takes 1-2 days. We offer free site assessments. Mention our current promotion: 10% off battery bundles."
                  rows={4}
                  className="w-full px-3 py-2 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)] resize-none"
                />
                <p className="text-xs text-[var(--od-text-muted)] mt-1">Anything else you want the chatbot to know — FAQs, pricing ranges, service areas, promotions, etc.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Google Reviews */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[#F0A030]" />
                <CardTitle>Google Reviews</CardTitle>
              </div>
              <CardDescription>Automatically prompt happy clients for reviews</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Google Review Link"
                type="url"
                placeholder="https://g.page/r/your-business/review"
                value={googleReviewLink}
                onChange={(e) => setGoogleReviewLink(e.target.value)}
                hint="When a lead is marked as Won, we'll send a review request after 7 days"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Credibility Package */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#4ADE80]" />
                <CardTitle>Instant Credibility Package</CardTitle>
              </div>
              <CardDescription>Auto-send a trust-building email to new leads with your reviews, license info, and booking link</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[var(--od-text-secondary)]">Enable credibility package</span>
                  <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Sends 2 minutes after the confirmation email</p>
                </div>
                <Toggle enabled={credibilityPackageEnabled} onChange={setCredibilityPackageEnabled} />
              </div>

              {credibilityPackageEnabled && (
                <div className="space-y-4 pt-2 border-t border-[var(--od-border-subtle)]">
                  <div>
                    <label className="block text-sm font-medium text-[var(--od-text-secondary)] mb-1.5">
                      Google Review Score
                    </label>
                    <input
                      type="text"
                      value={reviewScore}
                      onChange={(e) => setReviewScore(e.target.value)}
                      placeholder="e.g. 4.9"
                      className="w-32 h-9 px-3 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                    />
                    <p className="text-xs text-[var(--od-text-muted)] mt-1">Displayed prominently in the credibility email</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--od-text-secondary)] mb-1.5">
                      License / Insurance Info
                    </label>
                    <input
                      type="text"
                      value={licenseInfo}
                      onChange={(e) => setLicenseInfo(e.target.value)}
                      placeholder="e.g. Licensed Electrician #12345 — Fully Insured"
                      className="w-full h-9 px-3 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                    />
                    <p className="text-xs text-[var(--od-text-muted)] mt-1">Shows your credentials to build trust instantly</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Branding */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#A78BFA]" />
                <CardTitle>Branding</CardTitle>
              </div>
              <CardDescription>Customise your form and email appearance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[var(--od-text-secondary)]">
                    Primary Colour
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-[var(--od-radius-md)] bg-[var(--od-accent)] border border-[var(--od-border-default)]" />
                    <span className="text-sm text-[var(--od-text-tertiary)] font-mono">#4FD1E5</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[var(--od-text-secondary)]">
                    Accent Colour
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-[var(--od-radius-md)] bg-[#6C8EEF] border border-[var(--od-border-default)]" />
                    <span className="text-sm text-[var(--od-text-tertiary)] font-mono">#6C8EEF</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[var(--od-text-muted)]">
                Colour customisation is available on Pro plans.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Settings */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--od-accent)]" />
                <CardTitle>AI Qualification</CardTitle>
              </div>
              <CardDescription>Configure AI lead analysis behaviour</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--od-text-secondary)]">Auto-qualify new leads</span>
                <Toggle enabled={autoQualify} onChange={setAutoQualify} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--od-text-secondary)]">Include AI summary in emails</span>
                <Toggle enabled={aiEmailSummary} onChange={setAiEmailSummary} />
              </div>
              <div className="pt-2 border-t border-[var(--od-border-subtle)]">
                <p className="text-xs text-[var(--od-text-muted)]">
                  AI Provider: <span className="text-[var(--od-text-secondary)]">OpenAI GPT-4o Mini</span>
                </p>
                <p className="text-xs text-[var(--od-text-muted)] mt-0.5">
                  Fallback: Rule-based qualification (no API key needed)
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* API Keys */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-[#EF6C6C]" />
                <CardTitle>API Keys</CardTitle>
              </div>
              <CardDescription>Manage your integration credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: 'Supabase', status: integrationStatus.supabase ? 'Connected' : 'Not configured' },
                { label: 'Resend', status: integrationStatus.resend ? 'Configured' : 'Not configured' },
                { label: integrationStatus.ai_provider === 'anthropic' ? 'Anthropic' : 'OpenAI', status: (integrationStatus.openai || integrationStatus.anthropic) ? 'Configured' : 'Not configured' },
                { label: 'Twilio', status: integrationStatus.twilio ? 'Configured' : 'Not configured' },
                { label: 'Stripe', status: integrationStatus.stripe ? 'Configured' : 'Not configured' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-[var(--od-border-subtle)] last:border-0">
                  <span className="text-sm text-[var(--od-text-secondary)]">{item.label}</span>
                  <Badge
                    variant={item.status === 'Connected' || item.status === 'Configured' ? 'success' : 'default'}
                    size="sm"
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Save button */}
        <div className="sticky bottom-4 flex justify-end">
          <Button size="lg" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
