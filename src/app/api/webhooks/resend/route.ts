import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/webhooks/resend
// Resend webhook — receives email events (delivered, opened, clicked, bounced).
// When a business owner opens a lead notification email, auto-mark the lead as "reviewed"
// which triggers client creation in the leads/[id] PATCH handler.

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // We only care about 'email.opened' events
    if (type !== 'email.opened') {
      return NextResponse.json({ received: true });
    }

    // Resend sends the subject line which contains the lead info
    const subject = data?.subject || '';
    const toEmail = Array.isArray(data?.to) ? data.to[0] : data?.to;

    if (!subject || !toEmail) {
      return NextResponse.json({ received: true });
    }

    const supabase = await createServiceRoleClient();

    // Find the org by notification email
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('notification_email', toEmail)
      .limit(1)
      .maybeSingle();

    if (!org) {
      return NextResponse.json({ received: true });
    }

    // Find the most recent "new" lead for this org (the one the notification was about)
    const { data: lead } = await supabase
      .from('leads')
      .select('id, status')
      .eq('organization_id', org.id)
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lead?.status === 'new') {
      // Auto-mark as reviewed — this triggers client creation in the PATCH handler
      await supabase
        .from('leads')
        .update({ status: 'reviewed' })
        .eq('id', lead.id);

      await supabase.from('lead_status_changes').insert({
        lead_id: lead.id,
        from_status: 'new',
        to_status: 'reviewed',
      });

      await supabase.from('lead_notes').insert({
        lead_id: lead.id,
        content: 'Lead notification email was opened — automatically marked as reviewed.',
        is_system: true,
      });

      // Auto-create client (same logic as PATCH handler but inline since
      // we're not going through the PATCH endpoint here)
      const { data: fullLead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', lead.id)
        .single();

      if (fullLead && !fullLead.client_id) {
        let existingClientId: string | null = null;
        if (fullLead.email) {
          const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .eq('organization_id', fullLead.organization_id)
            .eq('email', fullLead.email)
            .limit(1)
            .maybeSingle();
          if (existing) existingClientId = existing.id;
        }

        if (existingClientId) {
          await supabase.from('leads').update({ client_id: existingClientId }).eq('id', lead.id);
        } else {
          const { data: newClient } = await supabase
            .from('clients')
            .insert({
              organization_id: fullLead.organization_id,
              first_name: fullLead.first_name || '',
              last_name: fullLead.last_name || '',
              email: fullLead.email || null,
              phone: fullLead.phone || null,
              company_name: fullLead.company || null,
              address: fullLead.location || null,
              postcode: fullLead.postcode || null,
              source: 'email_opened',
              status: 'active',
              type: fullLead.company ? 'company' : 'individual',
              primary_lead_id: lead.id,
            })
            .select('id')
            .single();

          if (newClient) {
            await supabase.from('leads').update({ client_id: newClient.id }).eq('id', lead.id);
            await supabase.from('client_activities').insert({
              client_id: newClient.id,
              organization_id: fullLead.organization_id,
              type: 'status_change',
              title: 'Client created — email notification opened',
              description: `${fullLead.first_name} ${fullLead.last_name} notification was opened, lead auto-reviewed and client created.`,
            });
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Resend webhook error:', error);
    return NextResponse.json({ received: true });
  }
}
