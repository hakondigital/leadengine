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

    // Recalculate totals if items changed
    if (body.items) {
      const subtotal = body.items.reduce(
        (sum: number, item: { quantity: number; unit_price: number }) =>
          sum + (item.quantity || 1) * (item.unit_price || 0),
        0
      );
      const taxRate = body.tax_rate ?? 0;
      body.subtotal = subtotal;
      body.tax_amount = subtotal * (taxRate / 100);
      body.total = subtotal + body.tax_amount;
    }

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

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Quote update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Quote send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
