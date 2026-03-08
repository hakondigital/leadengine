import { estimateQuote } from './ai-actions';
import type { Lead } from './database.types';

// ─── AUTOMATION PIPELINE ──────────────────────────────────────
// Runs asynchronously after a new lead is created and AI-qualified.
// Auto-generates: quote, appointment, sequence enrollment.

interface AutomationOrg {
  id: string;
  name: string;
  quote_prefix?: string;
  quote_next_number?: number;
  settings?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function runLeadAutomation(
  lead: Lead,
  org: AutomationOrg,
  supabase: any
) {
  const orgName = org.name || 'Our Team';
  const settings = (org.settings as Record<string, unknown>) || {};
  const industry = (settings.industry as string) || 'general services';

  // Run all automations in parallel — each one is independent and gracefully handles errors
  const results = await Promise.allSettled([
    autoGenerateQuote(lead, org, orgName, industry, supabase),
    autoCreateAppointment(lead, org, supabase),
    autoEnrollSequence(lead, org, supabase),
  ]);

  // Log automation results as a system note on the lead
  const completedTasks: string[] = [];
  if (results[0].status === 'fulfilled' && results[0].value) completedTasks.push('AI quote generated');
  if (results[1].status === 'fulfilled' && results[1].value) completedTasks.push('Appointment scheduled');
  if (results[2].status === 'fulfilled' && results[2].value) completedTasks.push('Follow-up sequence enrolled');

  if (completedTasks.length > 0) {
    await (supabase as any).from('lead_notes').insert({
      lead_id: lead.id,
      content: `Automation: ${completedTasks.join(', ')}`,
      is_system: true,
    });
  }
}

// ─── AUTO-GENERATE QUOTE ──────────────────────────────────────
// Uses AI to estimate pricing based on lead details, then creates a draft quote in the DB.

async function autoGenerateQuote(
  lead: Lead,
  org: AutomationOrg,
  orgName: string,
  industry: string,
  supabase: any
): Promise<boolean> {
  try {
    // Get AI price estimate
    const estimate = await estimateQuote(lead, orgName, industry);

    // Get org quote numbering
    const { data: orgData } = await supabase
      .from('organizations')
      .select('quote_prefix, quote_next_number')
      .eq('id', org.id)
      .single();

    const prefix = orgData?.quote_prefix || 'QT';
    const nextNumber = orgData?.quote_next_number || 1;
    const quoteNumber = `${prefix}-${String(nextNumber).padStart(5, '0')}`;

    // Build line item from the estimate
    const items = [
      {
        description: lead.service_type || lead.project_type || 'Service Quote',
        quantity: 1,
        unit_price: estimate.mid_range,
      },
    ];

    const subtotal = estimate.mid_range;
    const taxRate = 10; // Default GST
    const taxAmount = Math.round(subtotal * (taxRate / 100));
    const total = subtotal + taxAmount;

    // Valid for 30 days
    const validUntil = new Date(Date.now() + 30 * 86400000).toISOString();

    // Build notes with AI context
    const notes = [
      `AI-generated estimate (${estimate.confidence} confidence)`,
      `Range: $${estimate.low_range.toLocaleString()} — $${estimate.high_range.toLocaleString()}`,
      estimate.factors.length > 0 ? `Factors: ${estimate.factors.join('; ')}` : '',
      estimate.disclaimer,
    ].filter(Boolean).join('\n');

    // Insert quote
    const { error: quoteError } = await supabase
      .from('quotes')
      .insert({
        organization_id: org.id,
        lead_id: lead.id,
        quote_number: quoteNumber,
        items,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes,
        valid_until: validUntil,
        status: 'draft',
        is_ai_generated: true,
      })
      .select()
      .single();

    if (quoteError) {
      console.error('[Automation] Quote creation failed:', quoteError);
      return false;
    }

    // Increment quote number
    await supabase
      .from('organizations')
      .update({ quote_next_number: nextNumber + 1 })
      .eq('id', org.id);

    console.log(`[Automation] Auto-quote ${quoteNumber} created for lead ${lead.id}`);
    return true;
  } catch (error) {
    console.error('[Automation] Auto-quote error:', error);
    return false;
  }
}

// ─── AUTO-CREATE APPOINTMENT ──────────────────────────────────
// Creates a tentative follow-up appointment based on lead urgency and data.

async function autoCreateAppointment(
  lead: Lead,
  org: AutomationOrg,
  supabase: any
): Promise<boolean> {
  try {
    // Determine appointment timing based on urgency
    const now = new Date();
    let startTime: Date;

    switch (lead.urgency) {
      case 'asap':
      case 'emergency':
        // Next hour (round up to nearest hour)
        startTime = new Date(now);
        startTime.setHours(startTime.getHours() + 1, 0, 0, 0);
        // If after 5pm, move to next day 9am
        if (startTime.getHours() >= 17) {
          startTime.setDate(startTime.getDate() + 1);
          startTime.setHours(9, 0, 0, 0);
        }
        break;
      case 'within_week':
      case 'soon':
        // Next business day at 10am
        startTime = getNextBusinessDay(now);
        startTime.setHours(10, 0, 0, 0);
        break;
      default:
        // 2 business days out at 10am
        startTime = getNextBusinessDay(now);
        startTime = getNextBusinessDay(startTime);
        startTime.setHours(10, 0, 0, 0);
    }

    const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 min duration

    const title = `Follow-up: ${lead.first_name} ${lead.last_name}${lead.service_type ? ` — ${lead.service_type}` : ''}`;

    const description = [
      lead.ai_summary || '',
      lead.message ? `Message: "${lead.message}"` : '',
      lead.budget_range ? `Budget: ${lead.budget_range}` : '',
      `AI Score: ${lead.ai_score || 'Pending'}`,
    ].filter(Boolean).join('\n');

    const { error } = await supabase
      .from('appointments')
      .insert({
        organization_id: org.id,
        lead_id: lead.id,
        title,
        description,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        location: lead.location || null,
        assigned_to: lead.assigned_to || null,
        status: 'scheduled',
        contact_name: `${lead.first_name} ${lead.last_name}`,
        contact_email: lead.email,
        contact_phone: lead.phone || null,
        notes: `Auto-scheduled based on ${lead.urgency || 'standard'} urgency`,
      })
      .select()
      .single();

    if (error) {
      console.error('[Automation] Appointment creation failed:', error);
      return false;
    }

    console.log(`[Automation] Appointment created for lead ${lead.id} at ${startTime.toISOString()}`);
    return true;
  } catch (error) {
    console.error('[Automation] Auto-appointment error:', error);
    return false;
  }
}

// ─── AUTO-ENROLL IN SEQUENCE ──────────────────────────────────
// Finds active sequences with "new_lead" trigger and enrolls the lead.

async function autoEnrollSequence(
  lead: Lead,
  org: AutomationOrg,
  supabase: any
): Promise<boolean> {
  try {
    // Find active sequences with new_lead trigger
    const { data: sequences } = await supabase
      .from('sequences')
      .select('id')
      .eq('organization_id', org.id)
      .eq('trigger', 'new_lead')
      .eq('is_active', true);

    if (!sequences || sequences.length === 0) {
      return false; // No matching sequence — that's fine
    }

    let enrolled = false;
    for (const seq of sequences) {
      // Check not already enrolled
      const { data: existing } = await supabase
        .from('sequence_enrollments')
        .select('id')
        .eq('sequence_id', seq.id)
        .eq('lead_id', lead.id)
        .eq('status', 'active')
        .single();

      if (existing) continue;

      // Get first step for timing
      const { data: firstStep } = await supabase
        .from('sequence_steps')
        .select('*')
        .eq('sequence_id', seq.id)
        .order('step_order', { ascending: true })
        .limit(1)
        .single();

      if (!firstStep) continue;

      const nextSendAt = new Date(
        Date.now() + (firstStep.delay_hours || 0) * 3600000
      ).toISOString();

      const { error } = await supabase
        .from('sequence_enrollments')
        .insert({
          sequence_id: seq.id,
          lead_id: lead.id,
          current_step: 1,
          status: 'active',
          next_send_at: nextSendAt,
        })
        .select()
        .single();

      if (!error) enrolled = true;
    }

    if (enrolled) {
      console.log(`[Automation] Lead ${lead.id} enrolled in follow-up sequence`);
    }
    return enrolled;
  } catch (error) {
    console.error('[Automation] Auto-enroll error:', error);
    return false;
  }
}

// ─── AUTO-REVENUE FROM QUOTES ─────────────────────────────────
// When a lead is marked as 'won', calculate won_value from associated quotes.

export async function autoSetRevenueFromQuotes(
  leadId: string,
  orgId: string,
  supabase: any
): Promise<number | null> {
  try {
    // Get all accepted/sent quotes for this lead
    const { data: quotes } = await supabase
      .from('quotes')
      .select('total, status')
      .eq('lead_id', leadId)
      .eq('organization_id', orgId)
      .in('status', ['accepted', 'sent', 'draft']);

    if (!quotes || quotes.length === 0) return null;

    // Prefer accepted quotes, then sent, then draft
    const accepted = quotes.filter((q: any) => q.status === 'accepted');
    const sent = quotes.filter((q: any) => q.status === 'sent');
    const draft = quotes.filter((q: any) => q.status === 'draft');

    const relevantQuotes = accepted.length > 0 ? accepted : sent.length > 0 ? sent : draft;

    // Sum all relevant quote totals
    const totalValue = relevantQuotes.reduce((sum: number, q: any) => sum + (q.total || 0), 0);

    if (totalValue > 0) {
      // Update the lead's won_value
      await supabase
        .from('leads')
        .update({ won_value: totalValue })
        .eq('id', leadId);

      // Log it
      await supabase.from('lead_notes').insert({
        lead_id: leadId,
        content: `Revenue auto-calculated from quotes: $${totalValue.toLocaleString()}`,
        is_system: true,
      });

      console.log(`[Automation] Revenue $${totalValue} set for lead ${leadId}`);
      return totalValue;
    }

    return null;
  } catch (error) {
    console.error('[Automation] Auto-revenue error:', error);
    return null;
  }
}

// ─── HELPERS ──────────────────────────────────────────────────

function getNextBusinessDay(from: Date): Date {
  const next = new Date(from);
  next.setDate(next.getDate() + 1);
  // Skip weekends
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}
