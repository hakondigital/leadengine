-- Odyssey Database Schema
-- Multi-tenant lead capture and qualification platform

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations (client businesses)
CREATE TABLE organizations (
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

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Users within organizations
CREATE TABLE users (
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

CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_org ON users(organization_id);

-- Leads — core entity
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- Contact
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  company TEXT,
  -- Project details
  service_type TEXT,
  project_type TEXT,
  location TEXT,
  budget_range TEXT,
  urgency TEXT,
  timeframe TEXT,
  message TEXT,
  -- Source tracking
  source TEXT NOT NULL DEFAULT 'website',
  source_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  -- Pipeline
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'contacted', 'quote_sent', 'won', 'lost')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  -- Custom fields (extensible)
  custom_fields JSONB NOT NULL DEFAULT '{}',
  -- AI analysis
  ai_summary TEXT,
  ai_priority TEXT CHECK (ai_priority IN ('critical', 'high', 'medium', 'low')),
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  ai_recommended_action TEXT,
  -- Assignment & tracking
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  last_contacted_at TIMESTAMPTZ,
  follow_up_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_org ON leads(organization_id);
CREATE INDEX idx_leads_status ON leads(organization_id, status);
CREATE INDEX idx_leads_priority ON leads(organization_id, priority);
CREATE INDEX idx_leads_created ON leads(organization_id, created_at DESC);
CREATE INDEX idx_leads_email ON leads(email);

-- Lead notes
CREATE TABLE lead_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_notes_lead ON lead_notes(lead_id, created_at DESC);

-- Lead status change audit trail
CREATE TABLE lead_status_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_changes_lead ON lead_status_changes(lead_id, created_at DESC);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6C8EEF'
);

CREATE UNIQUE INDEX idx_tags_org_name ON tags(organization_id, name);

-- Lead-Tag junction
CREATE TABLE lead_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(lead_id, tag_id)
);

-- Email logs
CREATE TABLE email_logs (
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

CREATE INDEX idx_email_logs_lead ON email_logs(lead_id);

-- AI analysis results
CREATE TABLE ai_analyses (
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

CREATE INDEX idx_ai_analyses_lead ON ai_analyses(lead_id);

-- Form configurations (white-label support)
CREATE TABLE form_configs (
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

CREATE INDEX idx_form_configs_org ON form_configs(organization_id);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_form_configs_updated_at
  BEFORE UPDATE ON form_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
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

-- RLS Policies: Users can only access data in their organization
CREATE POLICY "Users access own org" ON organizations
  FOR ALL USING (id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org users" ON users
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org leads" ON leads
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org lead notes" ON lead_notes
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

CREATE POLICY "Users access own org status changes" ON lead_status_changes
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

CREATE POLICY "Users access own org tags" ON tags
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org lead tags" ON lead_tags
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

CREATE POLICY "Users access own org email logs" ON email_logs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

CREATE POLICY "Users access own org AI analyses" ON ai_analyses
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid())));

CREATE POLICY "Users access own org form configs" ON form_configs
  FOR ALL USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

-- Public insert policy for leads (form submissions don't require auth)
CREATE POLICY "Public can submit leads" ON leads
  FOR INSERT WITH CHECK (true);

-- Public read for form configs (needed for embedded forms)
CREATE POLICY "Public can read active form configs" ON form_configs
  FOR SELECT USING (is_active = true);
