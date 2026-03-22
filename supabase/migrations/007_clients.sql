-- ═══════════════════════════════════════════════════════════════
-- 007: Client Database — contacts, companies, financials
-- ═══════════════════════════════════════════════════════════════

-- Clients table — the core contact/company record
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Contact info
  first_name TEXT NOT NULL DEFAULT '',
  last_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  company_name TEXT,
  company_abn TEXT,
  job_title TEXT,

  -- Address
  address TEXT,
  city TEXT,
  state TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'Australia',

  -- Classification
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'vip', 'archived')),
  type TEXT NOT NULL DEFAULT 'individual' CHECK (type IN ('individual', 'company')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  source TEXT, -- how they became a client (form, referral, import, etc.)

  -- Financials
  total_invoiced NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  outstanding_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  lifetime_value NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Notes & metadata
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  avatar_url TEXT,

  -- Linking
  primary_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add client_id to leads for linking
ALTER TABLE leads ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_company ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_client ON leads(client_id);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_clients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_clients_updated ON clients;
CREATE TRIGGER trg_clients_updated
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_clients_updated_at();

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY clients_org_access ON clients
  FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));

-- Client activity log (lightweight timeline entries)
CREATE TABLE IF NOT EXISTS client_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'note', 'email', 'sms', 'call', 'quote', 'job', 'payment', 'status_change'
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_activities_client ON client_activities(client_id, created_at DESC);

ALTER TABLE client_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_activities_org_access ON client_activities
  FOR ALL
  USING (organization_id IN (SELECT organization_id FROM users WHERE auth_id = auth.uid()));
