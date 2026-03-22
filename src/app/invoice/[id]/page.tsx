'use client';

import React, { useEffect, useState } from 'react';

interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface InvoiceData {
  invoice: {
    id: string;
    invoice_number: string;
    status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
    line_items: InvoiceLineItem[];
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
    notes: string | null;
    due_date: string | null;
    sent_at: string | null;
    paid_at: string | null;
    created_at: string;
  };
  organization: {
    name: string;
    phone: string | null;
    notification_email: string;
    logo_url: string | null;
    settings: Record<string, any>;
  };
  client: {
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    company_name: string | null;
    company_abn: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    postcode: string | null;
  } | null;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(amount);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    paid: { bg: '#dcfce7', text: '#166534', label: 'PAID' },
    sent: { bg: '#fef3c7', text: '#92400e', label: 'UNPAID' },
    draft: { bg: '#f3f4f6', text: '#374151', label: 'DRAFT' },
    overdue: { bg: '#fee2e2', text: '#991b1b', label: 'OVERDUE' },
    cancelled: { bg: '#f3f4f6', text: '#6b7280', label: 'CANCELLED' },
  };
  const c = config[status] || config.draft;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 14px',
        borderRadius: '4px',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '0.5px',
        backgroundColor: c.bg,
        color: c.text,
      }}
    >
      {c.label}
    </span>
  );
}

