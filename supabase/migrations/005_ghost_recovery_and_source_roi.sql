-- Ghost Recovery: track which stage of recovery each lead is in
-- 0 = not started, 1 = email sent, 2 = SMS sent, 3 = flagged for manual call
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ghost_recovery_stage INTEGER DEFAULT 0;

-- Index for ghost recovery cron (find stale leads quickly)
CREATE INDEX IF NOT EXISTS idx_leads_ghost_recovery
  ON leads (organization_id, status, updated_at)
  WHERE status IN ('contacted', 'quoted');
