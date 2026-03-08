'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useOrganization } from '@/hooks/use-organization';
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
        enabled ? 'bg-[var(--le-accent)]' : 'bg-[var(--le-bg-muted)]'
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
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [orgName, setOrgName] = useState('');
  const [notifEmail, setNotifEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [autoReplyEnabled, setAutoReplyEnabled] = useState(true);
  const [followUpEnabled, setFollowUpEnabled] = useState(true);
  const [googleReviewLink, setGoogleReviewLink] = useState('');

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
        }),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
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
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
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
                <Building2 className="w-4 h-4 text-[var(--le-accent)]" />
                <CardTitle>Organisation</CardTitle>
              </div>
              <CardDescription>Your business details and branding</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Business Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
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
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
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
                placeholder="+61 400 000 000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                hint="Include country code for SMS delivery"
              />
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[var(--le-text-secondary)]">SMS lead alerts</span>
                  <p className="text-xs text-[var(--le-text-muted)] mt-0.5">Get a text when a new lead comes in</p>
                </div>
                <Toggle enabled={smsEnabled} onChange={setSmsEnabled} />
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
                  <span className="text-sm text-[var(--le-text-secondary)]">Smart auto-replies</span>
                  <p className="text-xs text-[var(--le-text-muted)] mt-0.5">Send AI score-based response time estimates to prospects</p>
                </div>
                <Toggle enabled={autoReplyEnabled} onChange={setAutoReplyEnabled} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-[var(--le-text-secondary)]">Follow-up reminders</span>
                  <p className="text-xs text-[var(--le-text-muted)] mt-0.5">Auto-schedule reminders for quotes and no-responses</p>
                </div>
                <Toggle enabled={followUpEnabled} onChange={setFollowUpEnabled} />
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
                  <label className="block text-sm font-medium text-[var(--le-text-secondary)]">
                    Primary Colour
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-[var(--le-radius-md)] bg-[var(--le-accent)] border border-[var(--le-border-default)]" />
                    <span className="text-sm text-[var(--le-text-tertiary)] font-mono">#4FD1E5</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[var(--le-text-secondary)]">
                    Accent Colour
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-[var(--le-radius-md)] bg-[#6C8EEF] border border-[var(--le-border-default)]" />
                    <span className="text-sm text-[var(--le-text-tertiary)] font-mono">#6C8EEF</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-[var(--le-text-muted)]">
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
                <Sparkles className="w-4 h-4 text-[var(--le-accent)]" />
                <CardTitle>AI Qualification</CardTitle>
              </div>
              <CardDescription>Configure AI lead analysis behaviour</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--le-text-secondary)]">Auto-qualify new leads</span>
                <Toggle enabled={true} onChange={() => {}} />
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-[var(--le-text-secondary)]">Include AI summary in emails</span>
                <Toggle enabled={true} onChange={() => {}} />
              </div>
              <div className="pt-2 border-t border-[var(--le-border-subtle)]">
                <p className="text-xs text-[var(--le-text-muted)]">
                  AI Provider: <span className="text-[var(--le-text-secondary)]">OpenAI GPT-4o Mini</span>
                </p>
                <p className="text-xs text-[var(--le-text-muted)] mt-0.5">
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
                { label: 'Supabase', status: 'Connected' },
                { label: 'Resend', status: 'Not configured' },
                { label: 'OpenAI', status: 'Not configured' },
                { label: 'Telnyx', status: phone && smsEnabled ? 'Configured' : 'Not configured' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-[var(--le-border-subtle)] last:border-0">
                  <span className="text-sm text-[var(--le-text-secondary)]">{item.label}</span>
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
