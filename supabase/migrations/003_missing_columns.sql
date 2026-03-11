-- Odyssey Migration 003 — Fix missing columns and constraints
-- Run this in Supabase SQL editor

-- ─── LEADS: add won_value and won_date ────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_value DECIMAL(12,2) DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS won_date TIMESTAMPTZ;

-- ─── SEQUENCE ENROLLMENTS: add last_sent_at ───────────────────
ALTER TABLE sequence_enrollments ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;

-- ─── QUOTES: make lead_id nullable (standalone quotes) ────────
ALTER TABLE quotes ALTER COLUMN lead_id DROP NOT NULL;

-- ─── ORGANIZATIONS: add quote counters if missing ─────────────
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS quote_prefix TEXT DEFAULT 'QT';
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS quote_next_number INTEGER DEFAULT 1;
