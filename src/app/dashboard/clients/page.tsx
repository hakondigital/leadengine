'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Building2,
  UserPlus,
  Search,
  Filter,
  Download,
  Mail,
  Phone,
  MapPin,
  Star,
  DollarSign,
  Users,
  X,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import { useOrganization } from '@/hooks/use-organization';
import { useClients } from '@/hooks/use-clients';
import type { Client, ClientStatus, ClientType } from '@/lib/database.types';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function initials(first: string, last: string, company?: string | null): string {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (company) return company.slice(0, 2).toUpperCase();
  return '??';
}

function displayName(c: Client): string {
  if (c.type === 'company' && c.company_name) return c.company_name;
  return [c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unnamed';
}

function subLine(c: Client): string | null {
  if (c.type === 'individual' && c.company_name) return c.company_name;
  if (c.type === 'company' && c.first_name) return [c.first_name, c.last_name].filter(Boolean).join(' ');
  return c.job_title || null;
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
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function currency(v: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 2 }).format(v);
}

const statusConfig: Record<ClientStatus, { label: string; variant: 'success' | 'warning' | 'default' | 'error'; dot: boolean }> = {
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
  'from-[#5B8DEF] to-[#34C77B]',
];

function avatarGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// ──────────────────────────────────────────────
// Skeleton loader
// ──────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-5 py-4 border-b border-[var(--od-border-subtle)]"
        >
          <div className="w-9 h-9 rounded-full bg-[var(--od-bg-tertiary)] animate-pulse shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-36 rounded bg-[var(--od-bg-tertiary)] animate-pulse" />
            <div className="h-3 w-24 rounded bg-[var(--od-bg-tertiary)] animate-pulse" />
          </div>
          <div className="hidden md:block h-3 w-40 rounded bg-[var(--od-bg-tertiary)] animate-pulse" />
          <div className="hidden md:block h-3 w-28 rounded bg-[var(--od-bg-tertiary)] animate-pulse" />
          <div className="h-5 w-16 rounded-full bg-[var(--od-bg-tertiary)] animate-pulse" />
          <div className="h-3 w-20 rounded bg-[var(--od-bg-tertiary)] animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────
// Status filter pills
// ──────────────────────────────────────────────

const statusFilters: Array<{ value: ClientStatus | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'vip', label: 'VIP' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

const typeFilters: Array<{ value: ClientType | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
];

// ──────────────────────────────────────────────
// Add Client Modal
// ──────────────────────────────────────────────

interface AddClientModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<Client>) => Promise<void>;
  saving: boolean;
}

