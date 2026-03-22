'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  Send,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { useOrganization } from '@/hooks/use-organization';
import { useClients } from '@/hooks/use-clients';
import { InvoiceManager } from '@/components/dashboard/invoice-manager';
import { TemplatePicker } from '@/components/dashboard/template-picker';
import type {
  Client,
  ClientStatus,
  ClientActivity,
  ClientActivityType,
  Json,
} from '@/lib/database.types';
import { MeetingPrep } from '@/components/dashboard/meeting-prep';

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
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  // Editable stat fields
  const [editingStat, setEditingStat] = useState<string | null>(null);
  const [statValue, setStatValue] = useState('');

  // Notes
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

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
                communications={communications}
              />
            )}

            {activeTab === 'communications' && (
              <CommunicationsTab communications={communications} client={client} organizationId={organization?.id || ''} orgName={organization?.name || ''} />
            )}

            {activeTab === 'quotes' && (
              <QuotesJobsTab quotes={quotesData} wonLeads={wonLeads} />
            )}

            {activeTab === 'financials' && organization && (
              <InvoiceManager
                organizationId={organization.id}
                clientId={client.id}
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

        {/* ── Delete confirmation — must type "Remove this Client" ── */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
              onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
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
                <p className="text-sm text-[var(--od-text-tertiary)] text-center mb-4">
                  This will permanently delete <strong>{name}</strong> and all their data. This action cannot be undone.
                </p>
                <p className="text-xs text-[var(--od-text-muted)] text-center mb-2">
                  Type <strong className="text-[#C44E56]">Remove this Client</strong> to confirm
                </p>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Remove this Client"
                  className="w-full px-3 py-2 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)] text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-2 focus:ring-[#C44E56]/30 mb-4"
                  autoFocus
                />
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDelete}
                    disabled={deleting || deleteConfirmText !== 'Remove this Client'}
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
  communications,
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
  communications: TimelineEntry[];
}) {
  const [commsOpen, setCommsOpen] = useState(true);
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

      {/* Right — Meeting Prep + Communications + Activity */}
      <div className="lg:col-span-2 space-y-4">
        {/* AI Meeting Prep — only shows when appointment within 48hrs */}
        <MeetingPrep clientId={client.id} organizationId={client.organization_id} />
        {/* Collapsible Communications */}
        <Card>
          <button
            onClick={() => setCommsOpen(!commsOpen)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--od-bg-tertiary)] transition-colors rounded-t-[var(--od-radius-lg)]"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-[var(--od-accent)]" />
              <span className="text-sm font-semibold text-[var(--od-text-primary)]">
                Communications
              </span>
              {communications.length > 0 && (
                <Badge variant="accent" size="sm">{communications.length}</Badge>
              )}
            </div>
            <motion.div
              animate={{ rotate: commsOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <svg className="w-4 h-4 text-[var(--od-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </motion.div>
          </button>
          <AnimatePresence>
            {commsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <CardContent className="pt-0 border-t border-[var(--od-border-subtle)]">
                  {communications.length === 0 ? (
                    <p className="text-sm text-[var(--od-text-muted)] py-4 text-center">No communications yet</p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pt-3">
                      {communications.map((c) => {
                        const Icon = c.type === 'email' ? Mail : c.type === 'sms' ? MessageSquare : Phone;
                        return (
                          <div key={c.id} className="flex items-start gap-2 p-2 rounded-[var(--od-radius-md)] hover:bg-[var(--od-bg-tertiary)] transition-colors">
                            <div className="shrink-0 w-6 h-6 rounded-full bg-[var(--od-bg-tertiary)] flex items-center justify-center mt-0.5">
                              <Icon className="w-3 h-3 text-[var(--od-text-muted)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-[var(--od-text-primary)] truncate">
                                {c.summary || c.type}
                              </p>
                              <p className="text-[10px] text-[var(--od-text-muted)] mt-1">
                                {relativeTime(c.date)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Recent Activity */}
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
// Communications Tab — full messages + reply
// ══════════════════════════════════════════════

function CommunicationsTab({
  communications,
  client,
  organizationId,
  orgName,
}: {
  communications: TimelineEntry[];
  client: ClientDetail;
  organizationId: string;
  orgName: string;
}) {
  const [sending, setSending] = useState(false);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeChannel, setComposeChannel] = useState<'email' | 'sms'>('email');
  const [draftReply, setDraftReply] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [dismissedDraftForId, setDismissedDraftForId] = useState<string | null>(null);
  const { success: showSuccess } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sort messages oldest-first (chat order)
  const sortedMessages = useMemo(
    () => [...communications].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [communications]
  );

  // Group messages by date for date separators
  const groupedMessages = useMemo(() => {
    const groups: { label: string; messages: TimelineEntry[] }[] = [];
    let currentLabel = '';
    for (const msg of sortedMessages) {
      const label = getDateLabel(msg.date);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }, [sortedMessages]);

  // Auto-scroll to bottom on load
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [communications.length]);

  // Auto-draft reply when last message is inbound
  useEffect(() => {
    if (sortedMessages.length === 0) return;
    const lastMsg = sortedMessages[sortedMessages.length - 1];
    const direction = (lastMsg.data?.direction as string) || 'outbound';
    if (direction !== 'inbound') {
      setDraftReply(null);
      return;
    }
    // Don't re-fetch if dismissed for this specific message
    if (dismissedDraftForId === lastMsg.id) return;

    const body = (lastMsg.data?.body as string) || (lastMsg.data?.text as string) || lastMsg.summary || '';
    if (!body.trim()) return;

    let cancelled = false;
    setDraftLoading(true);
    setDraftReply(null);

    fetch('/api/ai/draft-reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message_body: body,
        client_name: client.first_name || client.company_name || 'Customer',
        org_name: orgName,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.draft) {
          setDraftReply(data.draft);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setDraftLoading(false);
      });

    return () => { cancelled = true; };
  }, [sortedMessages, dismissedDraftForId, client.first_name, client.company_name, orgName]);

  function getDateLabel(iso: string): string {
    const date = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = today.getTime() - msgDay.getTime();
    const dayMs = 86_400_000;
    if (diff < dayMs && diff >= 0) return 'Today';
    if (diff < dayMs * 2 && diff >= dayMs) return 'Yesterday';
    return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' });
  }

  const sendMessage = async () => {
    if (!composeBody.trim() || sending) return;
    setSending(true);
    try {
      const leadId = client.leads?.[0]?.id as string | undefined;
      await fetch('/api/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          lead_id: leadId || null,
          channel: composeChannel,
          direction: 'outbound',
          subject: composeChannel === 'email' ? composeSubject || undefined : undefined,
          body: composeBody,
          recipient_email: client.email,
          recipient_phone: client.phone,
        }),
      });
      showSuccess(`${composeChannel === 'email' ? 'Email' : 'SMS'} sent`);
      setComposeBody('');
      setComposeSubject('');
    } catch {
      // silent
    }
    setSending(false);
  };

  return (
    <Card className="flex flex-col h-[680px] overflow-hidden">
      {/* Messages area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-4">
        {communications.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <EmptyState
              icon={Mail}
              title="No communications"
              description="Send an email or SMS to start a conversation with this client."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {groupedMessages.map((group) => (
              <div key={group.label}>
                {/* Date separator */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-[rgba(0,0,0,0.06)]" />
                  <span className="text-[11px] font-medium text-[#A3A3A3] shrink-0">{group.label}</span>
                  <div className="flex-1 h-px bg-[rgba(0,0,0,0.06)]" />
                </div>

                {/* Messages for this date */}
                <div className="space-y-3">
                  {group.messages.map((item) => {
                    const direction = (item.data?.direction as string) || 'outbound';
                    const body = (item.data?.body as string) || (item.data?.text as string) || item.summary || '';
                    const subject = (item.data?.subject as string) || '';
                    const isInbound = direction === 'inbound';
                    const channel = item.type === 'email' ? 'Email' : item.type === 'sms' ? 'SMS' : item.type === 'inbox_message' ? 'Message' : 'Call';
                    const senderName = isInbound
                      ? (item.data?.from_name as string) || (item.data?.sender_name as string) || client.first_name || client.email || 'Client'
                      : null;
                    const senderEmail = isInbound ? (item.data?.from_email as string) || (item.data?.sender_email as string) || client.email || '' : '';

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}
                      >
                        <div className={`max-w-[75%] ${isInbound ? '' : ''}`}>
                          {/* Sender name for inbound */}
                          {isInbound && senderName && (
                            <div className="flex items-center gap-2 mb-1 ml-1">
                              <span className="text-[12px] font-medium text-[#404040]">{senderName}</span>
                              {senderEmail && senderEmail !== senderName && (
                                <span className="text-[11px] text-[#A3A3A3]">{senderEmail}</span>
                              )}
                            </div>
                          )}

                          {/* Message bubble */}
                          <div
                            className={`px-4 py-3 ${
                              isInbound
                                ? 'bg-[#F5F5F5] text-[#0A0A0A] rounded-2xl rounded-bl-md'
                                : 'bg-[#6366F1] text-white rounded-2xl rounded-br-md'
                            }`}
                          >
                            {/* Channel badge */}
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                  isInbound
                                    ? 'bg-[rgba(0,0,0,0.05)] text-[#737373]'
                                    : 'bg-[rgba(255,255,255,0.2)] text-white/90'
                                }`}
                              >
                                {item.type === 'email' || item.type === 'inbox_message' ? (
                                  <Mail className="w-2.5 h-2.5" />
                                ) : (
                                  <MessageSquare className="w-2.5 h-2.5" />
                                )}
                                {channel}
                              </span>
                            </div>

                            {/* Subject line for emails */}
                            {subject && (
                              <p className={`text-[14px] font-semibold mb-1 ${isInbound ? 'text-[#0A0A0A]' : 'text-white'}`}>
                                {subject}
                              </p>
                            )}

                            {/* Message body */}
                            <p className="text-[14px] leading-relaxed whitespace-pre-wrap">{body}</p>
                          </div>

                          {/* Timestamp */}
                          <p className={`text-[11px] text-[#A3A3A3] mt-1 ${isInbound ? 'ml-1' : 'mr-1 text-right'}`}>
                            {formatTime(item.date)}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
            {/* AI suggested reply */}
            {(draftReply || draftLoading) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="border border-dashed border-[#6366F1]/30 bg-[#6366F1]/[0.03] rounded-xl p-4 mt-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[13px]">&#10024;</span>
                  <span className="text-[13px] font-semibold text-[#6366F1]">Suggested reply</span>
                </div>
                {draftLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <RefreshCw className="w-3.5 h-3.5 text-[#6366F1] animate-spin" />
                    <span className="text-[12px] text-[#A3A3A3]">Drafting reply…</span>
                  </div>
                ) : (
                  <>
                    <p className="text-[13px] text-[#404040] leading-relaxed mb-3 whitespace-pre-wrap">
                      &ldquo;{draftReply}&rdquo;
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setComposeBody(draftReply || '');
                          setDraftReply(null);
                        }}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#6366F1] text-white hover:bg-[#4F46E5] transition-colors"
                      >
                        Use this
                      </button>
                      <button
                        onClick={() => {
                          const lastMsg = sortedMessages[sortedMessages.length - 1];
                          setDismissedDraftForId(lastMsg?.id || null);
                          setDraftReply(null);
                        }}
                        className="text-[12px] font-medium px-3 py-1.5 rounded-lg text-[#737373] hover:bg-[#F5F5F5] transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Compose area — sticky bottom */}
      <div className="shrink-0 border-t border-[rgba(0,0,0,0.06)] bg-white px-5 py-4 space-y-3">
        {/* Channel toggle tabs */}
        <div className="flex items-center gap-1">
          {client.email && (
            <button
              onClick={() => setComposeChannel('email')}
              className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                composeChannel === 'email'
                  ? 'bg-[#EEF2FF] text-[#4F46E5]'
                  : 'text-[#A3A3A3] hover:bg-[#F5F5F5]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                Email
              </span>
            </button>
          )}
          {client.phone && (
            <button
              onClick={() => setComposeChannel('sms')}
              className={`text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors ${
                composeChannel === 'sms'
                  ? 'bg-[#ECFDF5] text-[#059669]'
                  : 'text-[#A3A3A3] hover:bg-[#F5F5F5]'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                SMS
              </span>
            </button>
          )}
          <span className="text-[11px] text-[#A3A3A3] ml-auto">
            to {composeChannel === 'email' ? client.email : client.phone}
          </span>
        </div>

        {/* Subject field — email only */}
        {composeChannel === 'email' && (
          <input
            type="text"
            placeholder="Subject"
            value={composeSubject}
            onChange={(e) => setComposeSubject(e.target.value)}
            className="w-full px-3 py-2 text-[13px] rounded-lg bg-[#F5F5F5] text-[#0A0A0A] placeholder:text-[#A3A3A3] border-0 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
          />
        )}

        {/* Message input + actions */}
        <div className="flex items-end gap-2">
          <textarea
            placeholder={composeChannel === 'email' ? 'Write your email...' : 'Write your message...'}
            value={composeBody}
            onChange={(e) => setComposeBody(e.target.value)}
            rows={2}
            className="flex-1 px-3 py-2 text-[13px] rounded-lg bg-[#F5F5F5] text-[#0A0A0A] placeholder:text-[#A3A3A3] border-0 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <div className="flex items-center gap-1.5 shrink-0 pb-0.5">
            {composeChannel === 'email' && (
              <TemplatePicker
                onSelect={(subject, body) => { setComposeSubject(subject); setComposeBody(body); }}
                clientName={client.first_name || undefined}
                orgName={orgName}
              />
            )}
            <Button size="sm" onClick={sendMessage} disabled={!composeBody.trim() || sending} className="h-9 px-4">
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
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
