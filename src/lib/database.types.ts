// Database schema types — Odyssey
// Designed for extensibility, multi-tenancy, and white-labelling

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organization, 'id'>>;
      };
      users: {
        Row: User;
        Insert: Omit<User, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<User, 'id'>>;
      };
      leads: {
        Row: Lead;
        Insert: Omit<Lead, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Lead, 'id'>>;
      };
      lead_notes: {
        Row: LeadNote;
        Insert: Omit<LeadNote, 'id' | 'created_at'>;
        Update: Partial<Omit<LeadNote, 'id'>>;
      };
      lead_status_changes: {
        Row: LeadStatusChange;
        Insert: Omit<LeadStatusChange, 'id' | 'created_at'>;
        Update: never;
      };
      lead_tags: {
        Row: LeadTag;
        Insert: Omit<LeadTag, 'id'>;
        Update: never;
      };
      tags: {
        Row: Tag;
        Insert: Omit<Tag, 'id'>;
        Update: Partial<Omit<Tag, 'id'>>;
      };
      email_logs: {
        Row: EmailLog;
        Insert: Omit<EmailLog, 'id' | 'created_at'>;
        Update: Partial<Omit<EmailLog, 'id'>>;
      };
      ai_analyses: {
        Row: AIAnalysis;
        Insert: Omit<AIAnalysis, 'id' | 'created_at'>;
        Update: Partial<Omit<AIAnalysis, 'id'>>;
      };
      form_configs: {
        Row: FormConfig;
        Insert: Omit<FormConfig, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<FormConfig, 'id'>>;
      };
      // --- New tables from 002_enhanced_features ---
      appointments: {
        Row: Appointment;
        Insert: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Appointment, 'id'>>;
      };
      availability_slots: {
        Row: AvailabilitySlot;
        Insert: Omit<AvailabilitySlot, 'id'>;
        Update: Partial<Omit<AvailabilitySlot, 'id'>>;
      };
      quotes: {
        Row: Quote;
        Insert: Omit<Quote, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Quote, 'id'>>;
      };
      follow_up_sequences: {
        Row: FollowUpSequence;
        Insert: Omit<FollowUpSequence, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<FollowUpSequence, 'id'>>;
      };
      sequence_steps: {
        Row: SequenceStep;
        Insert: Omit<SequenceStep, 'id' | 'created_at'>;
        Update: Partial<Omit<SequenceStep, 'id'>>;
      };
      sequence_enrollments: {
        Row: SequenceEnrollment;
        Insert: Omit<SequenceEnrollment, 'id' | 'enrolled_at'>;
        Update: Partial<Omit<SequenceEnrollment, 'id'>>;
      };
      sequence_logs: {
        Row: SequenceLog;
        Insert: Omit<SequenceLog, 'id' | 'sent_at'>;
        Update: Partial<Omit<SequenceLog, 'id'>>;
      };
      tracking_numbers: {
        Row: TrackingNumber;
        Insert: Omit<TrackingNumber, 'id' | 'created_at'>;
        Update: Partial<Omit<TrackingNumber, 'id'>>;
      };
      call_logs: {
        Row: CallLog;
        Insert: Omit<CallLog, 'id' | 'started_at'>;
        Update: Partial<Omit<CallLog, 'id'>>;
      };
      inbox_messages: {
        Row: InboxMessage;
        Insert: Omit<InboxMessage, 'id' | 'created_at'>;
        Update: Partial<Omit<InboxMessage, 'id'>>;
      };
      review_requests: {
        Row: ReviewRequest;
        Insert: Omit<ReviewRequest, 'id' | 'created_at'>;
        Update: Partial<Omit<ReviewRequest, 'id'>>;
      };
      reviews: {
        Row: Review;
        Insert: Omit<Review, 'id' | 'created_at'>;
        Update: Partial<Omit<Review, 'id'>>;
      };
      lead_attachments: {
        Row: LeadAttachment;
        Insert: Omit<LeadAttachment, 'id' | 'created_at'>;
        Update: Partial<Omit<LeadAttachment, 'id'>>;
      };
      portfolio_projects: {
        Row: PortfolioProject;
        Insert: Omit<PortfolioProject, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<PortfolioProject, 'id'>>;
      };
      service_areas: {
        Row: ServiceArea;
        Insert: Omit<ServiceArea, 'id' | 'created_at'>;
        Update: Partial<Omit<ServiceArea, 'id'>>;
      };
      territory_rules: {
        Row: TerritoryRule;
        Insert: Omit<TerritoryRule, 'id' | 'created_at'>;
        Update: Partial<Omit<TerritoryRule, 'id'>>;
      };
      assignment_rules: {
        Row: AssignmentRule;
        Insert: Omit<AssignmentRule, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AssignmentRule, 'id'>>;
      };
      estimator_configs: {
        Row: EstimatorConfig;
        Insert: Omit<EstimatorConfig, 'id' | 'created_at'>;
        Update: Partial<Omit<EstimatorConfig, 'id'>>;
      };
      weather_campaigns: {
        Row: WeatherCampaign;
        Insert: Omit<WeatherCampaign, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WeatherCampaign, 'id'>>;
      };
      weather_campaign_logs: {
        Row: WeatherCampaignLog;
        Insert: Omit<WeatherCampaignLog, 'id' | 'triggered_at'>;
        Update: Partial<Omit<WeatherCampaignLog, 'id'>>;
      };
      sms_logs: {
        Row: SmsLog;
        Insert: Omit<SmsLog, 'id' | 'created_at'>;
        Update: Partial<Omit<SmsLog, 'id'>>;
      };
      duplicate_leads: {
        Row: DuplicateLead;
        Insert: Omit<DuplicateLead, 'id' | 'created_at'>;
        Update: Partial<Omit<DuplicateLead, 'id'>>;
      };
      import_logs: {
        Row: ImportLog;
        Insert: Omit<ImportLog, 'id' | 'created_at'>;
        Update: Partial<Omit<ImportLog, 'id'>>;
      };
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// Organization / workspace — the client business
// ═══════════════════════════════════════════════════════════════
export interface Organization {
  id: string;
  name: string;
  slug: string;
  industry: string | null;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  notification_email: string;
  phone: string | null;
  sms_notifications_enabled: boolean;
  auto_reply_enabled: boolean;
  google_review_link: string | null;
  follow_up_enabled: boolean;
  booking_enabled: boolean;
  quote_prefix: string;
  quote_next_number: number;
  chat_enabled: boolean;
  call_tracking_enabled: boolean;
  duplicate_detection_enabled: boolean;
  service_area_enabled: boolean;
  weather_campaigns_enabled: boolean;
  estimator_enabled: boolean;
  portfolio_enabled: boolean;
  default_assignment_rule: string | null;
  timezone: string;
  settings: Json;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════
// User within an organization
// ═══════════════════════════════════════════════════════════════
export interface User {
  id: string;
  auth_id: string;
  organization_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'member';
  phone: string | null;
  job_title: string | null;
  max_leads_per_day: number | null;
  is_available: boolean;
  specializations: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════
// Core lead record
// ═══════════════════════════════════════════════════════════════
export interface Lead {
  id: string;
  organization_id: string;
  // Contact info
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  company: string | null;
  // Project details
  service_type: string | null;
  project_type: string | null;
  location: string | null;
  budget_range: string | null;
  urgency: string | null;
  timeframe: string | null;
  message: string | null;
  // Metadata
  source: string;
  source_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referrer_url: string | null;
  landing_page: string | null;
  device_type: string | null;
  ip_address: string | null;
  postcode: string | null;
  is_duplicate: boolean;
  // Pipeline
  status: LeadStatus;
  priority: LeadPriority;
  // Custom fields
  custom_fields: Json;
  // AI
  ai_summary: string | null;
  ai_priority: LeadPriority | null;
  ai_score: number | null;
  ai_recommended_action: string | null;
  // Revenue tracking
  won_value: number | null;
  won_date: string | null;
  // Tracking
  assigned_to: string | null;
  last_contacted_at: string | null;
  follow_up_date: string | null;
  // Ghost recovery
  ghost_recovery_stage?: number | null;
  created_at: string;
  updated_at: string;
}

export type LeadStatus = 'new' | 'reviewed' | 'contacted' | 'quote_sent' | 'won' | 'lost';
export type LeadPriority = 'critical' | 'high' | 'medium' | 'low';

// ═══════════════════════════════════════════════════════════════
// Internal notes on leads
// ═══════════════════════════════════════════════════════════════
export interface LeadNote {
  id: string;
  lead_id: string;
  user_id: string | null;
  content: string;
  is_system: boolean;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// Status change audit trail
// ═══════════════════════════════════════════════════════════════
export interface LeadStatusChange {
  id: string;
  lead_id: string;
  user_id: string | null;
  from_status: LeadStatus | null;
  to_status: LeadStatus;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// Tags
// ═══════════════════════════════════════════════════════════════
export interface Tag {
  id: string;
  organization_id: string;
  name: string;
  color: string;
}

export interface LeadTag {
  id: string;
  lead_id: string;
  tag_id: string;
}

// ═══════════════════════════════════════════════════════════════
// Email logs
// ═══════════════════════════════════════════════════════════════
export interface EmailLog {
  id: string;
  lead_id: string;
  organization_id: string;
  email_type: 'business_notification' | 'prospect_confirmation' | 'follow_up';
  recipient_email: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  resend_id: string | null;
  error: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// AI analysis results
// ═══════════════════════════════════════════════════════════════
export interface AIAnalysis {
  id: string;
  lead_id: string;
  summary: string;
  priority: LeadPriority;
  urgency_assessment: string;
  quality_score: number; // 0-100
  recommended_action: string;
  response_channel: string;
  response_timing: string;
  missing_info_flags: string[];
  confidence_level: number; // 0-100
  raw_response: Json;
  model_used: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// Form configuration for white-labelling
// ═══════════════════════════════════════════════════════════════
export interface FormConfig {
  id: string;
  organization_id: string;
  name: string;
  industry_template: string | null;
  fields: FormField[];
  steps: FormStep[];
  settings: FormSettings;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'budget_range' | 'date';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: { label: string; value: string }[];
  validation?: { pattern?: string; min?: number; max?: number };
  conditional?: { field: string; value: string };
  mapTo?: string; // maps to a lead field
  step: number;
}

export interface FormStep {
  id: number;
  title: string;
  description?: string;
}

export interface FormSettings {
  submitButtonText: string;
  successTitle: string;
  successMessage: string;
  showProgressBar: boolean;
  accentColor: string;
  enableAntiSpam: boolean;
}

// ═══════════════════════════════════════════════════════════════
// Follow-up reminders (original table)
// ═══════════════════════════════════════════════════════════════
export interface FollowUpReminder {
  id: string;
  lead_id: string;
  organization_id: string;
  reminder_type: string;
  scheduled_for: string;
  message_template: string | null;
  status: 'pending' | 'sent' | 'dismissed';
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 1. APPOINTMENTS / BOOKING
// ═══════════════════════════════════════════════════════════════
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: string;
  organization_id: string;
  lead_id: string | null;
  // Booking details
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  // Assignment
  assigned_to: string | null;
  // Status
  status: AppointmentStatus;
  // External calendar sync
  google_event_id: string | null;
  // Contact info (for walk-ins without a lead record)
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  id: string;
  organization_id: string;
  user_id: string | null;
  day_of_week: number; // 0=Sun, 6=Sat
  start_time: string; // TIME as string
  end_time: string;   // TIME as string
  is_active: boolean;
}

// ═══════════════════════════════════════════════════════════════
// 2. QUOTES / ESTIMATES
// ═══════════════════════════════════════════════════════════════
export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Quote {
  id: string;
  organization_id: string;
  lead_id: string;
  // Quote details
  quote_number: string;
  title: string;
  description: string | null;
  // Line items stored as JSONB array
  line_items: Json;
  // Totals
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  // Validity
  valid_until: string | null;
  // Status
  status: QuoteStatus;
  sent_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  // Notes
  internal_notes: string | null;
  client_notes: string | null;
  terms: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 3. FOLLOW-UP SEQUENCES (Drip Campaigns)
// ═══════════════════════════════════════════════════════════════
export type SequenceTriggerType = 'lead_created' | 'status_change' | 'no_response' | 'quote_sent' | 'manual';
export type SequenceChannel = 'email' | 'sms' | 'both';
export type EnrollmentStatus = 'active' | 'completed' | 'paused' | 'cancelled';
export type SequenceLogStatus = 'sent' | 'failed' | 'skipped';

export interface FollowUpSequence {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  trigger_type: SequenceTriggerType;
  trigger_conditions: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  step_order: number;
  delay_hours: number;
  channel: SequenceChannel;
  subject_template: string | null;
  message_template: string;
  is_ai_generated: boolean;
  created_at: string;
}

export interface SequenceEnrollment {
  id: string;
  sequence_id: string;
  lead_id: string;
  current_step: number;
  status: EnrollmentStatus;
  next_send_at: string | null;
  enrolled_at: string;
  completed_at: string | null;
}

export interface SequenceLog {
  id: string;
  enrollment_id: string;
  step_id: string;
  channel: string;
  status: SequenceLogStatus;
  sent_at: string;
  error: string | null;
}

// ═══════════════════════════════════════════════════════════════
// 4. CALL TRACKING
// ═══════════════════════════════════════════════════════════════
export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'completed' | 'missed' | 'voicemail' | 'busy' | 'failed';

export interface TrackingNumber {
  id: string;
  organization_id: string;
  phone_number: string;
  forward_to: string;
  label: string;
  source: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CallLog {
  id: string;
  organization_id: string;
  tracking_number_id: string | null;
  lead_id: string | null;
  // Call details
  caller_number: string;
  called_number: string;
  forwarded_to: string | null;
  direction: CallDirection;
  status: CallStatus;
  duration_seconds: number | null;
  recording_url: string | null;
  // Provider data
  provider_sid: string | null;
  // Timestamps
  started_at: string;
  ended_at: string | null;
}

// ═══════════════════════════════════════════════════════════════
// 5. MULTI-CHANNEL INBOX MESSAGES
// ═══════════════════════════════════════════════════════════════
export type InboxChannel = 'email' | 'sms' | 'chat' | 'phone' | 'form' | 'whatsapp';
export type MessageDirection = 'inbound' | 'outbound';

export interface InboxMessage {
  id: string;
  organization_id: string;
  lead_id: string | null;
  // Message details
  channel: InboxChannel;
  direction: MessageDirection;
  sender_name: string | null;
  sender_contact: string | null;
  subject: string | null;
  body: string;
  // Status
  is_read: boolean;
  is_archived: boolean;
  // Metadata
  metadata: Json;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 6. REVIEWS
// ═══════════════════════════════════════════════════════════════
export type ReviewRequestChannel = 'email' | 'sms' | 'both';
export type ReviewRequestStatus = 'pending' | 'sent' | 'clicked' | 'completed' | 'declined';
export type ReviewPlatform = 'google' | 'internal' | 'facebook' | 'other';

export interface ReviewRequest {
  id: string;
  organization_id: string;
  lead_id: string;
  // Request details
  channel: ReviewRequestChannel;
  status: ReviewRequestStatus;
  review_link: string | null;
  sent_at: string | null;
  clicked_at: string | null;
  // Schedule
  scheduled_for: string;
  created_at: string;
}

export interface Review {
  id: string;
  organization_id: string;
  lead_id: string | null;
  // Review content
  platform: ReviewPlatform;
  rating: number | null;
  review_text: string | null;
  reviewer_name: string;
  reviewer_email: string | null;
  // Video review
  video_url: string | null;
  video_thumbnail_url: string | null;
  // Display
  is_featured: boolean;
  is_approved: boolean;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 7. JOB PHOTOS / ATTACHMENTS
// ═══════════════════════════════════════════════════════════════
export type AttachmentCategory = 'general' | 'job_photo' | 'before' | 'after' | 'document' | 'quote' | 'invoice';

export interface LeadAttachment {
  id: string;
  lead_id: string;
  organization_id: string;
  // File info
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number | null;
  // Classification
  category: AttachmentCategory;
  // AI analysis
  ai_description: string | null;
  ai_job_type: string | null;
  ai_urgency: string | null;
  ai_tags: Json;
  // Display
  sort_order: number;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 8. BEFORE/AFTER PORTFOLIO
// ═══════════════════════════════════════════════════════════════
export interface PortfolioPhoto {
  url: string;
  caption?: string;
}

export interface PortfolioProject {
  id: string;
  organization_id: string;
  lead_id: string | null;
  // Project details
  title: string;
  description: string | null;
  service_type: string | null;
  location: string | null;
  postcode: string | null;
  completion_date: string | null;
  // Photos
  before_photos: Json; // array of { url, caption }
  after_photos: Json;  // array of { url, caption }
  // Display
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 9. SERVICE AREAS & TERRITORIES
// ═══════════════════════════════════════════════════════════════
export interface ServiceArea {
  id: string;
  organization_id: string;
  name: string;
  // Area definition
  postcodes: string[];
  suburbs: string[];
  // Radius-based
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
  // Assignment
  assigned_to: string | null;
  // Settings
  is_active: boolean;
  auto_reject_outside: boolean;
  created_at: string;
}

export interface TerritoryRule {
  id: string;
  organization_id: string;
  service_area_id: string;
  // Routing config
  assigned_user_id: string | null;
  notification_email: string | null;
  notification_phone: string | null;
  priority: number;
  is_active: boolean;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 10. TEAM ASSIGNMENT RULES
// ═══════════════════════════════════════════════════════════════
export type AssignmentRuleType = 'round_robin' | 'service_type' | 'location' | 'budget' | 'source' | 'availability';

export interface AssignmentRule {
  id: string;
  organization_id: string;
  name: string;
  // Rule conditions
  rule_type: AssignmentRuleType;
  conditions: Json;
  // Target
  assigned_user_ids: string[];
  // Round robin state
  last_assigned_index: number;
  // Priority & status
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 11. BALLPARK ESTIMATOR CONFIG
// ═══════════════════════════════════════════════════════════════
export interface EstimatorConfig {
  id: string;
  organization_id: string;
  service_type: string;
  // Price ranges
  min_price: number;
  max_price: number;
  unit: string; // 'job', 'hour', 'sqm', 'metre'
  currency: string;
  // Display text
  display_text: string | null;
  factors: string[];
  is_active: boolean;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 12. WEATHER CAMPAIGNS
// ═══════════════════════════════════════════════════════════════
export type WeatherTrigger = 'storm' | 'heavy_rain' | 'heatwave' | 'cold_snap' | 'high_wind' | 'hail';
export type WeatherSeverity = 'mild' | 'moderate' | 'severe';

export interface WeatherCampaign {
  id: string;
  organization_id: string;
  name: string;
  // Trigger conditions
  weather_trigger: WeatherTrigger;
  min_severity: WeatherSeverity;
  target_postcodes: string[];
  // Campaign content
  email_subject: string | null;
  email_body: string | null;
  sms_body: string | null;
  // Target audience
  target_statuses: string[];
  // Status
  is_active: boolean;
  last_triggered_at: string | null;
  cooldown_hours: number;
  created_at: string;
  updated_at: string;
}

export interface WeatherCampaignLog {
  id: string;
  campaign_id: string;
  leads_targeted: number;
  leads_contacted: number;
  weather_data: Json;
  triggered_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 13. SMS LOGS
// ═══════════════════════════════════════════════════════════════
export type SmsStatus = 'sent' | 'failed' | 'pending' | 'delivered';

export interface SmsLog {
  id: string;
  lead_id: string | null;
  organization_id: string;
  recipient_phone: string;
  message: string;
  sms_type: string;
  status: SmsStatus;
  twilio_sid: string | null;
  error: string | null;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 14. DUPLICATE TRACKING
// ═══════════════════════════════════════════════════════════════
export type DuplicateMatchType = 'email' | 'phone' | 'name_location' | 'auto' | 'manual';
export type DuplicateStatus = 'flagged' | 'confirmed' | 'dismissed' | 'merged';

export interface DuplicateLead {
  id: string;
  organization_id: string;
  original_lead_id: string;
  duplicate_lead_id: string;
  match_type: DuplicateMatchType;
  confidence: number;
  status: DuplicateStatus;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// 15. LEAD IMPORT HISTORY
// ═══════════════════════════════════════════════════════════════
export type ImportStatus = 'processing' | 'completed' | 'failed';

export interface ImportLog {
  id: string;
  organization_id: string;
  imported_by: string | null;
  file_name: string;
  total_rows: number;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  errors: Json;
  status: ImportStatus;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// Utility types for the frontend
// ═══════════════════════════════════════════════════════════════
export type LeadWithRelations = Lead & {
  notes?: LeadNote[];
  tags?: (LeadTag & { tag: Tag })[];
  ai_analysis?: AIAnalysis | null;
  status_changes?: LeadStatusChange[];
  reminders?: FollowUpReminder[];
  attachments?: LeadAttachment[];
  appointments?: Appointment[];
  quotes?: Quote[];
  inbox_messages?: InboxMessage[];
  call_logs?: CallLog[];
  reviews?: Review[];
  duplicates?: DuplicateLead[];
};
