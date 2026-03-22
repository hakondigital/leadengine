import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    // Fetch invoice with client and org details
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('*, client:clients(*), organization:organizations(*)')
      .eq('id', id)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const client = invoice.client as Record<string, unknown> | null;
    const org = invoice.organization as Record<string, unknown> | null;

    if (!client?.email) {
      return NextResponse.json({ error: 'Client has no email address' }, { status: 400 });
    }

    // Build the invoice email HTML
    const lineItems = (invoice.line_items as Array<{ description: string; quantity: number; unit_price: number; total: number }>) || [];
    const orgName = (org?.name as string) || 'Our Team';
    const clientName = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Customer';
    const dueDateStr = invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'On receipt';

    const lineItemsHtml = lineItems.map((item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #EEF1F5;color:#1A2332;font-size:13px;">${item.description}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EEF1F5;color:#4A5568;font-size:13px;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EEF1F5;color:#4A5568;font-size:13px;text-align:right;">$${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #EEF1F5;color:#1A2332;font-size:13px;text-align:right;font-weight:500;">$${Number(item.total || item.quantity * item.unit_price).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F9FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <!-- Header -->
    <div style="margin-bottom:24px;text-align:center;">
      <h2 style="margin:0;color:#1A2332;font-size:20px;font-weight:600;">${orgName}</h2>
    </div>

    <!-- Invoice card -->
    <div style="background:#FFFFFF;border:1px solid #EEF1F5;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(28,42,58,0.06);">
      <!-- Invoice header -->
      <div style="padding:24px;border-bottom:1px solid #EEF1F5;">
        <div style="display:inline-block;padding:4px 12px;border-radius:6px;background:#EEF2FF;color:#4F46E5;font-size:12px;font-weight:600;letter-spacing:0.5px;margin-bottom:12px;">
          INVOICE
        </div>
        <h1 style="margin:0 0 4px;color:#1A2332;font-size:22px;font-weight:700;">${invoice.invoice_number}</h1>
        <p style="margin:0;color:#7B8794;font-size:13px;">
          Issued: ${new Date(invoice.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <!-- Bill To -->
      <div style="padding:20px 24px;border-bottom:1px solid #EEF1F5;">
        <p style="margin:0 0 4px;color:#7B8794;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Bill To</p>
        <p style="margin:0;color:#1A2332;font-size:14px;font-weight:500;">${clientName}</p>
        ${client.company_name ? `<p style="margin:2px 0 0;color:#4A5568;font-size:13px;">${client.company_name}</p>` : ''}
        ${client.email ? `<p style="margin:2px 0 0;color:#4A5568;font-size:13px;">${client.email}</p>` : ''}
      </div>

      <!-- Line items -->
      <div style="padding:0 24px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="padding:12px 12px;text-align:left;color:#7B8794;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #EEF1F5;">Description</th>
              <th style="padding:12px 12px;text-align:center;color:#7B8794;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #EEF1F5;">Qty</th>
              <th style="padding:12px 12px;text-align:right;color:#7B8794;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #EEF1F5;">Unit Price</th>
              <th style="padding:12px 12px;text-align:right;color:#7B8794;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #EEF1F5;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div style="padding:20px 24px;border-top:1px solid #EEF1F5;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:4px 0;color:#7B8794;font-size:13px;">Subtotal</td>
            <td style="padding:4px 0;color:#1A2332;font-size:13px;text-align:right;">$${Number(invoice.subtotal).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#7B8794;font-size:13px;">GST (${Number(invoice.tax_rate)}%)</td>
            <td style="padding:4px 0;color:#1A2332;font-size:13px;text-align:right;">$${Number(invoice.tax_amount).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0 0;color:#1A2332;font-size:16px;font-weight:700;border-top:2px solid #EEF1F5;">Total Due</td>
            <td style="padding:8px 0 0;color:#1A2332;font-size:16px;font-weight:700;text-align:right;border-top:2px solid #EEF1F5;">$${Number(invoice.total).toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <!-- Due date -->
      <div style="padding:16px 24px;background:#F7F9FB;border-top:1px solid #EEF1F5;">
        <p style="margin:0;color:#4A5568;font-size:13px;text-align:center;">
          <strong>Payment due:</strong> ${dueDateStr}
        </p>
      </div>

      ${invoice.notes ? `
      <div style="padding:16px 24px;border-top:1px solid #EEF1F5;">
        <p style="margin:0 0 4px;color:#7B8794;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Notes</p>
        <p style="margin:0;color:#4A5568;font-size:13px;line-height:1.6;">${invoice.notes}</p>
      </div>` : ''}
    </div>

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #EEF1F5;text-align:center;">
      <p style="margin:0;color:#A0ABB5;font-size:11px;">
        Sent by ${orgName}
      </p>
    </div>
  </div>
</body>
</html>`;

    // Send email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'invoices@odyssey.io';

    if (RESEND_API_KEY) {
      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${orgName} <${FROM_EMAIL}>`,
          to: client.email as string,
          reply_to: (org?.notification_email as string) || undefined,
          subject: `Invoice ${invoice.invoice_number} — $${Number(invoice.total).toFixed(2)}`,
          html,
        }),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        console.error('Invoice email send error:', errText);
        return NextResponse.json({ error: 'Failed to send invoice email' }, { status: 500 });
      }
    } else {
      console.warn('Resend API key not configured — invoice email skipped');
    }

    // Update invoice status to sent
    const { data: updated, error: updateError } = await supabase
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Invoice status update error:', updateError);
      return NextResponse.json({ error: 'Email sent but failed to update status' }, { status: 500 });
    }

    // Log activity on client
    if (invoice.client_id) {
      try {
        await supabase.from('client_activities').insert({
          client_id: invoice.client_id,
          organization_id: invoice.organization_id,
          type: 'payment',
          title: `Invoice ${invoice.invoice_number} sent`,
          description: `Invoice for $${Number(invoice.total).toFixed(2)} sent via email`,
        });
      } catch (err) {
        console.error('Failed to log client activity:', err);
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Invoice send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
