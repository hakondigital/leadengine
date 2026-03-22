import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, client:clients(*)')
      .eq('id', id)
      .single();

    if (error || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Invoice fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createServiceRoleClient();

    // Fetch current invoice for comparison
    const { data: currentInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentInvoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Recalculate totals if line_items changed
    if (body.line_items) {
      const subtotal = body.line_items.reduce(
        (sum: number, item: { quantity: number; unit_price: number }) =>
          sum + (item.quantity || 1) * (item.unit_price || 0),
        0
      );
      const taxRate = body.tax_rate ?? currentInvoice.tax_rate ?? 10;
      body.subtotal = subtotal;
      body.tax_rate = taxRate;
      body.tax_amount = subtotal * (taxRate / 100);
      body.total = subtotal + body.tax_amount;
    }

    // If marking as paid, set paid_at
    if (body.status === 'paid' && currentInvoice.status !== 'paid') {
      body.paid_at = new Date().toISOString();

      // Update client totals
      if (currentInvoice.client_id) {
        const finalTotal = body.total ?? currentInvoice.total;
        const { data: client } = await supabase
          .from('clients')
          .select('total_paid, outstanding_balance')
          .eq('id', currentInvoice.client_id)
          .single();

        if (client) {
          await supabase
            .from('clients')
            .update({
              total_paid: (client.total_paid || 0) + finalTotal,
              outstanding_balance: Math.max(0, (client.outstanding_balance || 0) - finalTotal),
            })
            .eq('id', currentInvoice.client_id);
        }
      }
    }

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Invoice update error:', error);
      return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error('Invoice update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    // Get invoice before deleting (to update client totals)
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Reverse client totals
    if (invoice.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('total_invoiced, total_paid, outstanding_balance')
        .eq('id', invoice.client_id)
        .single();

      if (client) {
        const updates: Record<string, number> = {
          total_invoiced: Math.max(0, (client.total_invoiced || 0) - invoice.total),
        };
        if (invoice.status === 'paid') {
          updates.total_paid = Math.max(0, (client.total_paid || 0) - invoice.total);
        } else {
          updates.outstanding_balance = Math.max(0, (client.outstanding_balance || 0) - invoice.total);
        }
        await supabase.from('clients').update(updates).eq('id', invoice.client_id);
      }
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Invoice delete error:', error);
      return NextResponse.json({ error: 'Failed to delete invoice' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invoice delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
