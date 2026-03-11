'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useQuotes } from '@/hooks/use-quotes';
import { usePlan } from '@/hooks/use-plan';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import {
  FileText,
  Plus,
  Eye,
  Send,
  MoreHorizontal,
  DollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  Copy,
  Trash2,
  X,
  Download,
  Sparkles,
} from 'lucide-react';

interface Quote {
  id: string;
  number: string;
  leadName: string;
  email: string;
  total: number;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected';
  createdAt: string;
  expiresAt: string;
  items: number;
  isAiGenerated?: boolean;
}

const mockQuotes: Quote[] = [
  { id: '1', number: 'QT-001', leadName: 'Sarah Mitchell', email: 'sarah@email.com', total: 12500, status: 'accepted', createdAt: '2026-03-01', expiresAt: '2026-03-31', items: 4 },
  { id: '2', number: 'QT-002', leadName: 'James Cooper', email: 'james@email.com', total: 3200, status: 'sent', createdAt: '2026-03-03', expiresAt: '2026-04-03', items: 2 },
  { id: '3', number: 'QT-003', leadName: 'Lisa Wang', email: 'lisa@email.com', total: 8750, status: 'viewed', createdAt: '2026-03-04', expiresAt: '2026-04-04', items: 5 },
  { id: '4', number: 'QT-004', leadName: 'David Brooks', email: 'david@email.com', total: 15000, status: 'draft', createdAt: '2026-03-05', expiresAt: '2026-04-05', items: 6 },
  { id: '5', number: 'QT-005', leadName: 'Emma Taylor', email: 'emma@email.com', total: 2100, status: 'rejected', createdAt: '2026-02-25', expiresAt: '2026-03-25', items: 1 },
  { id: '6', number: 'QT-006', leadName: 'Michael Chen', email: 'michael@email.com', total: 6400, status: 'sent', createdAt: '2026-03-06', expiresAt: '2026-04-06', items: 3 },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  draft: { label: 'Draft', color: '#6B7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.15)' },
  sent: { label: 'Sent', color: '#4070D0', bg: 'rgba(91,141,239,0.08)', border: 'rgba(91,141,239,0.15)' },
  viewed: { label: 'Viewed', color: '#C48020', bg: 'rgba(240,160,48,0.08)', border: 'rgba(240,160,48,0.15)' },
  accepted: { label: 'Accepted', color: '#1F9B5A', bg: 'rgba(52,199,123,0.08)', border: 'rgba(52,199,123,0.15)' },
  rejected: { label: 'Rejected', color: '#C44E56', bg: 'rgba(232,99,108,0.08)', border: 'rgba(232,99,108,0.15)' },
};

