'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  DollarSign,
  FileText,
  X,
  Edit3,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { useInvoices } from '@/hooks/use-invoices';
import type { Invoice, InvoiceStatus } from '@/lib/database.types';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface InvoiceManagerProps {
  organizationId: string;
  clientId?: string;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function currency(n: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(n);
}

function formatDate(iso: string | null): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const STATUS_BADGE_VARIANT: Record<InvoiceStatus, 'default' | 'info' | 'success' | 'error'> = {
  draft: 'default',
  sent: 'info',
  paid: 'success',
  overdue: 'error',
  cancelled: 'default',
};

const EMPTY_LINE_ITEM: LineItem = { description: '', quantity: 1, unit_price: 0 };

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function InvoiceManager({ organizationId, clientId }: InvoiceManagerProps) {
  const toast = useToast();
  const {
    invoices,
    loading,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    sendInvoice,
  } = useInvoices(organizationId, clientId);

  // ── Form state ──
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ ...EMPTY_LINE_ITEM }]);
  const [taxRate, setTaxRate] = useState(10);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Computed totals ──
  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0),
    [lineItems]
  );
  const taxAmount = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
  const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

  // ── Summary totals ──
  const summaryTotals = useMemo(() => {
    const totalInvoiced = invoices.reduce((s, i) => s + Number(i.total), 0);
    const totalPaid = invoices
      .filter((i) => i.status === 'paid')
      .reduce((s, i) => s + Number(i.total), 0);
    const outstanding = invoices
      .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
      .reduce((s, i) => s + Number(i.total), 0);
    return { totalInvoiced, totalPaid, outstanding };
  }, [invoices]);

  // ── Line item handlers ──
  const addLineItem = useCallback(() => {
    setLineItems((prev) => [...prev, { ...EMPTY_LINE_ITEM }]);
  }, []);

  const removeLineItem = useCallback((index: number) => {
    setLineItems((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const updateLineItem = useCallback((index: number, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }, []);

  // ── Reset form ──
  const resetForm = useCallback(() => {
    setLineItems([{ ...EMPTY_LINE_ITEM }]);
    setTaxRate(10);
    setDueDate('');
    setNotes('');
    setEditingId(null);
    setShowForm(false);
  }, []);

  // ── Open edit form ──
  const startEdit = useCallback((invoice: Invoice) => {
    const items = (invoice.line_items as Array<{ description: string; quantity: number; unit_price: number }>) || [];
    setLineItems(items.length > 0 ? items.map((i) => ({ ...i })) : [{ ...EMPTY_LINE_ITEM }]);
    setTaxRate(Number(invoice.tax_rate) || 10);
    setDueDate(invoice.due_date || '');
    setNotes(invoice.notes || '');
    setEditingId(invoice.id);
    setShowForm(true);
  }, []);

  // ── Save (create or update) ──
  const handleSave = useCallback(async () => {
    const validItems = lineItems.filter((i) => i.description.trim() && i.unit_price > 0);
    if (validItems.length === 0) {
      toast.error('Add at least one line item with a description and price');
      return;
    }

    setSaving(true);
    try {
      const itemsWithTotal = validItems.map((i) => ({
        ...i,
        total: i.quantity * i.unit_price,
      }));

      if (editingId) {
        const result = await updateInvoice(editingId, {
          line_items: itemsWithTotal,
          tax_rate: taxRate,
          due_date: dueDate || null,
          notes: notes || null,
        });
        if (result) {
          toast.success('Invoice updated');
          resetForm();
        } else {
          toast.error('Failed to update invoice');
        }
      } else {
        const result = await createInvoice({
          organization_id: organizationId,
          client_id: clientId,
          line_items: itemsWithTotal,
          tax_rate: taxRate,
          due_date: dueDate || undefined,
          notes: notes || undefined,
        });
        if (result) {
          toast.success('Invoice created');
          resetForm();
        } else {
          toast.error('Failed to create invoice');
        }
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSaving(false);
    }
  }, [lineItems, taxRate, dueDate, notes, editingId, organizationId, clientId, createInvoice, updateInvoice, resetForm, toast]);

  // ── Send invoice ──
  const handleSend = useCallback(async (id: string) => {
    setSendingId(id);
    try {
      await sendInvoice(id);
      toast.success('Invoice sent via email');
    } catch (err) {
      toast.error((err as Error).message || 'Failed to send invoice');
    } finally {
      setSendingId(null);
    }
  }, [sendInvoice, toast]);

  // ── Mark as paid ──
  const handleMarkPaid = useCallback(async (id: string) => {
    const result = await updateInvoice(id, { status: 'paid' });
    if (result) {
      toast.success('Invoice marked as paid');
    } else {
      toast.error('Failed to mark as paid');
    }
  }, [updateInvoice, toast]);

  // ── Delete invoice ──
  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    const success = await deleteInvoice(id);
    if (success) {
      toast.success('Invoice deleted');
    } else {
      toast.error('Failed to delete invoice');
    }
    setDeletingId(null);
  }, [deleteInvoice, toast]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="h-4 w-16 bg-[var(--od-bg-tertiary)] rounded animate-pulse mx-auto mb-2" />
                <div className="h-6 w-20 bg-[var(--od-bg-tertiary)] rounded animate-pulse mx-auto" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center gap-2 text-[var(--od-text-muted)]">
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Loading invoices...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-[var(--od-text-muted)] mb-1">Total Invoiced</p>
            <p className="text-lg font-bold text-[var(--od-text-primary)]">
              {currency(summaryTotals.totalInvoiced)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-[var(--od-text-muted)] mb-1">Paid</p>
            <p className="text-lg font-bold text-[#1F9B5A]">
              {currency(summaryTotals.totalPaid)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-[var(--od-text-muted)] mb-1">Outstanding</p>
            <p className={`text-lg font-bold ${summaryTotals.outstanding > 0 ? 'text-[#C44E56]' : 'text-[var(--od-text-primary)]'}`}>
              {currency(summaryTotals.outstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice list + form */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Invoices</CardTitle>
          {!showForm && (
            <Button variant="accent" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" />
              Create Invoice
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {/* Create / Edit form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 mb-4 rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-[var(--od-text-primary)]">
                      {editingId ? 'Edit Invoice' : 'New Invoice'}
                    </h3>
                    <button
                      onClick={resetForm}
                      className="p-1 rounded hover:bg-[var(--od-bg-tertiary)] text-[var(--od-text-muted)] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Line items table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--od-border-subtle)]">
                          <th className="text-left py-2 px-2 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
                            Description
                          </th>
                          <th className="text-center py-2 px-2 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider w-20">
                            Qty
                          </th>
                          <th className="text-right py-2 px-2 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider w-28">
                            Unit Price
                          </th>
                          <th className="text-right py-2 px-2 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider w-28">
                            Amount
                          </th>
                          <th className="w-10" />
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, index) => (
                          <tr key={index} className="border-b border-[var(--od-border-subtle)] last:border-0">
                            <td className="py-2 px-1">
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                placeholder="Item description"
                                className="w-full px-2 py-1.5 rounded-md border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] outline-none focus:ring-1 focus:ring-[var(--od-accent)]/30"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full px-2 py-1.5 rounded-md border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] text-sm text-[var(--od-text-primary)] text-center outline-none focus:ring-1 focus:ring-[var(--od-accent)]/30"
                              />
                            </td>
                            <td className="py-2 px-1">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.unit_price || ''}
                                onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                                className="w-full px-2 py-1.5 rounded-md border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] text-sm text-[var(--od-text-primary)] text-right outline-none focus:ring-1 focus:ring-[var(--od-accent)]/30"
                              />
                            </td>
                            <td className="py-2 px-2 text-right text-sm font-medium text-[var(--od-text-primary)]">
                              {currency(item.quantity * item.unit_price)}
                            </td>
                            <td className="py-2 px-1">
                              {lineItems.length > 1 && (
                                <button
                                  onClick={() => removeLineItem(index)}
                                  className="p-1 rounded hover:bg-[var(--od-bg-tertiary)] text-[var(--od-text-muted)] hover:text-[#C44E56] transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <Button variant="ghost" size="sm" onClick={addLineItem}>
                    <Plus className="w-3.5 h-3.5" />
                    Add Line Item
                  </Button>

                  {/* Totals + settings row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-[var(--od-text-secondary)]">
                            Tax Rate (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={taxRate}
                            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                            className="w-full h-10 px-3 rounded-[var(--od-radius-md)] border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] text-sm text-[var(--od-text-primary)] outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30"
                          />
                        </div>
                        <Input
                          label="Due Date"
                          type="date"
                          value={dueDate}
                          onChange={(e) => setDueDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-[var(--od-text-secondary)]">
                          Notes
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Optional notes for the client..."
                          rows={2}
                          className="w-full px-3 py-2 rounded-[var(--od-radius-md)] border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] resize-none outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30"
                        />
                      </div>
                    </div>

                    {/* Running totals */}
                    <div className="flex flex-col justify-end">
                      <div className="rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--od-text-muted)]">Subtotal</span>
                          <span className="text-[var(--od-text-primary)] font-medium">{currency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[var(--od-text-muted)]">GST ({taxRate}%)</span>
                          <span className="text-[var(--od-text-primary)]">{currency(taxAmount)}</span>
                        </div>
                        <div className="flex justify-between text-sm pt-2 border-t border-[var(--od-border-subtle)]">
                          <span className="text-[var(--od-text-primary)] font-semibold">Total</span>
                          <span className="text-[var(--od-text-primary)] font-bold text-base">{currency(total)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="ghost" size="sm" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button variant="accent" size="sm" onClick={handleSave} disabled={saving}>
                      {saving
                        ? editingId ? 'Updating...' : 'Creating...'
                        : editingId ? 'Update Invoice' : 'Create Invoice'
                      }
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Invoice list */}
          {invoices.length === 0 && !showForm ? (
            <EmptyState
              icon={DollarSign}
              title="No invoices yet"
              description="Create and send professional invoices to your clients."
              action={{ label: 'Create First Invoice', onClick: () => setShowForm(true) }}
            />
          ) : invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--od-border-subtle)]">
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
                      Due
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
                      Total
                    </th>
                    <th className="text-center py-2.5 px-3 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-[var(--od-border-subtle)] last:border-0 hover:bg-[var(--od-bg-tertiary)] transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-[var(--od-text-muted)]" />
                          <span className="font-medium text-[var(--od-text-primary)]">
                            {inv.invoice_number}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[var(--od-text-tertiary)]">
                        {formatDate(inv.created_at)}
                      </td>
                      <td className="py-3 px-3 text-[var(--od-text-tertiary)]">
                        {formatDate(inv.due_date)}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-[var(--od-text-primary)]">
                        {currency(Number(inv.total))}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={STATUS_BADGE_VARIANT[inv.status] || 'default'} size="sm">
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-end gap-1">
                          {/* Edit — only for drafts */}
                          {inv.status === 'draft' && (
                            <button
                              onClick={() => startEdit(inv)}
                              className="p-1.5 rounded-md hover:bg-[var(--od-bg-tertiary)] text-[var(--od-text-muted)] hover:text-[var(--od-text-primary)] transition-colors"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Send — for draft or sent */}
                          {(inv.status === 'draft' || inv.status === 'sent') && (
                            <button
                              onClick={() => handleSend(inv.id)}
                              disabled={sendingId === inv.id}
                              className="p-1.5 rounded-md hover:bg-[var(--od-bg-tertiary)] text-[var(--od-accent)] hover:text-[var(--od-accent)] transition-colors disabled:opacity-50"
                              title="Send via email"
                            >
                              {sendingId === inv.id ? (
                                <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Mark Paid — for sent or overdue */}
                          {(inv.status === 'sent' || inv.status === 'overdue') && (
                            <button
                              onClick={() => handleMarkPaid(inv.id)}
                              className="p-1.5 rounded-md hover:bg-[var(--od-bg-tertiary)] text-[#1F9B5A] transition-colors"
                              title="Mark as paid"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete — only for drafts and cancelled */}
                          {(inv.status === 'draft' || inv.status === 'cancelled') && (
                            <button
                              onClick={() => handleDelete(inv.id)}
                              disabled={deletingId === inv.id}
                              className="p-1.5 rounded-md hover:bg-[var(--od-bg-tertiary)] text-[var(--od-text-muted)] hover:text-[#C44E56] transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
