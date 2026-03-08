-- LeadEngine Enhanced Features Migration
-- Adds: Appointments, Quotes, Follow-up Sequences, Call Tracking, Inbox,
-- Reviews, Photos, Portfolios, Service Areas, Territories, Weather Campaigns,
-- Team Routing, Duplicate Detection, and more.

-- ═══════════════════════════════════════════════════════════════
-- 1. APPOINTMENTS / BOOKING
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  -- Booking details
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  location TEXT,
  -- Assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  -- External calendar sync
  google_event_id TEXT,
  -- Contact info (for walk-ins without a lead record)
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_appointments_org ON appointments(organization_id);
CREATE INDEX idx_appointments_lead ON appointments(lead_id);
CREATE INDEX idx_appointments_time ON appointments(organization_id, start_time);
CREATE INDEX idx_appointments_assigned ON appointments(assigned_to, start_time);

-- Availability slots (business hours config)
CREATE TABLE availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sun
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_availability_org ON availability_slots(organization_id);

-- ═══════════════════════════════════════════════════════════════
-- 2. QUOTES / ESTIMATES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  -- Quote details
  quote_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  -- Line items stored as JSONB array
  line_items JSONB NOT NULL DEFAULT '[]',
  -- Totals
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 10,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'AUD',
  -- Validity
  valid_until DATE,
  -- Status
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  -- Notes
  internal_notes TEXT,
  client_notes TEXT,
  terms TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotes_org ON quotes(organization_id);
CREATE INDEX idx_quotes_lead ON quotes(lead_id);
CREATE INDEX idx_quotes_status ON quotes(organization_id, status);

-- ═══════════════════════════════════════════════════════════════
-- 3. FOLLOW-UP SEQUENCES (Drip Campaigns)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE follow_up_sequences (
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

CREATE INDEX idx_sequences_org ON follow_up_sequences(organization_id);

CREATE TABLE sequence_steps (
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

CREATE INDEX idx_steps_sequence ON sequence_steps(sequence_id, step_order);

CREATE TABLE sequence_enrollments (
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

CREATE INDEX idx_enrollments_next ON sequence_enrollments(next_send_at) WHERE status = 'active';
CREATE INDEX idx_enrollments_lead ON sequence_enrollments(lead_id);

CREATE TABLE sequence_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error TEXT
);

-- ═══════════════════════════════════════════════════════════════
-- 4. CALL TRACKING
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE tracking_numbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  forward_to TEXT NOT NULL,
  label TEXT NOT NULL,
  source TEXT, -- e.g., 'google_ads', 'facebook', 'website_header'
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tracking_numbers_org ON tracking_numbers(organization_id);
CREATE INDEX idx_tracking_numbers_phone ON tracking_numbers(phone_number);

CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tracking_number_id UUID REFERENCES tracking_numbers(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  -- Call details
  caller_number TEXT NOT NULL,
  called_number TEXT NOT NULL,
  forwarded_to TEXT,
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'missed', 'voicemail', 'busy', 'failed')),
  duration_seconds INTEGER DEFAULT 0,
  recording_url TEXT,
  -- Twilio/provider data
  provider_sid TEXT,
  -- Timestamps
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_call_logs_org ON call_logs(organization_id, started_at DESC);
CREATE INDEX idx_call_logs_lead ON call_logs(lead_id);

-- ═══════════════════════════════════════════════════════════════
-- 5. MULTI-CHANNEL INBOX MESSAGES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE inbox_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  -- Message details
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'chat', 'phone', 'form', 'whatsapp')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  sender_name TEXT,
  sender_contact TEXT, -- email or phone
  subject TEXT,
  body TEXT NOT NULL,
  -- Status
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  -- Metadata
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inbox_org ON inbox_messages(organization_id, created_at DESC);
CREATE INDEX idx_inbox_lead ON inbox_messages(lead_id, created_at DESC);
CREATE INDEX idx_inbox_unread ON inbox_messages(organization_id, is_read) WHERE is_read = false;

