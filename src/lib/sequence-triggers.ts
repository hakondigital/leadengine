// ─── SMART SEQUENCE TRIGGERS ──────────────────────────────────
// Automatically enrolls leads in follow-up sequences based on business events.
// Call triggerSequenceEvent() from any API endpoint to fire a trigger.

type SequenceTriggerEvent =
  | 'new_lead'
  | 'quote_sent'
  | 'appointment_completed'
  | 'no_response'
  | 'status_change'
  | 'job_completed';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function triggerSequenceEvent(
  event: SequenceTriggerEvent,
  leadId: string,
  orgId: string,
  supabase: any
): Promise<number> {
  try {
    // Map event names to DB trigger_type values
    const TRIGGER_MAP: Record<string, string> = {
      new_lead: 'lead_created',
      lead_created: 'lead_created',
      quote_sent: 'quote_sent',
      no_response: 'no_response',
      status_change: 'status_change',
      appointment_completed: 'status_change',
      job_completed: 'manual',
    };
    const dbTrigger = TRIGGER_MAP[event] || event;

    // Find active sequences matching this trigger
    const { data: sequences } = await supabase
      .from('follow_up_sequences')
      .select('id')
      .eq('organization_id', orgId)
      .eq('trigger_type', dbTrigger)
      .eq('is_active', true);

    if (!sequences || sequences.length === 0) return 0;

    let enrolledCount = 0;

    for (const seq of sequences) {
      // Don't double-enroll
      const { data: existing } = await supabase
        .from('sequence_enrollments')
        .select('id')
        .eq('sequence_id', seq.id)
        .eq('lead_id', leadId)
        .in('status', ['active', 'completed'])
        .maybeSingle();

      if (existing) continue;

      // Get first step for timing
      const { data: firstStep } = await supabase
        .from('sequence_steps')
        .select('delay_hours')
        .eq('sequence_id', seq.id)
        .order('step_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!firstStep) continue;

      const nextSendAt = new Date(
        Date.now() + (firstStep.delay_hours || 0) * 3600000
      ).toISOString();

      const { error } = await supabase
        .from('sequence_enrollments')
        .insert({
          sequence_id: seq.id,
          lead_id: leadId,
          current_step: 1,
          status: 'active',
          next_send_at: nextSendAt,
        });

      if (!error) enrolledCount++;
    }

    if (enrolledCount > 0) {
      await supabase.from('lead_notes').insert({
        lead_id: leadId,
        content: `Auto-enrolled in ${enrolledCount} follow-up sequence${enrolledCount > 1 ? 's' : ''} (trigger: ${event.replace(/_/g, ' ')})`,
        is_system: true,
      });

      console.log(`[Triggers] ${event}: enrolled lead ${leadId} in ${enrolledCount} sequence(s)`);
    }

    return enrolledCount;
  } catch (error) {
    console.error(`[Triggers] Error processing ${event} for lead ${leadId}:`, error);
    return 0;
  }
}

// ─── NO-RESPONSE CHECKER ──────────────────────────────────────
// Call this periodically (e.g. via cron) to find stale leads and enroll them.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function checkNoResponseLeads(supabase: any): Promise<number> {
  try {
    // Find all orgs with active no_response sequences
    const { data: sequences } = await supabase
      .from('follow_up_sequences')
      .select('id, organization_id, trigger_conditions')
      .eq('trigger_type', 'no_response')
      .eq('is_active', true);

    if (!sequences || sequences.length === 0) return 0;

    let totalEnrolled = 0;
    const processedOrgs = new Set<string>();

    for (const seq of sequences) {
      if (processedOrgs.has(seq.organization_id)) continue;
      processedOrgs.add(seq.organization_id);

      // Default: 7 days with no update
      const daysThreshold =
        (seq.trigger_conditions as Record<string, unknown>)?.days_no_response ?? 7;
      const cutoff = new Date(
        Date.now() - (daysThreshold as number) * 86400000
      ).toISOString();

      // Find stale leads: open status + last updated before cutoff
      const { data: staleLeads } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', seq.organization_id)
        .in('status', ['new', 'reviewed', 'contacted'])
        .lt('updated_at', cutoff)
        .limit(50);

      if (!staleLeads || staleLeads.length === 0) continue;

      for (const lead of staleLeads) {
        const count = await triggerSequenceEvent(
          'no_response',
          lead.id,
          seq.organization_id,
          supabase
        );
        totalEnrolled += count;
      }
    }

    if (totalEnrolled > 0) {
      console.log(`[Triggers] No-response check: enrolled ${totalEnrolled} lead(s)`);
    }

    return totalEnrolled;
  } catch (error) {
    console.error('[Triggers] No-response check error:', error);
    return 0;
  }
}
