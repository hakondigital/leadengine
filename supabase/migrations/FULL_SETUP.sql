-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  LeadEngine — Complete Database Setup                       ║
-- ║  Run this ONCE in Supabase SQL Editor                       ║
-- ║  (Dashboard → SQL Editor → New query → Paste → Run)         ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════
-- CORE TABLES (from 001_initial_schema)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  industry TEXT,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#E8A84C',
  accent_color TEXT NOT NULL DEFAULT '#6C8EEF',
  notification_email TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Australia/Sydney',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL UNIQUE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  service_type TEXT,
  project_type TEXT,
  location TEXT,
  budget_range TEXT,
  urgency TEXT,
  timeframe TEXT,
  message TEXT,
  source TEXT NOT NULL DEFAULT 'website',
  source_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted', 'quote_sent', 'won', 'lost')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  custom_fields JSONB NOT NULL DEFAULT '{}',
  ai_summary TEXT,
  ai_priority TEXT CHECK (ai_priority IN ('critical', 'high', 'medium', 'low')),
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  ai_recommended_action TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  last_contacted_at TIMESTAMPTZ,
  follow_up_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_org ON leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(organization_id, priority);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);

CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead ON lead_notes(lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lead_status_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_changes_lead ON lead_status_changes(lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6C8EEF'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_org_name ON tags(organization_id, name);

CREATE TABLE IF NOT EXISTS lead_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(lead_id, tag_id)
);

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL CHECK (email_type IN ('business_notification', 'prospect_confirmation', 'follow_up')),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending')),
  resend_id TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_lead ON email_logs(lead_id);

CREATE TABLE IF NOT EXISTS ai_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  urgency_assessment TEXT NOT NULL,
  quality_score INTEGER NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  recommended_action TEXT NOT NULL,
  response_channel TEXT NOT NULL,
  response_timing TEXT NOT NULL,
  missing_info_flags TEXT[] NOT NULL DEFAULT '{}',
  confidence_level INTEGER NOT NULL CHECK (confidence_level >= 0 AND confidence_level <= 100),
  raw_response JSONB NOT NULL DEFAULT '{}',
  model_used TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_analyses_lead ON ai_analyses(lead_id);

CREATE TABLE IF NOT EXISTS form_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  industry_template TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  steps JSONB NOT NULL DEFAULT '[]',
  settings JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_form_configs_org ON form_configs(organization_id);

-- ═══════════════════════════════════════════════════════════════
-- AUTO-UPDATE TIMESTAMPS
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_form_configs_updated_at ON form_configs;
CREATE TRIGGER update_form_configs_updated_at
  BEFORE UPDATE ON form_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ADDITIONAL COLUMNS ON CORE TABLES (from 002 migrations)
-- ═══════════════════════════════════════════════════════════════

-- Lead tracking fields
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_page TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_value NUMERIC(12, 2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_date TIMESTAMPTZ;

-- Organization feature flags
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS auto_reply_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS google_review_link TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS follow_up_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS booking_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS quote_prefix TEXT NOT NULL DEFAULT 'Q';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS quote_next_number INTEGER NOT NULL DEFAULT 1001;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS call_tracking_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS duplicate_detection_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS service_area_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS weather_campaigns_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS estimator_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS portfolio_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS default_assignment_rule TEXT DEFAULT 'round_robin';

-- User team fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_leads_per_day INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specializations TEXT[] NOT NULL DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════════
-- ENHANCED FEATURE TABLES
-- ═══════════════════════════════════════════════════════════════

-- 1. APPOINTMENTS
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  google_event_id TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_org ON appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lead ON appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments(organization_id, start_time);

CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 2. QUOTES
CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  quote_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  line_items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AUD',
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  internal_notes TEXT,
  client_notes TEXT,
  terms TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_org ON quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_lead ON quotes(lead_id);

-- 3. FOLLOW-UP SEQUENCES
CREATE TABLE IF NOT EXISTS follow_up_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('lead_created', 'status_change', 'no_response', 'quote_sent', 'manual')),
  trigger_conditions JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES follow_up_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_hours INTEGER NOT NULL DEFAULT 24,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'both')),
  subject_template TEXT,
  message_template TEXT NOT NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sequence_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES follow_up_sequences(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  next_send_at TIMESTAMPTZ,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(sequence_id, lead_id)
);