-- ═══════════════════════════════════════════════════════════════
-- 6. REVIEWS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  -- Request details
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'both')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'clicked', 'completed', 'declined')),
  review_link TEXT,
  sent_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  -- Schedule
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_requests_org ON review_requests(organization_id);
CREATE INDEX idx_review_requests_status ON review_requests(status) WHERE status = 'pending';

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  -- Review content
  platform TEXT NOT NULL DEFAULT 'internal' CHECK (platform IN ('google', 'internal', 'facebook', 'other')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  reviewer_name TEXT NOT NULL,
  reviewer_email TEXT,
  -- Video review
  video_url TEXT,
  video_thumbnail_url TEXT,
  -- Display
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_org ON reviews(organization_id);
CREATE INDEX idx_reviews_featured ON reviews(organization_id, is_featured) WHERE is_featured = true;

-- ═══════════════════════════════════════════════════════════════
-- 7. JOB PHOTOS / ATTACHMENTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE lead_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- File info
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image/jpeg', 'image/png', 'application/pdf', etc.
  file_size INTEGER, -- bytes
  -- Classification
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'job_photo', 'before', 'after', 'document', 'quote', 'invoice')),
  -- AI analysis
  ai_description TEXT,
  ai_job_type TEXT,
  ai_urgency TEXT,
  ai_tags JSONB NOT NULL DEFAULT '[]',
  -- Display
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attachments_lead ON lead_attachments(lead_id);
CREATE INDEX idx_attachments_org ON lead_attachments(organization_id);

-- ═══════════════════════════════════════════════════════════════
-- 8. BEFORE/AFTER PORTFOLIO
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE portfolio_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  -- Project details
  title TEXT NOT NULL,
  description TEXT,
  service_type TEXT,
  location TEXT,
  postcode TEXT,
  completion_date DATE,
  -- Photos
  before_photos JSONB NOT NULL DEFAULT '[]', -- array of { url, caption }
  after_photos JSONB NOT NULL DEFAULT '[]',
  -- Display
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_portfolio_org ON portfolio_projects(organization_id);
CREATE INDEX idx_portfolio_published ON portfolio_projects(organization_id, is_published) WHERE is_published = true;
CREATE INDEX idx_portfolio_postcode ON portfolio_projects(organization_id, postcode);

-- ═══════════════════════════════════════════════════════════════
-- 9. SERVICE AREAS & TERRITORIES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE service_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Area definition
  postcodes TEXT[] NOT NULL DEFAULT '{}',
  suburbs TEXT[] NOT NULL DEFAULT '{}',
  -- Radius-based (lat/lng + km)
  center_lat DECIMAL(10,7),
  center_lng DECIMAL(10,7),
  radius_km DECIMAL(8,2),
  -- Assignment
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  auto_reject_outside BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_areas_org ON service_areas(organization_id);

-- Territory routing rules
CREATE TABLE territory_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_area_id UUID NOT NULL REFERENCES service_areas(id) ON DELETE CASCADE,
  -- Routing config
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_email TEXT,
  notification_phone TEXT,
  priority INTEGER NOT NULL DEFAULT 0, -- higher = checked first
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_territory_rules_org ON territory_rules(organization_id);

-- ═══════════════════════════════════════════════════════════════
-- 10. TEAM ASSIGNMENT RULES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE assignment_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Rule conditions
  rule_type TEXT NOT NULL CHECK (rule_type IN ('round_robin', 'service_type', 'location', 'budget', 'source', 'availability')),
  conditions JSONB NOT NULL DEFAULT '{}',
  -- Target
  assigned_user_ids UUID[] NOT NULL DEFAULT '{}',
  -- Round robin state
  last_assigned_index INTEGER NOT NULL DEFAULT 0,
  -- Priority & status
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignment_rules_org ON assignment_rules(organization_id);

-- ═══════════════════════════════════════════════════════════════
-- 11. BALLPARK ESTIMATOR CONFIG
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE estimator_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  -- Price ranges
  min_price DECIMAL(12,2) NOT NULL,
  max_price DECIMAL(12,2) NOT NULL,
  unit TEXT NOT NULL DEFAULT 'job', -- 'job', 'hour', 'sqm', 'metre'
  currency TEXT NOT NULL DEFAULT 'AUD',
  -- Display text
  display_text TEXT, -- e.g., "A typical kitchen reno costs..."
  factors TEXT[] NOT NULL DEFAULT '{}', -- factors that affect price
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_estimator_org ON estimator_configs(organization_id);

-- ═══════════════════════════════════════════════════════════════
-- 12. WEATHER CAMPAIGNS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE weather_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- Trigger conditions
  weather_trigger TEXT NOT NULL CHECK (weather_trigger IN ('storm', 'heavy_rain', 'heatwave', 'cold_snap', 'high_wind', 'hail')),
  min_severity TEXT NOT NULL DEFAULT 'moderate' CHECK (min_severity IN ('mild', 'moderate', 'severe')),
  target_postcodes TEXT[] NOT NULL DEFAULT '{}',
  -- Campaign content
  email_subject TEXT,
  email_body TEXT,
  sms_body TEXT,
  -- Target audience
  target_statuses TEXT[] NOT NULL DEFAULT '{won}', -- past customers
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  cooldown_hours INTEGER NOT NULL DEFAULT 168, -- 1 week
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_weather_campaigns_org ON weather_campaigns(organization_id);

