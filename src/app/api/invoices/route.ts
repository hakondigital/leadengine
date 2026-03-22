import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const clientId = searchParams.get('client_id');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { unauthorized } = await requireCallerOwnsOrg(orgId);
    if (unauthorized) return unauthorized;

    let query = supabase
      .from('invoices')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (clientId) query = query.eq('client_id', clientId);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: invoices, count, error } = await query;

    if (error) {
      console.error('Invoices fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch invoices' }, { status: 500 });
    }

    return NextResponse.json({
      invoices,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Invoices fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id, client_id, lead_id, line_items, notes, due_date, tax_rate } = body;

    if (!organization_id) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Get org to generate invoice number
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('invoice_prefix, invoice_next_number')
      .eq('id', organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const prefix = (org as Record<string, unknown>).invoice_prefix as string || 'INV';
    const nextNumber = (org as Record<string, unknown>).invoice_next_number as number || 1;
    const invoiceNumber = `${prefix}-${String(nextNumber).padStart(5, '0')}`;

    // Calculate totals from line items
    const items = line_items || [];
    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unit_price: number }) =>
        sum + (item.quantity || 1) * (item.unit_price || 0),
      0
    );
    const effectiveTaxRate = tax_rate ?? 10;
    const taxAmount = subtotal * (effectiveTaxRate / 100);
    const total = subtotal + taxAmount;

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        organization_id,
        client_id: client_id || null,
        lead_id: lead_id || null,
        invoice_number: invoiceNumber,
        line_items: items,
        subtotal,
        tax_rate: effectiveTaxRate,
        tax_amount: taxAmount,
        total,
        notes: notes || null,
        due_date: due_date || null,
        status: 'draft',
      })
      .select()
      .single();

    if (invoiceError) {
      console.error('Invoice create error:', invoiceError);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    // Increment org invoice_next_number
    await supabase
      .from('organizations')
      .update({ invoice_next_number: nextNumber + 1 })
      .eq('id', organization_id);

    // Update client totals if client_id provided
    if (client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('total_invoiced, outstanding_balance')
        .eq('id', client_id)
        .single();

      if (client) {
        await supabase
          .from('clients')
          .update({
            total_invoiced: (client.total_invoiced || 0) + total,
            outstanding_balance: (client.outstanding_balance || 0) + total,
          })
          .eq('id', client_id);
      }
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Invoice create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
