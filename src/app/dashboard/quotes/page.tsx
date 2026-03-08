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
  const { quotes: fetchedQuotes, loading, sendQuote } = useQuotes(organization?.id);
  const { canUseQuotes, planName, loading: planLoading } = usePlan();
  const [actionsOpen, setActionsOpen] = useState<string | null>(null);

  if (planLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[var(--le-accent)] border-t-transparent rounded-full animate-spin" /></div>;
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
      }))
    : mockQuotes;

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
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
              Quotes &amp; Estimates
            </h1>
            <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
              Create and manage quotes for your leads
            </p>
          </div>
          <Button size="sm">
            <Plus className="w-3.5 h-3.5" />
            New Quote
          </Button>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--le-text-muted)]">
            <div className="w-3 h-3 border-2 border-[var(--le-accent)] border-t-transparent rounded-full animate-spin" />
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
                      <p className="text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold text-[var(--le-text-primary)] mt-1">
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
                action={{ label: 'Create Quote', onClick: () => {} }}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--le-border-subtle)]">
                      <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 pr-4">Quote #</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 pr-4">Lead</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 pr-4">Total</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 pr-4">Status</th>
                      <th className="text-left text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3 pr-4">Created</th>
                      <th className="text-right text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider pb-3">Actions</th>
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
                          className="border-b border-[var(--le-border-subtle)] last:border-0 hover:bg-[var(--le-bg-tertiary)]/50 transition-colors"
                        >
                          <td className="py-3 pr-4">
                            <span className="text-sm font-semibold text-[var(--le-accent)]">{quote.number}</span>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-sm font-medium text-[var(--le-text-primary)]">{quote.leadName}</p>
                            <p className="text-xs text-[var(--le-text-muted)]">{quote.email}</p>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-sm font-semibold text-[var(--le-text-primary)]">
                              ${quote.total.toLocaleString()}
                            </span>
                            <p className="text-[10px] text-[var(--le-text-muted)]">{quote.items} items</p>
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
                            <span className="text-xs text-[var(--le-text-tertiary)]">{quote.createdAt}</span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1 relative">
                              <Button variant="ghost" size="icon-sm" title="View">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              {quote.status === 'draft' && (
                                <Button variant="ghost" size="icon-sm" title="Send">
                                  <Send className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <Button variant="ghost" size="icon-sm" title="Duplicate">
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
    </div>
  );
}
