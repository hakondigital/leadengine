-- 006: Add enabled_addons column for marketplace system
-- Stores array of add-on IDs that the organization has enabled

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS enabled_addons TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN organizations.enabled_addons IS 'Array of marketplace add-on IDs enabled for this org';