CREATE TABLE IF NOT EXISTS sequence_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error TEXT
);

-- 4. CALL TRACKING
CREATE TABLE IF NOT EXISTS tracking_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  forward_to TEXT NOT NULL,
  label TEXT NOT NULL,
  source TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tracking_number_id UUID REFERENCES tracking_numbers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  caller_number TEXT NOT NULL,
  called_number TEXT NOT NULL,
  forwarded_to TEXT,
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'completed',
  duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  provider_sid TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_call_logs_org ON call_logs(organization_id, started_at DESC);

-- Call transcription columns
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS transcribed_at TIMESTAMPTZ;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_sid TEXT;

-- 5. INBOX MESSAGES
CREATE TABLE IF NOT EXISTS inbox_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'chat', 'phone', 'form', 'whatsapp')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_name TEXT,
  sender_contact TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbox_org ON inbox_messages(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_lead ON inbox_messages(lead_id, created_at DESC);

-- 6. REVIEWS
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'both')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'completed', 'declined')),
  review_link TEXT,
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'internal' CHECK (platform IN ('google', 'internal', 'facebook', 'other')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT,
  video_url TEXT,
  video_thumbnail_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. ATTACHMENTS
CREATE TABLE IF NOT EXISTS lead_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'job_photo', 'before', 'after', 'document', 'quote', 'invoice')),
  ai_description TEXT,
  ai_job_type TEXT,
  ai_urgency TEXT,
  ai_tags JSONB NOT NULL DEFAULT '[]',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. PORTFOLIO
CREATE TABLE IF NOT EXISTS portfolio_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  location TEXT,
  postcode TEXT,
  completion_date DATE,
  before_photos JSONB NOT NULL DEFAULT '[]',
  after_photos JSONB NOT NULL DEFAULT '[]',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. SERVICE AREAS
CREATE TABLE IF NOT EXISTS service_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  postcodes TEXT[] NOT NULL DEFAULT '{}',
  suburbs TEXT[] NOT NULL DEFAULT '{}',
  center_lat DECIMAL(10,7),
  center_lng DECIMAL(10,7),
  radius_km DECIMAL(8,2),
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_reject_outside BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS territory_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_area_id UUID NOT NULL REFERENCES service_areas(id) ON DELETE CASCADE,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_email TEXT,
  notification_phone TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. ASSIGNMENT RULES
CREATE TABLE IF NOT EXISTS assignment_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('round_robin', 'service_type', 'location', 'budget', 'source', 'availability')),
  conditions JSONB NOT NULL DEFAULT '{}',
  assigned_user_ids UUID[] NOT NULL DEFAULT '{}',
  last_assigned_index INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. ESTIMATOR
