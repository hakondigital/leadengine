'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Trash2,
  Save,
  X,
  Plus,
  FileText,
  MessageSquare,
  Receipt,
  Briefcase,
  RefreshCw,
  Copy,
  Check,
  Star,
  Clock,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { useOrganization } from '@/hooks/use-organization';
import { useClients } from '@/hooks/use-clients';
import type {
  Client,
  ClientStatus,
  ClientActivity,
  ClientActivityType,
  Json,
} from '@/lib/database.types';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

type TabKey = 'overview' | 'communications' | 'quotes' | 'financials' | 'notes';

interface ClientDetail extends Client {
  leads?: Array<Record<string, unknown>>;
  activities?: ClientActivity[];
  quotes?: Array<Record<string, unknown>>;
  appointments?: Array<Record<string, unknown>>;
  inbox_messages?: Array<Record<string, unknown>>;
}

interface InvoiceRow {
  id: string;
  description: string;
  amount: number;
  status: 'paid' | 'unpaid' | 'overdue';
  date: string;
}

interface TimelineEntry {
  id: string;
  type: string;
  date: string;
  summary: string;
  data: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function displayName(c: Client): string {
  if (c.type === 'company' && c.company_name) return c.company_name;
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed';
}

function initials(first: string, last: string, company?: string | null): string {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (company) return company.slice(0, 2).toUpperCase();
  return '??';
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function currency(v: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(v);
}

function fullAddress(c: Client): string | null {
  const parts = [c.address, c.city, c.state, c.postcode].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

const statusConfig: Record<
  ClientStatus,
  { label: string; variant: 'success' | 'warning' | 'default' | 'error'; dot: boolean }
> = {
  active: { label: 'Active', variant: 'success', dot: true },
  vip: { label: 'VIP', variant: 'warning', dot: true },
  inactive: { label: 'Inactive', variant: 'default', dot: true },
  archived: { label: 'Archived', variant: 'error', dot: true },
};

const avatarColors = [
  'from-[#4FD1E5] to-[#5B8DEF]',
  'from-[#8B7CF6] to-[#5B8DEF]',
  'from-[#34C77B] to-[#4FD1E5]',
  'from-[#F0A030] to-[#E8636C]',
  'from-[#E8636C] to-[#8B7CF6]',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

const activityIcons: Record<string, React.ElementType> = {
  note: FileText,
  email: Mail,
  sms: MessageSquare,
  call: Phone,
  quote: Receipt,
  job: Briefcase,
  payment: DollarSign,
  status_change: RefreshCw,
};

const tabLabels: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'communications', label: 'Communications' },
  { key: 'quotes', label: 'Quotes & Jobs' },
  { key: 'financials', label: 'Financials' },
  { key: 'notes', label: 'Notes' },
];

// ──────────────────────────────────────────────
// Animations
// ──────────────────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────

export default function ClientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const router = useRouter();
  const toast = useToast();
  const { organization } = useOrganization();
  const { updateClient, deleteClient } = useClients(organization?.id);

  // ── State ──
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  // Editable stat fields
  const [editingStat, setEditingStat] = useState<string | null>(null);
  const [statValue, setStatValue] = useState('');

  // Notes
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Financials
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [addingInvoice, setAddingInvoice] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState<Omit<InvoiceRow, 'id'>>({
    description: '',
    amount: 0,
    status: 'unpaid',
    date: new Date().toISOString().slice(0, 10),
  });

  // ── Fetch client ──
  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) {
        setNotFound(true);
        return;
      }
      const data: ClientDetail = await res.json();
      setClient(data);

