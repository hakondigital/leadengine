-- Migration 002: Revenue tracking, SMS, follow-ups, Google Reviews

-- Add revenue tracking to leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_value NUMERIC(12, 2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_date TIMESTAMPTZ;

-- Add phone number to organizations (for SMS notifications)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS google_review_link TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS follow_up_enabled BOOLEAN NOT NULL DEFAULT true;

-- Follow-up reminders table
CREATE TABLE IF NOT EXISTS follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('quote_follow_up', 'no_response', 'check_in', 'review_request')),
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  message_template TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_org ON follow_up_reminders(organization_id, status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_follow_up_reminders_lead ON follow_up_reminders(lead_id);

-- SMS log table
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  sms_type TEXT NOT NULL CHECK (sms_type IN ('new_lead_alert', 'auto_reply', 'follow_up', 'review_request')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending')),
  twilio_sid TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_org ON sms_logs(organization_id, created_at DESC);

-- RLS for new tables
ALTER TABLE follow_up_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users access own org follow ups" ON follow_up_reminders
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org sms logs" ON sms_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));
