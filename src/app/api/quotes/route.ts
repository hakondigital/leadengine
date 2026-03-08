import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const status = searchParams.get('status');
    const leadId = searchParams.get('lead_id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    let query = supabase
      .from('quotes')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (leadId) query = query.eq('lead_id', leadId);

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: quotes, count, error } = await query;

    if (error) {
      console.error('Quotes fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
    }

    return NextResponse.json({
      quotes,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Quotes fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id, lead_id, items, notes, valid_until, ...rest } = body;

    if (!organization_id || !lead_id) {
      return NextResponse.json(
        { error: 'organization_id and lead_id required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Get org to generate quote number
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('quote_prefix, quote_next_number')
      .eq('id', organization_id)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const prefix = org.quote_prefix || 'QT';
    const nextNumber = org.quote_next_number || 1;
    const quoteNumber = `${prefix}-${String(nextNumber).padStart(5, '0')}`;

    // Calculate totals from items
    const quoteItems = items || [];
    const subtotal = quoteItems.reduce(
      (sum: number, item: { quantity: number; unit_price: number }) =>
        sum + (item.quantity || 1) * (item.unit_price || 0),
      0
    );
    const taxRate = rest.tax_rate || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Insert quote
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .insert({
        organization_id,
        lead_id,
        quote_number: quoteNumber,
        items: quoteItems,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        total,
        notes: notes || null,
        valid_until: valid_until || null,
        status: 'draft',
        ...rest,
      })
      .select()
      .single();

    if (quoteError) {
      console.error('Quote create error:', quoteError);
      return NextResponse.json({ error: 'Failed to create quote' }, { status: 500 });
    }

    // Increment org quote_next_number
    await supabase
      .from('organizations')
      .update({ quote_next_number: nextNumber + 1 })
      .eq('id', organization_id);

    return NextResponse.json(quote, { status: 201 });
  } catch (error) {
    console.error('Quote create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