CREATE TABLE IF NOT EXISTS estimator_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  min_price DECIMAL(12,2) NOT NULL,
  max_price DECIMAL(12,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'job',
  currency TEXT NOT NULL DEFAULT 'AUD',
  display_text TEXT,
  factors TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. WEATHER CAMPAIGNS
CREATE TABLE IF NOT EXISTS weather_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weather_trigger TEXT NOT NULL CHECK (weather_trigger IN ('storm', 'heavy_rain', 'heatwave', 'cold_snap', 'high_wind', 'hail')),
  min_severity TEXT NOT NULL DEFAULT 'moderate' CHECK (min_severity IN ('mild', 'moderate', 'severe')),
  target_postcodes TEXT[] NOT NULL DEFAULT '{}',
  email_subject TEXT,
  email_body TEXT,
  sms_body TEXT,
  target_statuses TEXT[] NOT NULL DEFAULT '{won}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  cooldown_hours INTEGER NOT NULL DEFAULT 168,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weather_campaign_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES weather_campaigns(id) ON DELETE CASCADE,
  leads_targeted INTEGER NOT NULL DEFAULT 0,
  leads_contacted INTEGER NOT NULL DEFAULT 0,
  weather_data JSONB NOT NULL DEFAULT '{}',
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. SMS LOGS
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  sms_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending',
  twilio_sid TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_org ON sms_logs(organization_id);

-- 14. FOLLOW-UP REMINDERS
CREATE TABLE IF NOT EXISTS follow_up_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  message_template TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'dismissed', 'skipped')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. DUPLICATE TRACKING
CREATE TABLE IF NOT EXISTS duplicate_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  original_lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  duplicate_lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL CHECK (match_type IN ('email', 'phone', 'name_location', 'auto', 'manual')),
  confidence DECIMAL(5,2) NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'flagged' CHECK (status IN ('flagged', 'confirmed', 'dismissed', 'merged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. IMPORT LOGS
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  imported_by UUID REFERENCES users(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  skipped_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS FOR ENHANCED TABLES
-- ═══════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_sequences_updated_at ON follow_up_sequences;
CREATE TRIGGER update_sequences_updated_at
  BEFORE UPDATE ON follow_up_sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_portfolio_updated_at ON portfolio_projects;
CREATE TRIGGER update_portfolio_updated_at
  BEFORE UPDATE ON portfolio_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_assignment_rules_updated_at ON assignment_rules;
CREATE TRIGGER update_assignment_rules_updated_at
  BEFORE UPDATE ON assignment_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_weather_campaigns_updated_at ON weather_campaigns;
CREATE TRIGGER update_weather_campaigns_updated_at
  BEFORE UPDATE ON weather_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE territory_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimator_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_campaign_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════
-- RLS POLICIES (drop first to avoid duplicates, then recreate)
-- ═══════════════════════════════════════════════════════════════

-- Core table policies
DROP POLICY IF EXISTS "Users access own org" ON organizations;
CREATE POLICY "Users access own org" ON organizations
  FOR ALL USING (id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org users" ON users;
CREATE POLICY "Users access own org users" ON users
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org leads" ON leads;
CREATE POLICY "Users access own org leads" ON leads
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Public can submit leads" ON leads;
CREATE POLICY "Public can submit leads" ON leads
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users access own org lead notes" ON lead_notes;
CREATE POLICY "Users access own org lead notes" ON lead_notes
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Users access own org status changes" ON lead_status_changes;
CREATE POLICY "Users access own org status changes" ON lead_status_changes
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Users access own org tags" ON tags;
CREATE POLICY "Users access own org tags" ON tags
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org lead tags" ON lead_tags;
CREATE POLICY "Users access own org lead tags" ON lead_tags
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Users access own org email logs" ON email_logs;
CREATE POLICY "Users access own org email logs" ON email_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org AI analyses" ON ai_analyses;
CREATE POLICY "Users access own org AI analyses" ON ai_analyses
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Users access own org form configs" ON form_configs;
CREATE POLICY "Users access own org form configs" ON form_configs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Public can read active form configs" ON form_configs;
CREATE POLICY "Public can read active form configs" ON form_configs
  FOR SELECT USING (is_active = true);

-- Enhanced table policies
DROP POLICY IF EXISTS "Users access own org appointments" ON appointments;
CREATE POLICY "Users access own org appointments" ON appointments
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Public can book appointments" ON appointments;
CREATE POLICY "Public can book appointments" ON appointments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users access own org availability" ON availability_slots;
CREATE POLICY "Users access own org availability" ON availability_slots
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org quotes" ON quotes;
CREATE POLICY "Users access own org quotes" ON quotes
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org sequences" ON follow_up_sequences;
CREATE POLICY "Users access own org sequences" ON follow_up_sequences
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org sequence steps" ON sequence_steps;
CREATE POLICY "Users access own org sequence steps" ON sequence_steps
  FOR ALL USING (sequence_id IN (SELECT id FROM follow_up_sequences WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Users access own org enrollments" ON sequence_enrollments;
CREATE POLICY "Users access own org enrollments" ON sequence_enrollments
  FOR ALL USING (sequence_id IN (SELECT id FROM follow_up_sequences WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Users access own org sequence logs" ON sequence_logs;
CREATE POLICY "Users access own org sequence logs" ON sequence_logs
  FOR ALL USING (enrollment_id IN (SELECT id FROM sequence_enrollments WHERE sequence_id IN (SELECT id FROM follow_up_sequences WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()))));

DROP POLICY IF EXISTS "Users access own org tracking numbers" ON tracking_numbers;
CREATE POLICY "Users access own org tracking numbers" ON tracking_numbers
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org call logs" ON call_logs;
CREATE POLICY "Users access own org call logs" ON call_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org inbox" ON inbox_messages;
CREATE POLICY "Users access own org inbox" ON inbox_messages
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org review requests" ON review_requests;
CREATE POLICY "Users access own org review requests" ON review_requests
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org reviews" ON reviews;
CREATE POLICY "Users access own org reviews" ON reviews
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Public can submit reviews" ON reviews;
CREATE POLICY "Public can submit reviews" ON reviews
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view featured reviews" ON reviews;
CREATE POLICY "Public can view featured reviews" ON reviews
  FOR SELECT USING (is_approved = true);

DROP POLICY IF EXISTS "Users access own org attachments" ON lead_attachments;
CREATE POLICY "Users access own org attachments" ON lead_attachments
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Public can upload attachments" ON lead_attachments;
CREATE POLICY "Public can upload attachments" ON lead_attachments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users access own org portfolio" ON portfolio_projects;
CREATE POLICY "Users access own org portfolio" ON portfolio_projects
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Public can view published portfolio" ON portfolio_projects;
CREATE POLICY "Public can view published portfolio" ON portfolio_projects
  FOR SELECT USING (is_published = true);

DROP POLICY IF EXISTS "Users access own org service areas" ON service_areas;
CREATE POLICY "Users access own org service areas" ON service_areas
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org territory rules" ON territory_rules;
CREATE POLICY "Users access own org territory rules" ON territory_rules
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org assignment rules" ON assignment_rules;
CREATE POLICY "Users access own org assignment rules" ON assignment_rules
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org estimator configs" ON estimator_configs;
CREATE POLICY "Users access own org estimator configs" ON estimator_configs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Public can view estimator configs" ON estimator_configs;
CREATE POLICY "Public can view estimator configs" ON estimator_configs
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users access own org weather campaigns" ON weather_campaigns;
CREATE POLICY "Users access own org weather campaigns" ON weather_campaigns
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org weather logs" ON weather_campaign_logs;
CREATE POLICY "Users access own org weather logs" ON weather_campaign_logs
  FOR ALL USING (campaign_id IN (SELECT id FROM weather_campaigns WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

DROP POLICY IF EXISTS "Users access own org sms logs" ON sms_logs;
CREATE POLICY "Users access own org sms logs" ON sms_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org follow ups" ON follow_up_reminders;
CREATE POLICY "Users access own org follow ups" ON follow_up_reminders
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org duplicates" ON duplicate_leads;
CREATE POLICY "Users access own org duplicates" ON duplicate_leads
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

DROP POLICY IF EXISTS "Users access own org imports" ON import_logs;
CREATE POLICY "Users access own org imports" ON import_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════
-- DONE! Now go to your live site and sign up / log in.
-- Your account will be set up automatically via /api/auth/setup.
-- ═══════════════════════════════════════════════════════════════
