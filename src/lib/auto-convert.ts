// Auto-convert leads to clients based on AI buying signal detection.
// Called after inbound messages, quote changes, and appointment completions.

import { createServiceRoleClient } from './supabase/server';

const BUYING_SIGNALS = [
  /\byes\b.*\b(go ahead|proceed|start|let'?s do it|book|confirm|accept)/i,
  /\b(sounds good|perfect|great|let'?s go|i'?m in|deal|approved|agreed)\b/i,
  /\b(when can you start|how soon|ready to go|lock it in)\b/i,
  /\b(i'?ll take it|we'?ll go with|happy to proceed|confirmed)\b/i,
  /\b(send (the|an?) invoice|where do i pay|payment details|pay now)\b/i,
  /\b(accept(ed)? (the|your) quote|accept(ed)? quote)\b/i,
];

const REJECTION_SIGNALS = [
  /\b(no thanks|not interested|too expensive|can'?t afford|pass|decline)\b/i,
  /\b(found someone else|going with another|changed my mind)\b/i,
];

export type SignalResult = 'buying' | 'rejection' | 'neutral';

/**
 * Analyze a message for buying/rejection signals.
 * Uses fast regex matching — no API calls needed.
 */
export function detectSignal(message: string): SignalResult {
  for (const pattern of REJECTION_SIGNALS) {
    if (pattern.test(message)) return 'rejection';
  }
  for (const pattern of BUYING_SIGNALS) {
    if (pattern.test(message)) return 'buying';
  }
  return 'neutral';
}

/**
 * Auto-convert a lead to "won" + create a client record.
 * Called when a buying signal is detected in an inbound message.
 */
export async function autoConvertLead(leadId: string): Promise<boolean> {
  try {
    const supabase = await createServiceRoleClient();

    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (!lead || lead.status === 'won' || lead.status === 'lost') return false;

    // Only auto-convert if lead is at quote_sent or contacted stage
    // Don't auto-convert brand new leads from a single "yes" message
    if (lead.status !== 'quote_sent' && lead.status !== 'contacted') return false;

    // Mark as won
    await supabase.from('leads').update({
      status: 'won',
      won_date: new Date().toISOString(),
    }).eq('id', leadId);

    await supabase.from('lead_status_changes').insert({
      lead_id: leadId,
      from_status: lead.status,
      to_status: 'won',
    });

    await supabase.from('lead_notes').insert({
      lead_id: leadId,
      content: 'AI detected buying signal in customer message — automatically marked as won.',
      is_system: true,
    });

    // Auto-set won_value from quotes
    const { data: quotes } = await supabase
      .from('quotes')
      .select('total, status')
      .eq('lead_id', leadId)
      .in('status', ['sent', 'accepted'])
      .order('created_at', { ascending: false })
      .limit(1);

    const wonValue = quotes?.[0]?.total || 0;
    if (wonValue > 0) {
      await supabase.from('leads').update({ won_value: wonValue }).eq('id', leadId);
    }

    // Create client record if not already linked
    if (!lead.client_id) {
      let existingClientId: string | null = null;

      if (lead.email) {
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('organization_id', lead.organization_id)
          .eq('email', lead.email)
          .limit(1)
          .maybeSingle();
        if (existing) existingClientId = existing.id;
      }

      if (existingClientId) {
        await supabase.from('leads').update({ client_id: existingClientId }).eq('id', leadId);
        if (wonValue > 0) {
          const { data: cli } = await supabase.from('clients').select('lifetime_value, total_invoiced').eq('id', existingClientId).single();
          if (cli) {
            await supabase.from('clients').update({
              lifetime_value: (Number(cli.lifetime_value) || 0) + Number(wonValue),
              total_invoiced: (Number(cli.total_invoiced) || 0) + Number(wonValue),
              outstanding_balance: (Number(cli.total_invoiced) || 0) + Number(wonValue) - (Number(cli.lifetime_value) || 0),
            }).eq('id', existingClientId);
          }
        }
      } else {
        const { data: newClient } = await supabase
          .from('clients')
          .insert({
            organization_id: lead.organization_id,
            first_name: lead.first_name || '',
            last_name: lead.last_name || '',
            email: lead.email || null,
            phone: lead.phone || null,
            company_name: lead.company || null,
            address: lead.location || null,
            postcode: lead.postcode || null,
            source: 'auto_converted',
            status: 'active',
            type: lead.company ? 'company' : 'individual',
            primary_lead_id: leadId,
            lifetime_value: wonValue,
            total_invoiced: wonValue,
            outstanding_balance: wonValue,
          })
          .select('id')
          .single();

        if (newClient) {
          await supabase.from('leads').update({ client_id: newClient.id }).eq('id', leadId);
          await supabase.from('client_activities').insert({
            client_id: newClient.id,
            organization_id: lead.organization_id,
            type: 'status_change',
            title: 'AI auto-converted from lead',
            description: `${lead.first_name} ${lead.last_name} sent a buying signal and was automatically converted to a client.`,
          });
        }
      }
    }

    return true;
  } catch (err) {
    console.error('Auto-convert error:', err);
    return false;
  }
}

/**
 * Auto-mark a lead as lost when rejection signals are detected.
 */
export async function autoRejectLead(leadId: string): Promise<boolean> {
  try {
    const supabase = await createServiceRoleClient();

    const { data: lead } = await supabase
      .from('leads')
      .select('status')
      .eq('id', leadId)
      .single();

    if (!lead || lead.status === 'won' || lead.status === 'lost') return false;

    await supabase.from('leads').update({ status: 'lost' }).eq('id', leadId);

    await supabase.from('lead_status_changes').insert({
      lead_id: leadId,
      from_status: lead.status,
      to_status: 'lost',
    });

    await supabase.from('lead_notes').insert({
      lead_id: leadId,
      content: 'AI detected rejection signal in customer message — automatically marked as lost.',
      is_system: true,
    });

    return true;
  } catch (err) {
    console.error('Auto-reject error:', err);
    return false;
  }
}