export default function InvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const [data, setData] = useState<InvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices/${id}/public`)
      .then((r) => {
        if (!r.ok) throw new Error('Invoice not found');
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading invoice...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>Invoice not found</h1>
          <p style={{ color: '#6b7280' }}>This invoice may have been removed or the link is invalid.</p>
        </div>
      </div>
    );
  }

  const { invoice, organization, client } = data;
  const lineItems: InvoiceLineItem[] = Array.isArray(invoice.line_items)
    ? invoice.line_items
    : [];

  const orgSettings = organization.settings || {};
  const abn = (orgSettings as Record<string, any>).abn || null;
  const orgAddress = (orgSettings as Record<string, any>).address || null;

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .invoice-page { box-shadow: none !important; margin: 0 !important; padding: 40px !important; max-width: none !important; }
        }
        @page {
          size: A4;
          margin: 15mm;
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#f9fafb',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          color: '#111827',
        }}
      >
        {/* Action bar */}
        <div
          className="no-print"
          style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e5e7eb',
            padding: '12px 0',
          }}
        >
          <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Invoice {invoice.invoice_number}
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151',
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Print
              </button>
              <button
                onClick={() => window.print()}
                style={{
                  padding: '8px 20px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#ffffff',
                  backgroundColor: '#111827',
                  border: '1px solid #111827',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Download PDF
              </button>
            </div>
          </div>
        </div>

        {/* Invoice body */}
        <div
          className="invoice-page"
          style={{
            maxWidth: '860px',
            margin: '32px auto',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
            borderRadius: '8px',
            padding: '56px 64px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' }}>
            <div>
              {organization.logo_url ? (
                <img
                  src={organization.logo_url}
                  alt={organization.name}
                  style={{ maxHeight: '56px', maxWidth: '200px', marginBottom: '12px', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
                  {organization.name}
                </div>
              )}
              {organization.logo_url && (
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#374151' }}>
                  {organization.name}
                </div>
              )}
              {abn && (
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                  ABN: {abn}
                </div>
              )}
              {organization.notification_email && (
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                  {organization.notification_email}
                </div>
              )}
              {organization.phone && (
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                  {organization.phone}
                </div>
              )}
              {orgAddress && (
                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                  {orgAddress}
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#111827', letterSpacing: '-0.5px' }}>
                INVOICE
              </div>
              <div style={{ fontSize: '15px', color: '#374151', fontWeight: 600, marginTop: '4px' }}>
                {invoice.invoice_number}
              </div>
              <div style={{ marginTop: '12px' }}>
                <StatusBadge status={invoice.status} />
              </div>
            </div>
          </div>

          {/* Bill To + Dates */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Bill To
              </div>
              {client ? (
                <>
                  {client.company_name && (
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827' }}>
                      {client.company_name}
                    </div>
                  )}
                  <div style={{ fontSize: '14px', color: '#374151', marginTop: '2px' }}>
                    {client.first_name} {client.last_name}
                  </div>
                  {client.email && (
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                      {client.email}
                    </div>
                  )}
                  {client.phone && (
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                      {client.phone}
                    </div>
                  )}
                  {(client.address || client.city || client.state || client.postcode) && (
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                      {[client.address, client.city, client.state, client.postcode]
                        .filter(Boolean)
                        .join(', ')}
                    </div>
                  )}
                  {client.company_abn && (
                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                      ABN: {client.company_abn}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '14px', color: '#9ca3af', fontStyle: 'italic' }}>
                  No client linked
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Invoice Date
                </div>
                <div style={{ fontSize: '14px', color: '#374151' }}>
                  {formatDate(invoice.created_at)}
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                  Due Date
                </div>
                <div style={{ fontSize: '14px', color: '#374151', fontWeight: invoice.status === 'overdue' ? 700 : 400, ...(invoice.status === 'overdue' ? { color: '#dc2626' } : {}) }}>
                  {formatDate(invoice.due_date)}
                </div>
              </div>
              {invoice.paid_at && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                    Paid On
                  </div>
                  <div style={{ fontSize: '14px', color: '#166534', fontWeight: 600 }}>
                    {formatDate(invoice.paid_at)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginBottom: '32px' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '14px',
              }}
            >
              <thead>
                <tr style={{ borderBottom: '2px solid #111827' }}>
                  <th style={{ textAlign: 'left', padding: '10px 0', fontWeight: 600, color: '#111827', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Description
                  </th>
                  <th style={{ textAlign: 'center', padding: '10px 16px', fontWeight: 600, color: '#111827', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', width: '80px' }}>
                    Qty
                  </th>
                  <th style={{ textAlign: 'right', padding: '10px 16px', fontWeight: 600, color: '#111827', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', width: '120px' }}>
                    Unit Price
                  </th>
                  <th style={{ textAlign: 'right', padding: '10px 0', fontWeight: 600, color: '#111827', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', width: '120px' }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length > 0 ? (
                  lineItems.map((item, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                      }}
                    >
                      <td style={{ padding: '14px 0', color: '#374151' }}>
                        {item.description}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center', color: '#374151' }}>
                        {item.quantity}
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right', color: '#374151' }}>
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td style={{ padding: '14px 0', textAlign: 'right', color: '#111827', fontWeight: 500 }}>
                        {formatCurrency(item.quantity * item.unit_price)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      style={{ padding: '24px 0', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}
                    >
                      No line items
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
            <div style={{ width: '280px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px' }}>
                <span style={{ color: '#6b7280' }}>Subtotal</span>
                <span style={{ color: '#374151' }}>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '14px', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ color: '#6b7280' }}>
                  GST ({invoice.tax_rate}%)
                </span>
                <span style={{ color: '#374151' }}>{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '18px', fontWeight: 700 }}>
                <span style={{ color: '#111827' }}>Total</span>
                <span style={{ color: '#111827' }}>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div style={{ marginBottom: '32px', padding: '16px 20px', backgroundColor: '#f9fafb', borderRadius: '6px', borderLeft: '3px solid #d1d5db' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Notes
              </div>
              <div style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {invoice.notes}
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            style={{
              borderTop: '1px solid #e5e7eb',
              paddingTop: '24px',
              textAlign: 'center',
              fontSize: '12px',
              color: '#9ca3af',
            }}
          >
            <p style={{ margin: 0 }}>
              Thank you for your business.
            </p>
            {organization.name && (
              <p style={{ margin: '4px 0 0' }}>
                {organization.name}
                {organization.phone ? ` | ${organization.phone}` : ''}
                {organization.notification_email ? ` | ${organization.notification_email}` : ''}
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
