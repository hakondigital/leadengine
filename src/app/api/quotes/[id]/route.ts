import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    const { data: quote, error } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Quote fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createServiceRoleClient();

    // Recalculate totals if line_items changed (accept both 'items' and 'line_items')
    const updateItems = body.line_items || body.items;
    if (updateItems) {
      body.line_items = updateItems;
      delete body.items;
      const subtotal = updateItems.reduce(
        (sum: number, item: { quantity: number; unit_price: number }) =>
          sum + (item.quantity || 1) * (item.unit_price || 0),
        0
      );
      const taxRate = body.tax_rate ?? 0;
      body.subtotal = subtotal;
      body.tax_amount = subtotal * (taxRate / 100);
      body.total = subtotal + body.tax_amount;
    }

    // Fetch current quote to check for status transition
    const { data: currentQuote } = await supabase
      .from('quotes')
      .select('status, lead_id, organization_id, total')
      .eq('id', id)
      .single();

    const { data: quote, error } = await supabase
      .from('quotes')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Quote update error:', error);
      return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
    }

    // ── Auto-win lead when quote is accepted ────────────────
    if (body.status === 'accepted' && currentQuote?.status !== 'accepted' && currentQuote?.lead_id) {
      (async () => {
        try {
          // Check lead isn't already won
          const { data: lead } = await supabase
            .from('leads')
            .select('status')
            .eq('id', currentQuote.lead_id)
            .single();

          if (lead && lead.status !== 'won') {
            const wonValue = quote.total || currentQuote.total || 0;

            // Mark lead as won
            await supabase.from('leads').update({
              status: 'won',
              won_date: new Date().toISOString(),
              won_value: wonValue,
            }).eq('id', currentQuote.lead_id);

            // Log status change
            await supabase.from('lead_status_changes').insert({
              lead_id: currentQuote.lead_id,
              from_status: lead.status,
              to_status: 'won',
            });

            await supabase.from('lead_notes').insert({
              lead_id: currentQuote.lead_id,
              content: `Automatically marked as won — quote ${quote.quote_number || id} accepted ($${Number(wonValue).toLocaleString()})`,
              is_system: true,
            });

            // Auto-create client (same logic as lead [id] route)
            const { data: fullLead } = await supabase
              .from('leads')
              .select('*')
              .eq('id', currentQuote.lead_id)
              .single();

            if (fullLead && !fullLead.client_id) {
              let existingClientId: string | null = null;
              if (fullLead.email) {
                const { data: existing } = await supabase
                  .from('clients')
                  .select('id')
                  .eq('organization_id', currentQuote.organization_id)
                  .eq('email', fullLead.email)
                  .limit(1)
                  .maybeSingle();
                if (existing) existingClientId = existing.id;
              }

              if (existingClientId) {
                await supabase.from('leads').update({ client_id: existingClientId }).eq('id', currentQuote.lead_id);
              } else {
                const { data: newClient } = await supabase
                  .from('clients')
                  .insert({
                    organization_id: currentQuote.organization_id,
                    first_name: fullLead.first_name || '',
                    last_name: fullLead.last_name || '',
                    email: fullLead.email || null,
                    phone: fullLead.phone || null,
                    company_name: fullLead.company || null,
                    address: fullLead.location || null,
                    postcode: fullLead.postcode || null,
                    source: 'quote_accepted',
                    status: 'active',
                    type: fullLead.company ? 'company' : 'individual',
                    primary_lead_id: currentQuote.lead_id,
                    lifetime_value: wonValue,
                    total_invoiced: wonValue,
                    outstanding_balance: wonValue,
                  })
                  .select('id')
                  .single();

                if (newClient) {
                  await supabase.from('leads').update({ client_id: newClient.id }).eq('id', currentQuote.lead_id);
                  await supabase.from('client_activities').insert({
                    client_id: newClient.id,
                    organization_id: currentQuote.organization_id,
                    type: 'quote',
                    title: 'Quote accepted — client created',
                    description: `Quote ${quote.quote_number || ''} for $${Number(wonValue).toLocaleString()} was accepted. Client record automatically created.`,
                  });
                }
              }
            }
          }
        } catch (err) {
          console.error('Auto-win from quote error:', err);
        }
      })();
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Quote update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

// POST to send a quote — updates status to 'sent' and sets sent_at
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    const { data: quote, error: fetchError } = await supabase
      .from('quotes')
      .select('*, lead:leads(*), organization:organizations(*)')
      .eq('id', id)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Update status to sent
    const { data: updated, error: updateError } = await supabase
      .from('quotes')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Quote send error:', updateError);
      return NextResponse.json({ error: 'Failed to send quote' }, { status: 500 });
    }

    // Send quote email to lead (fire and forget)
    if (quote.lead?.email) {
      const { sendFollowUpEmail } = await import('@/lib/email');
      const message = `Hi ${quote.lead.first_name},\n\nPlease find your quote (${quote.quote_number}) for $${quote.total?.toLocaleString()}. This quote is valid until ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : 'further notice'}.\n\nIf you have any questions, feel free to reach out.\n\nBest regards,\n${quote.organization?.name || 'Our Team'}`;
      sendFollowUpEmail(quote.lead, quote.organization, message).catch(console.error);
    }

    // Trigger quote_sent sequences (fire and forget)
    if (quote.lead_id && quote.organization_id) {
      import('@/lib/sequence-triggers').then(({ triggerSequenceEvent }) =>
        triggerSequenceEvent('quote_sent', quote.lead_id, quote.organization_id, supabase)
      ).catch(console.error);
    }

    // Auto-progress pipeline stage (fire and forget)
    if (quote.lead_id) {
      import('@/lib/pipeline-automation').then(({ autoPipelineProgress }) =>
        autoPipelineProgress('quote_sent', quote.lead_id, supabase)
      ).catch(console.error);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Quote send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
