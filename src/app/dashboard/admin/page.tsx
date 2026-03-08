'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield,
  Building2,
  Users,
  FileText,
  TrendingUp,
  Crown,
  ChevronDown,
  Trash2,
  RefreshCw,
  Search,
  Mail,
  Copy,
  CheckCircle2,
  Eye,
  Headphones,
  LayoutDashboard,
  ExternalLink,
} from 'lucide-react';

interface OrgUser {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  created_at: string;
}

interface OrgData {
  id: string;
  name: string;
  slug: string;
  plan: string | null;
  billing_status: string | null;
  created_at: string;
  lead_count: number;
  user_count: number;
  form_count: number;
  notification_email: string | null;
  phone: string | null;
}

const planColors: Record<string, string> = {
  enterprise: 'bg-purple-500/20 text-purple-400',
  professional: 'bg-blue-500/20 text-blue-400',
  starter: 'bg-green-500/20 text-green-400',
};

type Tab = 'overview' | 'organizations' | 'support';

// Helper to get auth headers with Bearer token
async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
  }
  return { 'Content-Type': 'application/json' };
}

export default function AdminPage() {
  const [orgs, setOrgs] = useState<OrgData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [orgUsers, setOrgUsers] = useState<Record<string, OrgUser[]>>({});
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin', { headers });
      if (res.status === 403) {
        setError('Access denied. Super admin only.');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setOrgs(data.organizations || []);
      setError(null);
    } catch {
      setError('Failed to load organizations');
    }
    setLoading(false);
  }, []);

  const fetchOrgUsers = useCallback(async (orgId: string) => {
    if (orgUsers[orgId]) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/admin/users?org_id=${orgId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOrgUsers(prev => ({ ...prev, [orgId]: data.users || [] }));
      }
    } catch {
      // silent
    }
  }, [orgUsers]);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  useEffect(() => {
    if (expandedOrg) fetchOrgUsers(expandedOrg);
  }, [expandedOrg, fetchOrgUsers]);

  const handleAction = async (orgId: string, action: string, value?: string | null) => {
    setActionLoading(`${orgId}-${action}`);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ organization_id: orgId, action, value }),
      });
      if (res.ok) await fetchOrgs();
    } catch {}
    setActionLoading(null);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (error === 'Access denied. Super admin only.') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="w-16 h-16 text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-[var(--le-text-primary)]">Access Denied</h2>
        <p className="text-[var(--le-text-secondary)] mt-2">This page is restricted to super administrators.</p>
      </div>
    );
  }

  const filteredOrgs = orgs.filter(org =>
    !searchQuery ||
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.notification_email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalLeads = orgs.reduce((sum, o) => sum + o.lead_count, 0);
  const totalUsers = orgs.reduce((sum, o) => sum + o.user_count, 0);
  const totalForms = orgs.reduce((sum, o) => sum + o.form_count, 0);
  const paidOrgs = orgs.filter((o) => o.plan).length;
  const recentOrgs = [...orgs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'organizations', label: 'Organizations', icon: Building2 },
    { id: 'support', label: 'Client Support', icon: Headphones },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[var(--le-accent)]" />
            <div>
              <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
                Operator Panel
              </h1>
              <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
                LeadEngine platform management
              </p>
            </div>
          </div>
          <Button onClick={fetchOrgs} variant="secondary" size="sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Tabs */}
        <div className="px-4 lg:px-6 flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'text-[var(--le-accent)] bg-[var(--le-accent-muted)] border-b-2 border-[var(--le-accent)]'
                  : 'text-[var(--le-text-muted)] hover:text-[var(--le-text-secondary)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* ========== OVERVIEW TAB ========== */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Organizations', value: orgs.length, icon: Building2, color: '#5B8DEF' },
                { label: 'Total Users', value: totalUsers, icon: Users, color: '#34C77B' },
                { label: 'Total Leads', value: totalLeads, icon: TrendingUp, color: '#4FD1E5' },
                { label: 'Total Forms', value: totalForms, icon: FileText, color: '#F0A030' },
                { label: 'Paid Plans', value: paidOrgs, icon: Crown, color: '#A78BFA' },
              ].map((stat) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-[var(--le-text-primary)]">{stat.value}</p>
                          <p className="text-[10px] text-[var(--le-text-muted)] uppercase tracking-wider font-semibold">{stat.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Signups */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recent Signups</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
                  ) : recentOrgs.length === 0 ? (
                    <p className="text-[var(--le-text-muted)] text-center py-4 text-sm">No organizations yet</p>
                  ) : (
                    <div className="space-y-2">
                      {recentOrgs.map((org) => (
                        <div key={org.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--le-bg-tertiary)]">
                          <div>
                            <p className="text-sm font-medium text-[var(--le-text-primary)]">{org.name}</p>
                            <p className="text-[10px] text-[var(--le-text-muted)]">
                              {new Date(org.created_at).toLocaleDateString()} &middot; {org.lead_count} leads
                            </p>
                          </div>
                          <Badge className={org.plan ? planColors[org.plan] || '' : 'bg-[var(--le-bg-muted)] text-[var(--le-text-muted)]'}>
                            {org.plan ? org.plan.charAt(0).toUpperCase() + org.plan.slice(1) : 'Free'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Plan Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Plan Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-8 rounded-lg" />)}</div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        { plan: 'Free', count: orgs.filter(o => !o.plan).length, color: '#6B7B8D' },
                        { plan: 'Starter', count: orgs.filter(o => o.plan === 'starter').length, color: '#34C77B' },
                        { plan: 'Professional', count: orgs.filter(o => o.plan === 'professional').length, color: '#5B8DEF' },
                        { plan: 'Enterprise', count: orgs.filter(o => o.plan === 'enterprise').length, color: '#A78BFA' },
                      ].map((item) => {
                        const pct = orgs.length > 0 ? (item.count / orgs.length) * 100 : 0;
                        return (
                          <div key={item.plan}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-[var(--le-text-secondary)]">{item.plan}</span>
                              <span className="text-xs font-bold text-[var(--le-text-primary)]">{item.count}</span>
                            </div>
                            <div className="h-2 bg-[var(--le-bg-tertiary)] rounded-full overflow-hidden">
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: item.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.5, delay: 0.2 }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => setActiveTab('organizations')}>
                  <Building2 className="w-4 h-4" />
                  Manage Organizations
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setActiveTab('support')}>
                  <Headphones className="w-4 h-4" />
                  Client Support
                </Button>
                <Button size="sm" variant="secondary" onClick={() => window.open('/api/auth/me', '_blank')}>
                  <Eye className="w-4 h-4" />
                  Check Auth Status
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {/* ========== ORGANIZATIONS TAB ========== */}
        {activeTab === 'organizations' && (
          <>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--le-text-muted)]" />
              <input
                type="text"
                placeholder="Search organizations by name, slug, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--le-bg-secondary)] border border-[var(--le-border-subtle)] rounded-lg text-sm text-[var(--le-text-primary)] placeholder:text-[var(--le-text-muted)] focus:outline-none focus:border-[var(--le-accent)]"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  All Organizations ({filteredOrgs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
                ) : filteredOrgs.length === 0 ? (
                  <p className="text-[var(--le-text-muted)] text-center py-8">
                    {searchQuery ? 'No organizations match your search' : 'No organizations found'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredOrgs.map((org) => (
                      <motion.div key={org.id} layout className="border border-[var(--le-border-subtle)] rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-[var(--le-bg-muted)]/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-9 h-9 rounded-lg bg-[var(--le-bg-elevated)] border border-[var(--le-border-subtle)] flex items-center justify-center text-xs font-bold text-[var(--le-text-secondary)]">
                              {org.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--le-text-primary)]">{org.name}</p>
                              <p className="text-xs text-[var(--le-text-muted)]">{org.slug}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="hidden md:flex items-center gap-4 text-xs text-[var(--le-text-secondary)]">
                              <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {org.lead_count}</span>
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {org.user_count}</span>
                              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {org.form_count}</span>
                            </div>
                            <Badge className={org.plan ? planColors[org.plan] || '' : 'bg-[var(--le-bg-muted)] text-[var(--le-text-muted)]'}>
                              {org.plan ? org.plan.charAt(0).toUpperCase() + org.plan.slice(1) : 'Free'}
                            </Badge>
                            <ChevronDown className={`w-4 h-4 text-[var(--le-text-muted)] transition-transform ${expandedOrg === org.id ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {expandedOrg === org.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="border-t border-[var(--le-border-subtle)] p-4 bg-[var(--le-bg-muted)]/30 space-y-4"
                          >
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                              <div>
                                <p className="text-[var(--le-text-muted)] text-xs">Org ID</p>
                                <div className="flex items-center gap-1">
                                  <p className="text-[var(--le-text-secondary)] font-mono text-xs truncate">{org.id}</p>
                                  <button onClick={() => copyToClipboard(org.id, org.id)} className="shrink-0 p-0.5 rounded hover:bg-[var(--le-bg-tertiary)]">
                                    {copiedId === org.id ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3 text-[var(--le-text-muted)]" />}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <p className="text-[var(--le-text-muted)] text-xs">Created</p>
                                <p className="text-[var(--le-text-secondary)]">{new Date(org.created_at).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-[var(--le-text-muted)] text-xs">Billing</p>
                                <p className="text-[var(--le-text-secondary)]">{org.billing_status || 'None'}</p>
                              </div>
                              <div>
                                <p className="text-[var(--le-text-muted)] text-xs">Contact Email</p>
                                <p className="text-[var(--le-text-secondary)] truncate text-xs">{org.notification_email || 'Not set'}</p>
                              </div>
                              <div>
                                <p className="text-[var(--le-text-muted)] text-xs">Phone</p>
                                <p className="text-[var(--le-text-secondary)] text-xs">{org.phone || 'Not set'}</p>
                              </div>
                            </div>

                            {orgUsers[org.id] && orgUsers[org.id].length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-[var(--le-text-muted)] uppercase tracking-wider mb-2">Team Members</p>
                                <div className="space-y-1">
                                  {orgUsers[org.id].map((u) => (
                                    <div key={u.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-[var(--le-bg-secondary)]">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-[var(--le-accent-muted)] flex items-center justify-center text-[10px] font-bold text-[var(--le-accent)]">
                                          {(u.full_name || u.email).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <p className="text-xs text-[var(--le-text-primary)] font-medium">{u.full_name || 'No name'}</p>
                                          <p className="text-[10px] text-[var(--le-text-muted)]">{u.email}</p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {u.email && (
                                          <a href={`mailto:${u.email}`} className="p-1 rounded hover:bg-[var(--le-bg-tertiary)]" title="Email user">
                                            <Mail className="w-3 h-3 text-[var(--le-text-muted)]" />
                                          </a>
                                        )}
                                        <Badge variant="default" className="text-[10px] capitalize">{u.role}</Badge>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--le-border-subtle)]">
                              <p className="text-xs text-[var(--le-text-muted)] w-full mb-1">Set Plan:</p>
                              {(['starter', 'professional', 'enterprise'] as const).map((plan) => (
                                <Button key={plan} size="sm" variant={org.plan === plan ? 'default' : 'secondary'} onClick={() => handleAction(org.id, 'set_plan', plan)} disabled={actionLoading === `${org.id}-set_plan`}>
                                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                                </Button>
                              ))}
                              <Button size="sm" variant={!org.plan ? 'default' : 'secondary'} onClick={() => handleAction(org.id, 'set_plan', null)} disabled={actionLoading === `${org.id}-set_plan`}>
                                Free
                              </Button>
                              <div className="flex-1" />
                              <Button size="sm" variant="destructive" onClick={() => { if (confirm(`Delete "${org.name}" and ALL its data? This cannot be undone.`)) handleAction(org.id, 'delete_org'); }} disabled={actionLoading === `${org.id}-delete_org`}>
                                <Trash2 className="w-3 h-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ========== CLIENT SUPPORT TAB ========== */}
        {activeTab === 'support' && (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--le-text-muted)]" />
              <input
                type="text"
                placeholder="Search by organization name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--le-bg-secondary)] border border-[var(--le-border-subtle)] rounded-lg text-sm text-[var(--le-text-primary)] placeholder:text-[var(--le-text-muted)] focus:outline-none focus:border-[var(--le-accent)]"
              />
            </div>

            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
            ) : filteredOrgs.length === 0 ? (
              <div className="text-center py-12">
                <Headphones className="w-12 h-12 text-[var(--le-text-muted)] mx-auto mb-3" />
                <p className="text-[var(--le-text-muted)]">
                  {searchQuery ? 'No clients match your search' : 'No clients yet'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredOrgs.map((org) => (
                  <motion.div key={org.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="hover:border-[var(--le-accent)]/30 transition-colors">
                      <CardContent className="pt-4 pb-4 space-y-3">
                        {/* Client header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--le-bg-elevated)] border border-[var(--le-border-subtle)] flex items-center justify-center text-sm font-bold text-[var(--le-text-secondary)]">
                              {org.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--le-text-primary)] text-sm">{org.name}</p>
                              <p className="text-[10px] text-[var(--le-text-muted)]">
                                Since {new Date(org.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge className={org.plan ? planColors[org.plan] || '' : 'bg-[var(--le-bg-muted)] text-[var(--le-text-muted)]'}>
                            {org.plan ? org.plan.charAt(0).toUpperCase() + org.plan.slice(1) : 'Free'}
                          </Badge>
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-4 text-xs text-[var(--le-text-secondary)]">
                          <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {org.lead_count} leads</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {org.user_count} users</span>
                          <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {org.form_count} forms</span>
                        </div>

                        {/* Contact info */}
                        <div className="text-xs space-y-1 pt-2 border-t border-[var(--le-border-subtle)]">
                          {org.notification_email && (
                            <div className="flex items-center gap-2 text-[var(--le-text-secondary)]">
                              <Mail className="w-3 h-3 text-[var(--le-text-muted)]" />
                              <a href={`mailto:${org.notification_email}`} className="hover:text-[var(--le-accent)] truncate">
                                {org.notification_email}
                              </a>
                            </div>
                          )}
                          {org.phone && (
                            <div className="flex items-center gap-2 text-[var(--le-text-secondary)]">
                              <svg className="w-3 h-3 text-[var(--le-text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                              <a href={`tel:${org.phone}`} className="hover:text-[var(--le-accent)]">{org.phone}</a>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 pt-2">
                          {org.notification_email && (
                            <a href={`mailto:${org.notification_email}?subject=LeadEngine Support`}>
                              <Button size="sm" variant="secondary">
                                <Mail className="w-3.5 h-3.5" />
                                Email
                              </Button>
                            </a>
                          )}
                          <Button size="sm" variant="secondary" onClick={() => { setActiveTab('organizations'); setExpandedOrg(org.id); setSearchQuery(org.name); }}>
                            <Eye className="w-3.5 h-3.5" />
                            Manage
                          </Button>
                          <button
                            onClick={() => copyToClipboard(org.id, `support-${org.id}`)}
                            className="ml-auto p-1.5 rounded hover:bg-[var(--le-bg-tertiary)] text-[var(--le-text-muted)]"
                            title="Copy Org ID"
                          >
                            {copiedId === `support-${org.id}` ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
