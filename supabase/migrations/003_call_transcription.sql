-- Add call recording transcription and AI summary fields
-- Enterprise-only feature: auto-transcribe + AI summarize recorded calls

ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS transcribed_at TIMESTAMPTZ;
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS recording_sid TEXT;

-- Also add ringing status for live call tracking
ALTER TABLE call_logs DROP CONSTRAINT IF EXISTS call_logs_status_check;
ALTER TABLE call_logs ADD CONSTRAINT call_logs_status_check
  CHECK (status IN ('ringing', 'completed', 'missed', 'voicemail', 'busy', 'failed'));
