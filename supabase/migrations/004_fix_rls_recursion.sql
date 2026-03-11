-- ═══════════════════════════════════════════════════════════════
-- FIX: Infinite recursion in RLS policies
--
-- Problem: Every policy does SELECT organization_id FROM users
--          which triggers the users policy, which does the same
--          query → infinite loop.
--
-- Solution: Create a SECURITY DEFINER function that bypasses RLS
--           to look up the current user's org_id, then rewrite
--           all policies to call it instead of sub-selecting users.
-- ═══════════════════════════════════════════════════════════════

-- 1) Helper function — runs as the DB owner, skips RLS
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM users WHERE auth_id = auth.uid() LIMIT 1
$$;

-- 2) Fix the users table policy (the source of the recursion)
DROP POLICY IF EXISTS "Users access own org users" ON users;
CREATE POLICY "Users access own org users" ON users
  FOR ALL USING (organization_id = get_user_org_id());

-- 3) Rewrite all other policies to use the function instead of sub-selecting users

DROP POLICY IF EXISTS "Users access own org" ON organizations;
CREATE POLICY "Users access own org" ON organizations
  FOR ALL USING (id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org leads" ON leads;
CREATE POLICY "Users access own org leads" ON leads
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org lead notes" ON lead_notes;
CREATE POLICY "Users access own org lead notes" ON lead_notes
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Users access own org status changes" ON lead_status_changes;
CREATE POLICY "Users access own org status changes" ON lead_status_changes
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Users access own org tags" ON tags;
CREATE POLICY "Users access own org tags" ON tags
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org lead tags" ON lead_tags;
CREATE POLICY "Users access own org lead tags" ON lead_tags
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Users access own org email logs" ON email_logs;
CREATE POLICY "Users access own org email logs" ON email_logs
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org AI analyses" ON ai_analyses;
CREATE POLICY "Users access own org AI analyses" ON ai_analyses
  FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Users access own org form configs" ON form_configs;
CREATE POLICY "Users access own org form configs" ON form_configs
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org appointments" ON appointments;
CREATE POLICY "Users access own org appointments" ON appointments
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org availability" ON availability_slots;
CREATE POLICY "Users access own org availability" ON availability_slots
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org quotes" ON quotes;
CREATE POLICY "Users access own org quotes" ON quotes
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org sequences" ON follow_up_sequences;
CREATE POLICY "Users access own org sequences" ON follow_up_sequences
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org sequence steps" ON sequence_steps;
CREATE POLICY "Users access own org sequence steps" ON sequence_steps
  FOR ALL USING (sequence_id IN (SELECT id FROM follow_up_sequences WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Users access own org enrollments" ON sequence_enrollments;
CREATE POLICY "Users access own org enrollments" ON sequence_enrollments
  FOR ALL USING (sequence_id IN (SELECT id FROM follow_up_sequences WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Users access own org sequence logs" ON sequence_logs;
CREATE POLICY "Users access own org sequence logs" ON sequence_logs
  FOR ALL USING (enrollment_id IN (SELECT id FROM sequence_enrollments WHERE sequence_id IN (SELECT id FROM follow_up_sequences WHERE organization_id = get_user_org_id())));

DROP POLICY IF EXISTS "Users access own org tracking numbers" ON tracking_numbers;
CREATE POLICY "Users access own org tracking numbers" ON tracking_numbers
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org call logs" ON call_logs;
CREATE POLICY "Users access own org call logs" ON call_logs
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org inbox" ON inbox_messages;
CREATE POLICY "Users access own org inbox" ON inbox_messages
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org review requests" ON review_requests;
CREATE POLICY "Users access own org review requests" ON review_requests
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org reviews" ON reviews;
CREATE POLICY "Users access own org reviews" ON reviews
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org attachments" ON lead_attachments;
CREATE POLICY "Users access own org attachments" ON lead_attachments
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org portfolio" ON portfolio_projects;
CREATE POLICY "Users access own org portfolio" ON portfolio_projects
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org service areas" ON service_areas;
CREATE POLICY "Users access own org service areas" ON service_areas
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org territory rules" ON territory_rules;
CREATE POLICY "Users access own org territory rules" ON territory_rules
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org assignment rules" ON assignment_rules;
CREATE POLICY "Users access own org assignment rules" ON assignment_rules
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org estimator configs" ON estimator_configs;
CREATE POLICY "Users access own org estimator configs" ON estimator_configs
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org weather campaigns" ON weather_campaigns;
CREATE POLICY "Users access own org weather campaigns" ON weather_campaigns
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org weather logs" ON weather_campaign_logs;
CREATE POLICY "Users access own org weather logs" ON weather_campaign_logs
  FOR ALL USING (campaign_id IN (SELECT id FROM weather_campaigns WHERE organization_id = get_user_org_id()));

DROP POLICY IF EXISTS "Users access own org sms logs" ON sms_logs;
CREATE POLICY "Users access own org sms logs" ON sms_logs
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org follow ups" ON follow_up_reminders;
CREATE POLICY "Users access own org follow ups" ON follow_up_reminders
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org duplicates" ON duplicate_leads;
CREATE POLICY "Users access own org duplicates" ON duplicate_leads
  FOR ALL USING (organization_id = get_user_org_id());

DROP POLICY IF EXISTS "Users access own org imports" ON import_logs;
CREATE POLICY "Users access own org imports" ON import_logs
  FOR ALL USING (organization_id = get_user_org_id());

-- ═══════════════════════════════════════════════════════════════
-- NOTE: Public policies (public lead submit, public form read, etc.)
-- are NOT touched — they don't reference users so they're fine.
-- ═══════════════════════════════════════════════════════════════