export default function QuotesPage() {
  const { organization } = useOrganization();
  const { quotes: fetchedQuotes, loading, sendQuote, createQuote } = useQuotes(organization?.id);
  const { canUseQuotes, planName, loading: planLoading } = usePlan();
  const { success: showSuccess } = useToast();
  const [actionsOpen, setActionsOpen] = useState<string | null>(null);
  const [localQuotes, setLocalQuotes] = useState(mockQuotes);
  const [showNewQuoteModal, setShowNewQuoteModal] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<Quote | null>(null);
  const [quoteSaving, setQuoteSaving] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ title: '', leadName: '', leadEmail: '', amount: '', notes: '' });

  if (planLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[var(--od-accent)] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!canUseQuotes) {
    return <UpgradeBanner feature="Quotes" requiredPlan="Professional" currentPlan={planName} />;
  }

  const quotes: Quote[] = fetchedQuotes.length > 0
    ? fetchedQuotes.map((q) => ({
        id: q.id,
        number: q.quote_number,
        leadName: q.lead_name || '',
        email: q.lead_email || '',
        total: q.total,
        status: q.status === 'declined' ? 'rejected' as const : q.status === 'expired' ? 'draft' as const : q.status,
        createdAt: q.created_at.split('T')[0],
        expiresAt: q.valid_until?.split('T')[0] || '',
        items: q.line_items?.length || 0,
        isAiGenerated: (q as any).is_ai_generated || false,
      }))
    : localQuotes;

  const openNewQuote = () => {
    setQuoteForm({ title: '', leadName: '', leadEmail: '', amount: '', notes: '' });
    setShowNewQuoteModal(true);
  };

  const handleCreateQuote = async () => {
    if (!quoteForm.title || !quoteForm.leadName) return;
    setQuoteSaving(true);
    try {
      const amount = parseFloat(quoteForm.amount) || 0;
      if (fetchedQuotes.length > 0) {
        await createQuote({
          lead_id: '',
          title: quoteForm.title,
          line_items: [{ description: quoteForm.title, quantity: 1, unit_price: amount, total: amount }],
          notes: quoteForm.notes || undefined,
        });
      } else {
        const newQuote: Quote = {
          id: `mock-${Date.now()}`,
          number: `QT-${String(localQuotes.length + 1).padStart(3, '0')}`,
          leadName: quoteForm.leadName,
          email: quoteForm.leadEmail,
          total: amount,
          status: 'draft',
          createdAt: new Date().toISOString().split('T')[0],
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          items: 1,
        };
        setLocalQuotes((prev) => [newQuote, ...prev]);
      }
      setShowNewQuoteModal(false);
      setQuoteForm({ title: '', leadName: '', leadEmail: '', amount: '', notes: '' });
      showSuccess('Quote created successfully');
    } finally {
      setQuoteSaving(false);
    }
  };

  const handleSendQuote = async (quoteId: string) => {
    if (fetchedQuotes.length > 0) {
      await sendQuote(quoteId);
    } else {
      setLocalQuotes((prev) =>
        prev.map((q) => (q.id === quoteId ? { ...q, status: 'sent' as const } : q))
      );
    }
    showSuccess('Quote sent successfully');
  };

  const exportQuotesCSV = () => {
    const header = 'Quote #,Client,Email,Total,Status,Created,Expires\n';
    const rows = quotes.map((q) => `${q.number},${q.leadName},${q.email},${q.total},${q.status},${q.createdAt},${q.expiresAt}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quotes-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Quotes exported');
  };

  const handleDuplicate = (quote: Quote) => {
    setQuoteForm({
      title: `${quote.leadName} - Copy`,
      leadName: quote.leadName,
      leadEmail: quote.email,
      amount: quote.total.toString(),
      notes: '',
    });
    setShowNewQuoteModal(true);
  };

  const totalQuotes = quotes.length;
  const pending = quotes.filter((q) => q.status === 'sent' || q.status === 'viewed').length;
  const accepted = quotes.filter((q) => q.status === 'accepted').length;
  const conversionRate = totalQuotes > 0 ? Math.round((accepted / totalQuotes) * 100) : 0;

  const stats = [
    { label: 'Total Quotes', value: totalQuotes.toString(), icon: FileText, color: '#5B8DEF' },
    { label: 'Pending', value: pending.toString(), icon: Clock, color: '#F0A030' },
    { label: 'Accepted', value: accepted.toString(), icon: CheckCircle2, color: '#34C77B' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, color: '#4FD1E5' },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
              Quotes &amp; Estimates
            </h1>
            <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
              Auto-generated from leads &middot; review and send
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={exportQuotesCSV}>
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
            <Button size="sm" onClick={openNewQuote}>
              <Plus className="w-3.5 h-3.5" />
              New Quote
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--od-text-muted)]">
            <div className="w-3 h-3 border-2 border-[var(--od-accent)] border-t-transparent rounded-full animate-spin" />
            Loading quotes...
          </div>
        )}
        {/* Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold text-[var(--od-text-primary)] mt-1">
                        {stat.value}
                      </p>
                    </div>
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-lg"
                      style={{ backgroundColor: `${stat.color}12` }}
                    >
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Quotes Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            {quotes.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No quotes yet"
                description="Create your first quote to send professional estimates to your leads."
                action={{ label: 'Create Quote', onClick: openNewQuote }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--od-border-subtle)]">
                      <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 pr-4">Quote #</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 pr-4">Lead</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 pr-4">Total</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 pr-4">Status</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3 pr-4">Created</th>
                      <th className="text-right text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider pb-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotes.map((quote, i) => {
                      const sc = statusConfig[quote.status];
                      return (
                        <motion.tr
                          key={quote.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-[var(--od-border-subtle)] last:border-0 hover:bg-[var(--od-bg-tertiary)]/50 transition-colors"
                        >
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-semibold text-[var(--od-accent)]">{quote.number}</span>
                              {quote.isAiGenerated && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1 py-0.5 rounded bg-[var(--od-accent)]/10 text-[var(--od-accent)]">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  AI
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-sm font-medium text-[var(--od-text-primary)]">{quote.leadName}</p>
                            <p className="text-xs text-[var(--od-text-muted)]">{quote.email}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-sm font-semibold text-[var(--od-text-primary)]">
                              ${quote.total.toLocaleString()}
                            </span>
                            <p className="text-[10px] text-[var(--od-text-muted)]">{quote.items} items</p>
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] border"
                              style={{ color: sc.color, backgroundColor: sc.bg, borderColor: sc.border }}
                            >
                              {sc.label}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-xs text-[var(--od-text-tertiary)]">{quote.createdAt}</span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1 relative">
                              <Button variant="ghost" size="icon-sm" title="View" onClick={() => setViewingQuote(quote)}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              {quote.status === 'draft' && (
                                <Button variant="ghost" size="icon-sm" title="Send" onClick={() => handleSendQuote(quote.id)}>
                                  <Send className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon-sm" title="Duplicate" onClick={() => handleDuplicate(quote)}>
                                <Copy className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Quote Modal */}
      {showNewQuoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowNewQuoteModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-[var(--od-radius-lg)] border border-[var(--od-border-subtle)] shadow-xl w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--od-border-subtle)]">
              <h2 className="text-base font-semibold text-[var(--od-text-primary)]">New Quote</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowNewQuoteModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1 block">Quote Title</label>
                <input
                  value={quoteForm.title}
                  onChange={(e) => setQuoteForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-white text-[var(--od-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]"
                  placeholder="e.g. Kitchen Renovation Quote"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1 block">Client Name</label>
                  <input
                    value={quoteForm.leadName}
                    onChange={(e) => setQuoteForm((f) => ({ ...f, leadName: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-white text-[var(--od-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]"
                    placeholder="Client name"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1 block">Client Email</label>
                  <input
                    type="email"
                    value={quoteForm.leadEmail}
                    onChange={(e) => setQuoteForm((f) => ({ ...f, leadEmail: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-white text-[var(--od-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]"
                    placeholder="client@email.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1 block">Amount ($)</label>
                <input
                  type="number"
                  value={quoteForm.amount}
                  onChange={(e) => setQuoteForm((f) => ({ ...f, amount: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-white text-[var(--od-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1 block">Notes</label>
                <textarea
                  value={quoteForm.notes}
                  onChange={(e) => setQuoteForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-white text-[var(--od-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)] resize-none"
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--od-border-subtle)]">
              <Button variant="ghost" size="sm" onClick={() => setShowNewQuoteModal(false)}>Cancel</Button>
              <Button size="sm" disabled={!quoteForm.title || !quoteForm.leadName || quoteSaving} onClick={handleCreateQuote}>
                {quoteSaving ? 'Creating...' : 'Create Quote'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* View Quote Modal */}
      {viewingQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewingQuote(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-[var(--od-radius-lg)] border border-[var(--od-border-subtle)] shadow-xl w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--od-border-subtle)]">
              <h2 className="text-base font-semibold text-[var(--od-text-primary)]">{viewingQuote.number}</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setViewingQuote(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">Client</p>
                  <p className="text-sm font-medium text-[var(--od-text-primary)] mt-1">{viewingQuote.leadName}</p>
                  <p className="text-xs text-[var(--od-text-muted)]">{viewingQuote.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">Status</p>
                  <span
                    className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-[4px] border mt-1"
                    style={{
                      color: statusConfig[viewingQuote.status].color,
                      backgroundColor: statusConfig[viewingQuote.status].bg,
                      borderColor: statusConfig[viewingQuote.status].border,
                    }}
                  >
                    {statusConfig[viewingQuote.status].label}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">Total</p>
                  <p className="text-xl font-bold text-[var(--od-text-primary)] mt-1">${viewingQuote.total.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">Items</p>
                  <p className="text-sm text-[var(--od-text-primary)] mt-1">{viewingQuote.items} line items</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">Created</p>
                  <p className="text-sm text-[var(--od-text-primary)] mt-1">{viewingQuote.createdAt}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">Expires</p>
                  <p className="text-sm text-[var(--od-text-primary)] mt-1">{viewingQuote.expiresAt}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--od-border-subtle)]">
              {viewingQuote.status === 'draft' && (
                <Button size="sm" onClick={() => { handleSendQuote(viewingQuote.id); setViewingQuote(null); }}>
                  <Send className="w-3.5 h-3.5" />
                  Send Quote
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setViewingQuote(null)}>Close</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