CREATE TABLE weather_campaign_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES weather_campaigns(id) ON DELETE CASCADE,
  leads_targeted INTEGER NOT NULL DEFAULT 0,
  leads_contacted INTEGER NOT NULL DEFAULT 0,
  weather_data JSONB NOT NULL DEFAULT '{}',
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- 13. SMS LOGS (if not already created)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recipient_phone TEXT NOT NULL,
  message TEXT NOT NULL,
  sms_type TEXT NOT NULL DEFAULT 'general',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending', 'delivered')),
  twilio_sid TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_logs_org ON sms_logs(organization_id);
CREATE INDEX idx_sms_logs_lead ON sms_logs(lead_id);

-- ═══════════════════════════════════════════════════════════════
-- 14. DUPLICATE TRACKING
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE duplicate_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  original_lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  duplicate_lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  match_type TEXT NOT NULL CHECK (match_type IN ('email', 'phone', 'name_location', 'auto', 'manual')),
  confidence DECIMAL(5,2) NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'flagged' CHECK (status IN ('flagged', 'confirmed', 'dismissed', 'merged')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_duplicates_org ON duplicate_leads(organization_id);
CREATE INDEX idx_duplicates_original ON duplicate_leads(original_lead_id);
CREATE INDEX idx_duplicates_status ON duplicate_leads(status) WHERE status = 'flagged';

-- ═══════════════════════════════════════════════════════════════
-- 15. LEAD IMPORT HISTORY
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE import_logs (
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

CREATE INDEX idx_import_logs_org ON import_logs(organization_id);

-- ═══════════════════════════════════════════════════════════════
-- 16. ADD NEW COLUMNS TO EXISTING TABLES
-- ═══════════════════════════════════════════════════════════════

-- Add UTM tracking fields to leads (some may already exist)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_term TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm_content TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer_url TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_page TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS postcode TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN NOT NULL DEFAULT false;

-- Add org-level feature flags
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

-- Add team member specific fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_leads_per_day INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS specializations TEXT[] NOT NULL DEFAULT '{}';

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_sequences_updated_at
  BEFORE UPDATE ON follow_up_sequences FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_portfolio_updated_at
  BEFORE UPDATE ON portfolio_projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_assignment_rules_updated_at
  BEFORE UPDATE ON assignment_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_weather_campaigns_updated_at
  BEFORE UPDATE ON weather_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════
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
ALTER TABLE duplicate_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: org-scoped access
CREATE POLICY "Users access own org appointments" ON appointments
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org availability" ON availability_slots
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org quotes" ON quotes
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org sequences" ON follow_up_sequences
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org sequence steps" ON sequence_steps
  FOR ALL USING (sequence_id IN (SELECT id FROM follow_up_sequences WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

CREATE POLICY "Users access own org enrollments" ON sequence_enrollments
  FOR ALL USING (sequence_id IN (SELECT id FROM follow_up_sequences WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

CREATE POLICY "Users access own org sequence logs" ON sequence_logs
  FOR ALL USING (enrollment_id IN (SELECT id FROM sequence_enrollments WHERE sequence_id IN (SELECT id FROM follow_up_sequences WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()))));

CREATE POLICY "Users access own org tracking numbers" ON tracking_numbers
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org call logs" ON call_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org inbox" ON inbox_messages
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org review requests" ON review_requests
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org reviews" ON reviews
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org attachments" ON lead_attachments
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org portfolio" ON portfolio_projects
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org service areas" ON service_areas
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org territory rules" ON territory_rules
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org assignment rules" ON assignment_rules
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org estimator configs" ON estimator_configs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org weather campaigns" ON weather_campaigns
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org weather logs" ON weather_campaign_logs
  FOR ALL USING (campaign_id IN (SELECT id FROM weather_campaigns WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

CREATE POLICY "Users access own org sms logs" ON sms_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org duplicates" ON duplicate_leads
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org imports" ON import_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

-- Public policies for customer-facing features
CREATE POLICY "Public can book appointments" ON appointments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can submit reviews" ON reviews
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view published portfolio" ON portfolio_projects
  FOR SELECT USING (is_published = true);

CREATE POLICY "Public can view featured reviews" ON reviews
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Public can upload attachments" ON lead_attachments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view estimator configs" ON estimator_configs
  FOR SELECT USING (is_active = true);
