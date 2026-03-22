import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    // Fetch invoice with client data
    const { data: invoice, error: invoiceError } = await (supabase as any)
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Fetch organization
    const { data: organization } = await (supabase as any)
      .from('organizations')
      .select('name, phone, notification_email, logo_url, settings')
      .eq('id', invoice.organization_id)
      .single();

    // Fetch client if linked
    let client = null;
    if (invoice.client_id) {
      const { data: clientData } = await (supabase as any)
        .from('clients')
        .select('first_name, last_name, email, phone, company_name, company_abn, address, city, state, postcode')
        .eq('id', invoice.client_id)
        .single();
      client = clientData;
    }

    return NextResponse.json({
      invoice,
      organization: organization || { name: 'Unknown', phone: null, notification_email: '', settings: {} },
      client,
    });
  } catch (error) {
    console.error('Public invoice fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