      // Extract invoices from payment activities
      const paymentActivities = (data.activities || []).filter(
        (a) => a.type === 'payment'
      );
      const extractedInvoices: InvoiceRow[] = paymentActivities.map((a) => {
        const meta = (a.metadata || {}) as Record<string, unknown>;
        return {
          id: a.id,
          description: a.title || 'Invoice',
          amount: (meta.amount as number) || 0,
          status: (meta.status as 'paid' | 'unpaid' | 'overdue') || 'unpaid',
          date: (meta.date as string) || a.created_at,
        };
      });
      setInvoices(extractedInvoices);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ── Fetch timeline ──
  const fetchTimeline = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}/timeline`);
      if (res.ok) {
        const data = await res.json();
        setTimeline(data.timeline || []);
      }
    } catch {
      // silent fail
    }
  }, [id]);

  useEffect(() => {
    fetchClient();
    fetchTimeline();
  }, [fetchClient, fetchTimeline]);

  // ── Clipboard ──
  const copyToClipboard = useCallback(
    (text: string, field: string) => {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    },
    [toast]
  );

  // ── Edit contact ──
  const startEditing = useCallback(() => {
    if (!client) return;
    setEditForm({
      first_name: client.first_name,
      last_name: client.last_name,
      email: client.email,
      phone: client.phone,
      company_name: client.company_name,
      company_abn: client.company_abn,
      job_title: client.job_title,
      address: client.address,
      city: client.city,
      state: client.state,
      postcode: client.postcode,
      tags: client.tags,
    });
    setEditing(true);
  }, [client]);

  const cancelEditing = useCallback(() => {
    setEditing(false);
    setEditForm({});
  }, []);

  const saveContact = useCallback(async () => {
    if (!client) return;
    try {
      setSaving(true);
      const updated = await updateClient(client.id, editForm);
      setClient((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditing(false);
      toast.success('Contact details updated');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }, [client, editForm, updateClient, toast]);

  // ── Edit stat ──
  const saveStatValue = useCallback(
    async (field: string) => {
      if (!client) return;
      const numVal = parseFloat(statValue) || 0;
      try {
        const updated = await updateClient(client.id, { [field]: numVal });
        setClient((prev) => (prev ? { ...prev, ...updated } : prev));
        setEditingStat(null);
        toast.success('Updated successfully');
      } catch (err) {
        toast.error((err as Error).message);
      }
    },
    [client, statValue, updateClient, toast]
  );

  // ── Delete ──
  const handleDelete = useCallback(async () => {
    if (!client) return;
    try {
      setDeleting(true);
      await deleteClient(client.id);
      toast.success('Client deleted');
      router.push('/dashboard/clients');
    } catch (err) {
      toast.error((err as Error).message);
      setDeleting(false);
    }
  }, [client, deleteClient, toast, router]);

  // ── Add note ──
  const addNote = useCallback(async () => {
    if (!client || !newNote.trim()) return;
    try {
      setAddingNote(true);
      const res = await fetch(`/api/clients/${client.id}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          title: 'Note added',
          description: newNote.trim(),
          organization_id: client.organization_id,
        }),
      });
      if (!res.ok) {
        // If POST not supported, create via client_activities pattern
        // For now just store locally
        const fakeActivity: ClientActivity = {
          id: `local-${Date.now()}`,
          client_id: client.id,
          organization_id: client.organization_id,
          type: 'note',
          title: 'Note added',
          description: newNote.trim(),
          metadata: {} as Json,
          created_by: null,
          created_at: new Date().toISOString(),
        };
        setClient((prev) =>
          prev
            ? { ...prev, activities: [fakeActivity, ...(prev.activities || [])] }
            : prev
        );
      } else {
        await fetchClient();
        await fetchTimeline();
      }
      setNewNote('');
      toast.success('Note added');
    } catch {
      toast.error('Failed to add note');
    } finally {
      setAddingNote(false);
    }
  }, [client, newNote, toast, fetchClient, fetchTimeline]);

  // ── Add invoice ──
  const addInvoice = useCallback(async () => {
    if (!client || !invoiceForm.description.trim() || invoiceForm.amount <= 0) {
      toast.warning('Please fill in description and amount');
      return;
    }
    try {
      setAddingInvoice(true);
      const res = await fetch(`/api/clients/${client.id}/timeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment',
          title: invoiceForm.description,
          description: `${currency(invoiceForm.amount)} — ${invoiceForm.status}`,
          organization_id: client.organization_id,
          metadata: {
            amount: invoiceForm.amount,
            status: invoiceForm.status,
            date: invoiceForm.date,
          },
        }),
      });

      const newInvoice: InvoiceRow = {
        id: `local-${Date.now()}`,
        ...invoiceForm,
      };
      setInvoices((prev) => [newInvoice, ...prev]);

      // Update financial stats
      const newInvoiced = (client.total_invoiced || 0) + invoiceForm.amount;
      const newPaid =
        invoiceForm.status === 'paid'
          ? (client.total_paid || 0) + invoiceForm.amount
          : client.total_paid || 0;
      await updateClient(client.id, {
        total_invoiced: newInvoiced,
        total_paid: newPaid,
      });
      setClient((prev) =>
        prev
          ? {
              ...prev,
              total_invoiced: newInvoiced,
              total_paid: newPaid,
              outstanding_balance: newInvoiced - newPaid,
            }
          : prev
      );

      setInvoiceForm({
        description: '',
        amount: 0,
        status: 'unpaid',
        date: new Date().toISOString().slice(0, 10),
      });

      if (res.ok) {
        await fetchClient();
      }
      toast.success('Invoice added');
    } catch {
      toast.error('Failed to add invoice');
    } finally {
      setAddingInvoice(false);
    }
  }, [client, invoiceForm, toast, updateClient, fetchClient]);

  // ── Derived data ──
  const notes = useMemo(
    () =>
      (client?.activities || []).filter((a) => a.type === 'note').sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [client?.activities]
  );

  const communications = useMemo(
    () =>
      timeline.filter(
        (t) =>
          t.type === 'email' ||
          t.type === 'sms' ||
          t.type === 'inbox_message' ||
          (t.type === 'activity' && ['email', 'sms', 'call'].includes((t.data?.type as string) || ''))
      ),
    [timeline]
  );

  const quotesData = useMemo(() => client?.quotes || [], [client?.quotes]);

  const wonLeads = useMemo(
    () => (client?.leads || []).filter((l) => (l.status as string) === 'won'),
    [client?.leads]
  );

  const invoiceTotals = useMemo(() => {
    const total = invoices.reduce((s, i) => s + i.amount, 0);
    const paid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
    const outstanding = invoices.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.amount, 0);
    return { total, paid, outstanding };
  }, [invoices]);

  // ── Loading state ──
  if (loading) {
    return (
      <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--od-bg-primary)' }}>
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Skeleton header */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 rounded-[var(--od-radius-md)] bg-[var(--od-bg-tertiary)] animate-pulse" />
          </div>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-[var(--od-bg-tertiary)] animate-pulse" />
            <div className="space-y-2">
              <div className="h-7 w-48 rounded-[var(--od-radius-md)] bg-[var(--od-bg-tertiary)] animate-pulse" />
              <div className="h-4 w-32 rounded-[var(--od-radius-md)] bg-[var(--od-bg-tertiary)] animate-pulse" />
            </div>
          </div>
          {/* Skeleton stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-[var(--od-radius-lg)] bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)] animate-pulse"
              />
            ))}
          </div>
          {/* Skeleton tabs */}
          <div className="h-10 w-full rounded-[var(--od-radius-md)] bg-[var(--od-bg-tertiary)] animate-pulse" />
          {/* Skeleton content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64 rounded-[var(--od-radius-lg)] bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)] animate-pulse" />
            <div className="h-64 rounded-[var(--od-radius-lg)] bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not found ──
  if (notFound || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--od-bg-primary)' }}>
        <motion.div {...fadeUp} className="text-center max-w-md">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] mx-auto mb-5">
            <User className="w-7 h-7 text-[var(--od-text-muted)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--od-text-primary)] mb-2">Client not found</h2>
          <p className="text-sm text-[var(--od-text-tertiary)] mb-6">
            This client may have been deleted or the link is incorrect.
          </p>
          <Button variant="secondary" onClick={() => router.push('/dashboard/clients')}>
            <ArrowLeft className="w-4 h-4" />
            Back to Clients
          </Button>
        </motion.div>
      </div>
    );
  }

  const name = displayName(client);
  const avatar = initials(client.first_name, client.last_name, client.company_name);
  const colorClass = getAvatarColor(client.id);
  const statusCfg = statusConfig[client.status] || statusConfig.active;
  const address = fullAddress(client);

  // ── Stat cards data ──
  const stats = [
    {
      key: 'total_invoiced',
      label: 'Total Invoiced',
      value: client.total_invoiced || 0,
      icon: DollarSign,
      color: 'text-[var(--od-text-secondary)]',
      bgColor: 'bg-[var(--od-bg-tertiary)]',
    },
    {
      key: 'total_paid',
      label: 'Total Paid',
      value: client.total_paid || 0,
      icon: CheckCircle2,
      color: 'text-[#1F9B5A]',
      bgColor: 'bg-[#34C77B]/8',
    },
    {
      key: 'outstanding_balance',
      label: 'Outstanding',
      value: client.outstanding_balance || 0,
      icon: AlertCircle,
      color: (client.outstanding_balance || 0) > 0 ? 'text-[#C44E56]' : 'text-[var(--od-text-secondary)]',
      bgColor: (client.outstanding_balance || 0) > 0 ? 'bg-[#E8636C]/8' : 'bg-[var(--od-bg-tertiary)]',
    },
    {
      key: 'lifetime_value',
      label: 'Lifetime Value',
      value: client.lifetime_value || 0,
      icon: TrendingUp,
      color: 'text-[var(--od-accent-text)]',
      bgColor: 'bg-[var(--od-accent-muted)]',
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--od-bg-primary)' }}>
      <motion.div
        className="max-w-6xl mx-auto space-y-6"
        initial="initial"
        animate="animate"
        variants={stagger}
      >
        {/* ── Header ── */}
        <motion.div variants={fadeUp}>
          {/* Back button */}
          <button
            onClick={() => router.push('/dashboard/clients')}
            className="inline-flex items-center gap-1.5 text-sm text-[var(--od-text-tertiary)] hover:text-[var(--od-text-primary)] transition-colors mb-4 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            Clients
          </button>

          {/* Name row */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-4 flex-1 min-w-0">
              {/* Avatar */}
              <div
                className={`shrink-0 w-14 h-14 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center shadow-lg`}
              >
                <span className="text-white font-bold text-lg">{avatar}</span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold text-[var(--od-text-primary)] tracking-tight truncate">
                    {name}
                  </h1>
                  <Badge variant={statusCfg.variant} dot={statusCfg.dot} size="md">
                    {statusCfg.label}
                  </Badge>
                  {client.type === 'company' && (
                    <Badge variant="info" size="sm">
                      <Building2 className="w-3 h-3" />
                      Company
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
                  Client since {formatDate(client.created_at)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="secondary" size="sm" onClick={startEditing}>
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </Button>
            </div>
          </div>

          {/* Contact row */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-sm text-[var(--od-text-secondary)]">
            {client.email && (
              <button
                onClick={() => copyToClipboard(client.email!, 'email')}
                className="inline-flex items-center gap-1.5 hover:text-[var(--od-text-primary)] transition-colors group"
              >
                <Mail className="w-3.5 h-3.5 text-[var(--od-text-muted)]" />
                {client.email}
                {copiedField === 'email' ? (
                  <Check className="w-3 h-3 text-[#1F9B5A]" />
                ) : (
                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            )}
            {client.phone && (
              <button
                onClick={() => copyToClipboard(client.phone!, 'phone')}
                className="inline-flex items-center gap-1.5 hover:text-[var(--od-text-primary)] transition-colors group"
              >
                <Phone className="w-3.5 h-3.5 text-[var(--od-text-muted)]" />
                {client.phone}
                {copiedField === 'phone' ? (
                  <Check className="w-3 h-3 text-[#1F9B5A]" />
                ) : (
                  <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            )}
            {client.company_name && client.type !== 'company' && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[var(--od-text-muted)]" />
                {client.company_name}
              </span>
            )}
            {address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[var(--od-text-muted)]" />
                {address}
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Quick Stats ── */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map((s) => (
            <Card
              key={s.key}
              className="relative overflow-hidden cursor-pointer hover:border-[var(--od-border-strong)] transition-colors"
              onClick={() => {
                if (editingStat !== s.key) {
                  setEditingStat(s.key);
                  setStatValue(String(s.value));
                }
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-[var(--od-radius-md)] ${s.bgColor}`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                  {editingStat === s.key && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          saveStatValue(s.key);
                        }}
                        className="p-1 rounded hover:bg-[var(--od-bg-tertiary)] text-[#1F9B5A]"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingStat(null);
                        }}
                        className="p-1 rounded hover:bg-[var(--od-bg-tertiary)] text-[var(--od-text-muted)]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-[var(--od-text-muted)] mb-1">{s.label}</p>
                {editingStat === s.key ? (
                  <input
                    type="number"
                    value={statValue}
                    onChange={(e) => setStatValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveStatValue(s.key);
                      if (e.key === 'Escape') setEditingStat(null);
                    }}
                    className="w-full bg-transparent border-b border-[var(--od-border-strong)] text-lg font-bold text-[var(--od-text-primary)] outline-none"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <p className="text-lg font-bold text-[var(--od-text-primary)] tracking-tight">
                    {currency(s.value)}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* ── Tabs ── */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-1 overflow-x-auto rounded-[var(--od-radius-lg)] bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)] p-1">
            {tabLabels.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`relative px-4 py-2 text-sm font-medium rounded-[var(--od-radius-md)] transition-all whitespace-nowrap ${
                  activeTab === t.key
                    ? 'text-[var(--od-text-primary)] bg-white shadow-[0_1px_3px_rgba(28,42,58,0.08)]'
                    : 'text-[var(--od-text-tertiary)] hover:text-[var(--od-text-secondary)]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Tab content ── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <OverviewTab
                client={client}
                editing={editing}
                editForm={editForm}
                setEditForm={setEditForm}
                saving={saving}
                onSave={saveContact}
                onCancel={cancelEditing}
                onStartEdit={startEditing}
                activities={client.activities || []}
              />
            )}

            {activeTab === 'communications' && (
              <CommunicationsTab communications={communications} />
            )}

            {activeTab === 'quotes' && (
              <QuotesJobsTab quotes={quotesData} wonLeads={wonLeads} />
            )}

            {activeTab === 'financials' && (
              <FinancialsTab
                invoices={invoices}
                totals={invoiceTotals}
                addingInvoice={addingInvoice}
                invoiceForm={invoiceForm}
                setInvoiceForm={setInvoiceForm}
                onAddInvoice={addInvoice}
              />
            )}

            {activeTab === 'notes' && (
              <NotesTab
                notes={notes}
                newNote={newNote}
                setNewNote={setNewNote}
                addingNote={addingNote}
                onAddNote={addNote}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Delete confirmation ── */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm rounded-[var(--od-radius-lg)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] p-6 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#E8636C]/10 mx-auto mb-4">
                  <Trash2 className="w-5 h-5 text-[#C44E56]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--od-text-primary)] text-center mb-1">
                  Delete client?
                </h3>
                <p className="text-sm text-[var(--od-text-tertiary)] text-center mb-6">
                  This will permanently delete <strong>{name}</strong> and all their data. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════
// Overview Tab
// ══════════════════════════════════════════════

function OverviewTab({
  client,
  editing,
  editForm,
  setEditForm,
  saving,
  onSave,
  onCancel,
  onStartEdit,
  activities,
}: {
  client: ClientDetail;
  editing: boolean;
  editForm: Partial<Client>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<Client>>>;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
  onStartEdit: () => void;
  activities: ClientActivity[];
}) {
  const recentActivities = activities.slice(0, 15);

  const contactFields: {
    key: keyof Client;
    label: string;
    icon: React.ElementType;
    type?: string;
  }[] = [
    { key: 'first_name', label: 'First Name', icon: User },
    { key: 'last_name', label: 'Last Name', icon: User },
    { key: 'email', label: 'Email', icon: Mail, type: 'email' },
    { key: 'phone', label: 'Phone', icon: Phone, type: 'tel' },
    { key: 'company_name', label: 'Company', icon: Building2 },
    { key: 'company_abn', label: 'ABN', icon: FileText },
    { key: 'job_title', label: 'Job Title', icon: Briefcase },
    { key: 'address', label: 'Address', icon: MapPin },
    { key: 'city', label: 'City', icon: MapPin },
    { key: 'state', label: 'State', icon: MapPin },
    { key: 'postcode', label: 'Postcode', icon: MapPin },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
      {/* Left — Contact details */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Contact Details</CardTitle>
            {!editing && (
              <Button variant="ghost" size="icon-sm" onClick={onStartEdit}>
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
            )}
            {editing && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </Button>
                <Button variant="accent" size="sm" onClick={onSave} disabled={saving}>
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {contactFields.map((f) => {
                const value = (client[f.key] as string | null) || '';
                const editValue = f.key in editForm ? String(editForm[f.key] ?? '') : value;
                const Icon = f.icon;

                return (
                  <div key={f.key}>
                    <label className="text-xs font-medium text-[var(--od-text-muted)] flex items-center gap-1.5 mb-1.5">
                      <Icon className="w-3 h-3" />
                      {f.label}
                    </label>
                    {editing ? (
                      <input
                        type={f.type || 'text'}
                        value={editValue}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-[var(--od-radius-md)] border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] text-sm text-[var(--od-text-primary)] outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30 focus:border-[var(--od-accent)]/50 transition-all"
                      />
                    ) : (
                      <p className="text-sm text-[var(--od-text-primary)] py-2">
                        {value || (
                          <span className="text-[var(--od-text-muted)] italic">Not set</span>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Tags */}
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-[var(--od-text-muted)] flex items-center gap-1.5 mb-1.5">
                  <Star className="w-3 h-3" />
                  Tags
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={(editForm.tags || client.tags || []).join(', ')}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                      }))
                    }
                    placeholder="Comma-separated tags"
                    className="w-full px-3 py-2 rounded-[var(--od-radius-md)] border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] text-sm text-[var(--od-text-primary)] outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30 focus:border-[var(--od-accent)]/50 transition-all"
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5 py-2">
                    {(client.tags || []).length > 0 ? (
                      client.tags.map((tag) => (
                        <Badge key={tag} variant="accent" size="sm">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-[var(--od-text-muted)] italic">No tags</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right — Recent Activity */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No activity yet"
                description="Activity will appear here as you interact with this client."
                className="py-8"
              />
            ) : (
              <div className="space-y-0">
                {recentActivities.map((activity, i) => {
                  const Icon = activityIcons[activity.type] || FileText;
                  return (
                    <div
                      key={activity.id}
                      className="relative flex gap-3 pb-4 last:pb-0"
                    >
                      {/* Timeline line */}
                      {i < recentActivities.length - 1 && (
                        <div className="absolute left-[13px] top-7 bottom-0 w-px bg-[var(--od-border-subtle)]" />
                      )}
                      {/* Icon */}
                      <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] flex items-center justify-center z-10">
                        <Icon className="w-3 h-3 text-[var(--od-text-muted)]" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p className="text-sm font-medium text-[var(--od-text-primary)] truncate">
                          {activity.title}
                        </p>
                        {activity.description && (
                          <p className="text-xs text-[var(--od-text-tertiary)] mt-0.5 line-clamp-2">
                            {activity.description}
                          </p>
                        )}
                        <p className="text-xs text-[var(--od-text-muted)] mt-1">
                          {relativeTime(activity.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// Communications Tab
// ══════════════════════════════════════════════

function CommunicationsTab({
  communications,
}: {
  communications: TimelineEntry[];
}) {
  const channelIcons: Record<string, React.ElementType> = {
    email: Mail,
    sms: MessageSquare,
    inbox_message: MessageSquare,
    activity: Phone,
  };

  if (communications.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Mail}
            title="No communications"
            description="Emails, SMS messages, and calls with this client will appear here."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Communications</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {communications.map((item, i) => {
            const Icon = channelIcons[item.type] || Mail;
            const channel = item.type === 'email' ? 'Email' : item.type === 'sms' ? 'SMS' : item.type === 'inbox_message' ? 'Message' : 'Call';
            const direction = (item.data?.direction as string) || '';

            return (
              <div
                key={item.id}
                className="relative flex gap-3 pb-4 last:pb-0"
              >
                {i < communications.length - 1 && (
                  <div className="absolute left-[13px] top-7 bottom-0 w-px bg-[var(--od-border-subtle)]" />
                )}
                <div className="shrink-0 w-7 h-7 rounded-full bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] flex items-center justify-center z-10">
                  <Icon className="w-3 h-3 text-[var(--od-text-muted)]" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" size="sm">{channel}</Badge>
                    {direction && (
                      <span className="text-xs text-[var(--od-text-muted)] capitalize">{direction}</span>
                    )}
                  </div>
                  <p className="text-sm text-[var(--od-text-primary)] mt-1 line-clamp-2">
                    {item.summary}
                  </p>
                  <p className="text-xs text-[var(--od-text-muted)] mt-1">
                    {formatDateTime(item.date)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ══════════════════════════════════════════════
// Quotes & Jobs Tab
// ══════════════════════════════════════════════

function QuotesJobsTab({
  quotes,
  wonLeads,
}: {
  quotes: Array<Record<string, unknown>>;
  wonLeads: Array<Record<string, unknown>>;
}) {
  const quoteStatusVariant: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    draft: 'default',
    sent: 'info',
    viewed: 'info',
    accepted: 'success',
    rejected: 'error',
    expired: 'warning',
  };

  if (quotes.length === 0 && wonLeads.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            icon={Receipt}
            title="No quotes or jobs"
            description="Linked quotes and won jobs for this client will appear here."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quotes */}
      {quotes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quotes ({quotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quotes.map((q) => (
                <div
                  key={q.id as string}
                  className="flex items-center justify-between p-3 rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] hover:border-[var(--od-border-strong)] transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-[var(--od-text-muted)] shrink-0" />
                      <span className="text-sm font-medium text-[var(--od-text-primary)] truncate">
                        {(q.title as string) || (q.quote_number as string) || 'Untitled Quote'}
                      </span>
                      <Badge
                        variant={quoteStatusVariant[(q.status as string) || 'draft'] || 'default'}
                        size="sm"
                      >
                        {((q.status as string) || 'draft').replace('_', ' ')}
                      </Badge>
                    </div>
                    {typeof q.description === 'string' && q.description && (
                      <p className="text-xs text-[var(--od-text-tertiary)] mt-1 ml-6 truncate">
                        {q.description}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-semibold text-[var(--od-text-primary)]">
                      {currency((q.total as number) || 0)}
                    </p>
                    <p className="text-xs text-[var(--od-text-muted)]">
                      {formatDate((q.created_at as string) || new Date().toISOString())}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Won Jobs */}
      {wonLeads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Won Jobs ({wonLeads.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {wonLeads.map((lead) => (
                <div
                  key={lead.id as string}
                  className="flex items-center justify-between p-3 rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] hover:border-[var(--od-border-strong)] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Briefcase className="w-4 h-4 text-[#1F9B5A] shrink-0" />
                    <span className="text-sm font-medium text-[var(--od-text-primary)] truncate">
                      {(lead.name as string) || (lead.service_type as string) || 'Job'}
                    </span>
                    <Badge variant="won" size="sm" dot>Won</Badge>
                  </div>
                  <p className="text-xs text-[var(--od-text-muted)] shrink-0 ml-4">
                    {formatDate((lead.created_at as string) || new Date().toISOString())}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// Financials Tab
// ══════════════════════════════════════════════

function FinancialsTab({
  invoices,
  totals,
  addingInvoice,
  invoiceForm,
  setInvoiceForm,
  onAddInvoice,
}: {
  invoices: InvoiceRow[];
  totals: { total: number; paid: number; outstanding: number };
  addingInvoice: boolean;
  invoiceForm: Omit<InvoiceRow, 'id'>;
  setInvoiceForm: React.Dispatch<React.SetStateAction<Omit<InvoiceRow, 'id'>>>;
  onAddInvoice: () => void;
}) {
  const [showForm, setShowForm] = useState(false);

  const invoiceStatusVariant: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    paid: 'success',
    unpaid: 'warning',
    overdue: 'error',
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-[var(--od-text-muted)] mb-1">Total</p>
            <p className="text-lg font-bold text-[var(--od-text-primary)]">{currency(totals.total)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-[var(--od-text-muted)] mb-1">Paid</p>
            <p className="text-lg font-bold text-[#1F9B5A]">{currency(totals.paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-[var(--od-text-muted)] mb-1">Outstanding</p>
            <p className={`text-lg font-bold ${totals.outstanding > 0 ? 'text-[#C44E56]' : 'text-[var(--od-text-primary)]'}`}>
              {currency(totals.outstanding)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice list */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Invoices</CardTitle>
          <Button variant="accent" size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-3.5 h-3.5" />
            Add Invoice
          </Button>
        </CardHeader>
        <CardContent>
          {/* Add invoice form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-4 mb-4 rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Description"
                      value={invoiceForm.description}
                      onChange={(e) =>
                        setInvoiceForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Invoice description"
                    />
                    <Input
                      label="Amount ($)"
                      type="number"
                      value={invoiceForm.amount || ''}
                      onChange={(e) =>
                        setInvoiceForm((prev) => ({
                          ...prev,
                          amount: parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-[var(--od-text-secondary)] tracking-wide">
                        Status
                      </label>
                      <select
                        value={invoiceForm.status}
                        onChange={(e) =>
                          setInvoiceForm((prev) => ({
                            ...prev,
                            status: e.target.value as 'paid' | 'unpaid' | 'overdue',
                          }))
                        }
                        className="flex h-11 w-full rounded-[var(--od-radius-md)] border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] px-4 text-sm text-[var(--od-text-primary)] outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30 focus:border-[var(--od-accent)]/50 transition-all"
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </div>
                    <Input
                      label="Date"
                      type="date"
                      value={invoiceForm.date}
                      onChange={(e) =>
                        setInvoiceForm((prev) => ({ ...prev, date: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => {
                        onAddInvoice();
                        setShowForm(false);
                      }}
                      disabled={addingInvoice}
                    >
                      {addingInvoice ? 'Adding...' : 'Add Invoice'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {invoices.length === 0 && !showForm ? (
            <EmptyState
              icon={DollarSign}
              title="No invoices yet"
              description="Track payments and invoices for this client."
              action={{ label: 'Add First Invoice', onClick: () => setShowForm(true) }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--od-border-subtle)]">
                    <th className="text-left py-2.5 px-3 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
                      Description
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-center py-2.5 px-3 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-right py-2.5 px-3 text-xs font-medium text-[var(--od-text-muted)] uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="border-b border-[var(--od-border-subtle)] last:border-0 hover:bg-[var(--od-bg-tertiary)] transition-colors"
                    >
                      <td className="py-3 px-3 text-[var(--od-text-primary)]">{inv.description}</td>
                      <td className="py-3 px-3 text-right font-medium text-[var(--od-text-primary)]">
                        {currency(inv.amount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge variant={invoiceStatusVariant[inv.status] || 'default'} size="sm">
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right text-[var(--od-text-tertiary)]">
                        {formatDate(inv.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════
// Notes Tab
// ══════════════════════════════════════════════

function NotesTab({
  notes,
  newNote,
  setNewNote,
  addingNote,
  onAddNote,
}: {
  notes: ClientActivity[];
  newNote: string;
  setNewNote: (v: string) => void;
  addingNote: boolean;
  onAddNote: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Add note */}
      <Card>
        <CardContent className="p-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write a note about this client..."
            rows={3}
            className="w-full px-3 py-2.5 rounded-[var(--od-radius-md)] border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] resize-none outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30 focus:border-[var(--od-accent)]/50 transition-all"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                onAddNote();
              }
            }}
          />
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-[var(--od-text-muted)]">
              Press Ctrl+Enter to save
            </p>
            <Button
              variant="accent"
              size="sm"
              onClick={onAddNote}
              disabled={addingNote || !newNote.trim()}
            >
              <Plus className="w-3.5 h-3.5" />
              {addingNote ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notes list */}
      {notes.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              icon={FileText}
              title="No notes yet"
              description="Add notes to keep track of important details about this client."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <motion.div key={note.id} layout>
              <Card className="hover:border-[var(--od-border-strong)] transition-colors">
                <CardContent className="p-4">
                  <p className="text-sm text-[var(--od-text-primary)] whitespace-pre-wrap leading-relaxed">
                    {note.description}
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--od-border-subtle)]">
                    <Clock className="w-3 h-3 text-[var(--od-text-muted)]" />
                    <span className="text-xs text-[var(--od-text-muted)]">
                      {formatDateTime(note.created_at)}
                    </span>
                    {note.created_by && (
                      <>
                        <span className="text-xs text-[var(--od-text-muted)]">by</span>
                        <span className="text-xs text-[var(--od-text-tertiary)]">
                          {note.created_by}
                        </span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