function AddClientModal({ open, onClose, onSave, saving }: AddClientModalProps) {
  const [type, setType] = useState<ClientType>('individual');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [abn, setAbn] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postcode, setPostcode] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');

  const reset = () => {
    setType('individual');
    setFirstName('');
    setLastName('');
    setCompanyName('');
    setAbn('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCity('');
    setState('');
    setPostcode('');
    setTags('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      type,
      first_name: type === 'individual' ? firstName : '',
      last_name: type === 'individual' ? lastName : '',
      company_name: type === 'company' ? companyName : companyName || null,
      company_abn: type === 'company' ? abn || null : null,
      email: email || null,
      phone: phone || null,
      address: address || null,
      city: city || null,
      state: state || null,
      postcode: postcode || null,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      notes: notes || null,
      status: 'active' as ClientStatus,
    });
    reset();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 bottom-4 top-auto z-50 mx-auto max-w-lg sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full"
          >
            <Card className="max-h-[85vh] overflow-y-auto border-[var(--od-border-subtle)] shadow-2xl">
              {/* Modal header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[var(--od-border-subtle)]">
                <div>
                  <h2 className="text-base font-semibold text-[var(--od-text-primary)] tracking-tight">
                    Add Client
                  </h2>
                  <p className="text-xs text-[var(--od-text-muted)] mt-0.5">
                    Add a new client to your database
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Type toggle */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[var(--od-text-secondary)] tracking-wide">
                    Type
                  </label>
                  <div className="flex gap-1 p-1 rounded-[var(--od-radius-md)] bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)]">
                    {(['individual', 'company'] as ClientType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-[6px] transition-all duration-200 ${
                          type === t
                            ? 'bg-white text-[var(--od-text-primary)] shadow-[0_1px_3px_rgba(28,42,58,0.08)]'
                            : 'text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)]'
                        }`}
                      >
                        {t === 'individual' ? 'Individual' : 'Company'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name fields */}
                <AnimatePresence mode="wait">
                  {type === 'individual' ? (
                    <motion.div
                      key="individual"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-2 gap-3"
                    >
                      <Input
                        label="First Name"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                      />
                      <Input
                        label="Last Name"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Smith"
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="company"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="grid grid-cols-2 gap-3"
                    >
                      <Input
                        label="Company Name"
                        required
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Acme Pty Ltd"
                      />
                      <Input
                        label="ABN"
                        value={abn}
                        onChange={(e) => setAbn(e.target.value)}
                        placeholder="12 345 678 901"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Contact */}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0400 000 000"
                  />
                </div>

                {/* Address */}
                <Input
                  label="Address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main Street"
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input
                    label="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Sydney"
                  />
                  <Input
                    label="State"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="NSW"
                  />
                  <Input
                    label="Postcode"
                    value={postcode}
                    onChange={(e) => setPostcode(e.target.value)}
                    placeholder="2000"
                  />
                </div>

                {/* Tags */}
                <Input
                  label="Tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="residential, premium, referral"
                  hint="Comma-separated"
                />

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-[var(--od-text-secondary)] tracking-wide">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Any additional notes about this client..."
                    className="flex w-full rounded-[var(--od-radius-md)] border bg-[var(--od-bg-tertiary)] px-4 py-3 text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] transition-all duration-200 border-[var(--od-border-default)] hover:border-[var(--od-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30 focus:border-[var(--od-accent)]/50 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--od-border-subtle)]">
                  <Button type="button" variant="ghost" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="default" size="sm" disabled={saving}>
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        Save Client
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ──────────────────────────────────────────────
// Main Page
// ──────────────────────────────────────────────

export default function ClientsPage() {
  const router = useRouter();
  const { organization, loading: orgLoading } = useOrganization();
  const { clients, loading: clientsLoading, total, createClient } = useClients(organization?.id);
  const { success, error: toastError } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClientStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ClientType | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const loading = orgLoading || clientsLoading;

  // Filtered clients
  const filtered = useMemo(() => {
    let result = clients;

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.first_name?.toLowerCase().includes(q) ||
          c.last_name?.toLowerCase().includes(q) ||
          c.company_name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.phone?.includes(q)
      );
    }

    // Status
    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Type
    if (typeFilter !== 'all') {
      result = result.filter((c) => c.type === typeFilter);
    }

    return result;
  }, [clients, search, statusFilter, typeFilter]);

  // Stats
  const stats = useMemo(() => {
    const active = clients.filter((c) => c.status === 'active').length;
    const vip = clients.filter((c) => c.status === 'vip').length;
    const outstanding = clients.reduce((sum, c) => sum + (c.outstanding_balance || 0), 0);
    return { total: clients.length, active, vip, outstanding };
  }, [clients]);

  // Export CSV
  const handleExport = useCallback(() => {
    if (filtered.length === 0) {
      toastError('No clients to export');
      return;
    }

    const headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Type', 'Outstanding', 'Lifetime Value', 'City', 'State', 'Tags'];
    const rows = filtered.map((c) => [
      displayName(c),
      c.email || '',
      c.phone || '',
      c.company_name || '',
      c.status,
      c.type,
      c.outstanding_balance?.toFixed(2) || '0.00',
      c.lifetime_value?.toFixed(2) || '0.00',
      c.city || '',
      c.state || '',
      (c.tags || []).join('; '),
    ]);

    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    success('CSV exported');
  }, [filtered, success, toastError]);

  // Save client
  const handleSaveClient = async (data: Partial<Client>) => {
    setSaving(true);
    try {
      await createClient(data);
      setModalOpen(false);
      success('Client created');
    } catch (err) {
      toastError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
                Clients
              </h1>
              <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
                Your client database
              </p>
            </div>

            {/* Stats badges */}
            {!loading && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="flex items-center gap-2 flex-wrap"
              >
                <Badge variant="default" size="lg">
                  <Users className="w-3 h-3" />
                  {stats.total} clients
                </Badge>
                <Badge variant="success" size="lg" dot>
                  {stats.active} active
                </Badge>
                <Badge variant="warning" size="lg">
                  <Star className="w-3 h-3" />
                  {stats.vip} VIP
                </Badge>
                {stats.outstanding > 0 && (
                  <Badge variant="error" size="lg">
                    <DollarSign className="w-3 h-3" />
                    {currency(stats.outstanding)} outstanding
                  </Badge>
                )}
              </motion.div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <Button variant="default" size="sm" onClick={() => setModalOpen(true)}>
              <UserPlus className="w-3.5 h-3.5" />
              Add Client
            </Button>
            <Button variant="secondary" size="sm" onClick={handleExport}>
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* ── Filters ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="px-4 lg:px-6 py-3 border-b border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)]/50"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--od-text-muted)] pointer-events-none" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-4 text-sm rounded-[var(--od-radius-md)] bg-white border border-[var(--od-border-default)] text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] transition-all duration-200 hover:border-[var(--od-border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30 focus:border-[var(--od-accent)]/50"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--od-bg-tertiary)] text-[var(--od-text-muted)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status pills */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[var(--od-text-muted)] mr-1 shrink-0" />
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                  statusFilter === f.value
                    ? 'bg-[var(--od-accent-muted)] text-[var(--od-accent-text)] border border-[rgba(79,209,229,0.25)]'
                    : 'text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-tertiary)] border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Type pills */}
          <div className="flex items-center gap-1 sm:border-l sm:border-[var(--od-border-subtle)] sm:pl-3">
            {typeFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                  typeFilter === f.value
                    ? 'bg-[var(--od-accent-muted)] text-[var(--od-accent-text)] border border-[rgba(79,209,229,0.25)]'
                    : 'text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-tertiary)] border border-transparent'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Content ── */}
      <div className="px-4 lg:px-6 py-4">
        {loading ? (
          <Card>
            <TableSkeleton />
          </Card>
        ) : filtered.length === 0 && clients.length === 0 ? (
          <Card>
            <EmptyState
              icon={Users}
              title="No clients yet"
              description="Add your first client to start building your client database. Import from CSV or add them manually."
              action={{ label: 'Add your first client', onClick: () => setModalOpen(true) }}
            />
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={Search}
              title="No matching clients"
              description="Try adjusting your search or filters to find what you're looking for."
              action={{ label: 'Clear filters', onClick: () => { setSearch(''); setStatusFilter('all'); setTypeFilter('all'); } }}
            />
          </Card>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="overflow-hidden">
              {/* Table header */}
              <div className="hidden md:grid md:grid-cols-[1fr_180px_140px_90px_110px_110px_80px_28px] items-center px-5 py-2.5 border-b border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)]/50">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--od-text-muted)]">
                  Name
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--od-text-muted)]">
                  Email
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--od-text-muted)]">
                  Phone
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--od-text-muted)]">
                  Status
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--od-text-muted)] text-right">
                  Outstanding
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--od-text-muted)] text-right">
                  Lifetime
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--od-text-muted)] text-right">
                  Updated
                </span>
                <span />
              </div>

              {/* Rows */}
              <div>
                {filtered.map((client, i) => {
                  const name = displayName(client);
                  const sub = subLine(client);
                  const sc = statusConfig[client.status] || statusConfig.active;
                  const hasOutstanding = (client.outstanding_balance || 0) > 0;

                  return (
                    <motion.div
                      key={client.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3), ease: [0.16, 1, 0.3, 1] }}
                      onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                      className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_180px_140px_90px_110px_110px_80px_28px] items-center px-5 py-3.5 border-b border-[var(--od-border-subtle)] last:border-b-0 cursor-pointer transition-all duration-200 hover:bg-[var(--od-bg-tertiary)]/60 active:bg-[var(--od-bg-tertiary)]"
                    >
                      {/* Name + avatar */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`shrink-0 w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(client.id)} flex items-center justify-center shadow-sm`}
                        >
                          <span className="text-[11px] font-bold text-white leading-none">
                            {initials(client.first_name, client.last_name, client.company_name)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--od-text-primary)] truncate group-hover:text-[var(--od-accent-text)] transition-colors duration-200">
                            {name}
                          </p>
                          {sub && (
                            <p className="text-[11px] text-[var(--od-text-muted)] truncate mt-0.5 flex items-center gap-1">
                              {client.type === 'company' ? (
                                <Building2 className="w-3 h-3 shrink-0" />
                              ) : (
                                <Building2 className="w-3 h-3 shrink-0 opacity-50" />
                              )}
                              {sub}
                            </p>
                          )}
                          {/* Mobile-only info */}
                          <div className="flex items-center gap-2 mt-1 md:hidden">
                            <Badge variant={sc.variant} size="sm" dot={sc.dot}>
                              {sc.label}
                            </Badge>
                            {hasOutstanding && (
                              <span className="text-[11px] font-medium text-[#C44E56]">
                                {currency(client.outstanding_balance)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Email */}
                      <div className="hidden md:flex items-center gap-1.5 min-w-0">
                        {client.email ? (
                          <>
                            <Mail className="w-3 h-3 text-[var(--od-text-muted)] shrink-0" />
                            <span className="text-xs text-[var(--od-text-secondary)] truncate">
                              {client.email}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-[var(--od-text-muted)]">&mdash;</span>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="hidden md:flex items-center gap-1.5 min-w-0">
                        {client.phone ? (
                          <>
                            <Phone className="w-3 h-3 text-[var(--od-text-muted)] shrink-0" />
                            <span className="text-xs text-[var(--od-text-secondary)] truncate">
                              {client.phone}
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-[var(--od-text-muted)]">&mdash;</span>
                        )}
                      </div>

                      {/* Status */}
                      <div className="hidden md:block">
                        <Badge variant={sc.variant} size="sm" dot={sc.dot}>
                          {sc.label}
                        </Badge>
                      </div>

                      {/* Outstanding */}
                      <div className="hidden md:block text-right">
                        <span
                          className={`text-xs font-medium ${
                            hasOutstanding ? 'text-[#C44E56]' : 'text-[var(--od-text-muted)]'
                          }`}
                        >
                          {hasOutstanding ? currency(client.outstanding_balance) : '$0.00'}
                        </span>
                      </div>

                      {/* Lifetime Value */}
                      <div className="hidden md:block text-right">
                        <span className="text-xs font-medium text-[#1F9B5A]">
                          {currency(client.lifetime_value || 0)}
                        </span>
                      </div>

                      {/* Last updated */}
                      <div className="hidden md:block text-right">
                        <span className="text-[11px] text-[var(--od-text-muted)]">
                          {relativeTime(client.updated_at)}
                        </span>
                      </div>

                      {/* Chevron */}
                      <div className="flex items-center justify-end">
                        <ChevronRight className="w-4 h-4 text-[var(--od-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity duration-200 -translate-x-1 group-hover:translate-x-0" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer count */}
              <div className="px-5 py-3 border-t border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)]/30">
                <p className="text-[11px] text-[var(--od-text-muted)]">
                  Showing {filtered.length} of {clients.length} client{clients.length !== 1 ? 's' : ''}
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </div>

      {/* ── Add Client Modal ── */}
      <AddClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveClient}
        saving={saving}
      />
    </div>
  );
}
