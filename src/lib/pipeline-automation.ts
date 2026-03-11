// ─── SMART PIPELINE AUTOMATION ────────────────────────────────
// Auto-progresses leads through pipeline stages based on events.
// Called from API endpoints when relevant events occur.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

interface PipelineRule {
  event: string;
  fromStatuses: string[];
  toStatus: string;
  note: string;
}

const PIPELINE_RULES: PipelineRule[] = [
  {
    event: 'quote_sent',
    fromStatuses: ['new', 'reviewed', 'contacted'],
    toStatus: 'quote_sent',
    note: 'Auto-progressed: quote was sent to lead',
  },
  {
    event: 'appointment_created',
    fromStatuses: ['new', 'reviewed'],
    toStatus: 'contacted',
    note: 'Auto-progressed: appointment was booked',
  },
  {
    event: 'appointment_completed',
    fromStatuses: ['new', 'reviewed', 'contacted'],
    toStatus: 'contacted',
    note: 'Auto-progressed: appointment was completed',
  },
  {
    event: 'lead_replied',
    fromStatuses: ['new'],
    toStatus: 'reviewed',
    note: 'Auto-progressed: lead responded',
  },
];

export async function autoPipelineProgress(
  event: string,
  leadId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const matchingRules = PIPELINE_RULES.filter((r) => r.event === event);
    if (matchingRules.length === 0) return false;

    // Get current lead status
    const { data: lead } = await supabase
      .from('leads')
      .select('status, organization_id')
      .eq('id', leadId)
      .single();

    if (!lead) return false;

    // Check org has auto-pipeline enabled
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', lead.organization_id)
      .single();

    const settings = (org?.settings as Record<string, unknown>) || {};
    // Default to enabled — opt-out rather than opt-in
    if (settings.pipeline_automation_disabled === true) return false;

    // Find first matching rule for current status
    const rule = matchingRules.find((r) => r.fromStatuses.includes(lead.status));
    if (!rule) return false;

    // Don't downgrade status (quote_sent shouldn't go back to contacted)
    const STATUS_ORDER = ['new', 'reviewed', 'contacted', 'quote_sent', 'won', 'lost'];
    const currentIdx = STATUS_ORDER.indexOf(lead.status);
    const newIdx = STATUS_ORDER.indexOf(rule.toStatus);
    if (newIdx <= currentIdx) return false;

    // Update lead status
    const { error } = await supabase
      .from('leads')
      .update({ status: rule.toStatus })
      .eq('id', leadId);

    if (error) return false;

    // Log the status change
    await supabase.from('lead_status_changes').insert({
      lead_id: leadId,
      from_status: lead.status,
      to_status: rule.toStatus,
    });

    // Add system note
    await supabase.from('lead_notes').insert({
      lead_id: leadId,
      content: rule.note,
      is_system: true,
    });

    console.log(
      `[Pipeline] Auto-progressed lead ${leadId}: ${lead.status} → ${rule.toStatus} (event: ${event})`
    );

    return true;
  } catch (error) {
    console.error('[Pipeline] Auto-progress error:', error);
    return false;
  }
}
