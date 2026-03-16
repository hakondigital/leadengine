'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/hooks/use-organization';
import { createClient } from '@/lib/supabase/client';
import {
  BarChart3,
  Brain,
  Briefcase,
  Calendar,
  ChevronUp,
  CreditCard,
  FileText,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Phone,
  Receipt,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Star,
  User,
  Users,
  Wrench,
  DollarSign,
} from 'lucide-react';

interface NavSection {
  label?: string;
  items: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }[];
}

function getNavSections(showAdmin: boolean): NavSection[] {
  return [
    {
      label: 'Operate',
      items: [
        { name: 'Command', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Leads', href: '/dashboard/leads', icon: Users },
        { name: 'Pipeline', href: '/dashboard/pipeline', icon: Inbox },
        { name: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
      ],
    },
    {
      label: 'Agent',
      items: [
        { name: 'Agent Console', href: '/dashboard/tools/strategy', icon: Brain },
        { name: 'Inbox', href: '/dashboard/inbox', icon: MessageSquare },
        { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
        { name: 'Quotes', href: '/dashboard/quotes', icon: Receipt },
        { name: 'Sequences', href: '/dashboard/sequences', icon: RefreshCw },
        { name: 'Calls', href: '/dashboard/calls', icon: Phone },
      ],
    },
    {
      label: 'Grow',
      items: [
        { name: 'Reviews', href: '/dashboard/reviews', icon: Star },
        { name: 'Portfolio', href: '/dashboard/portfolio', icon: ImageIcon },
        { name: 'ROI', href: '/dashboard/roi', icon: DollarSign },
        { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
    {
      label: 'System',
      items: [
        { name: 'Forms', href: '/dashboard/forms', icon: FileText },
        { name: 'Automations', href: '/dashboard/tools', icon: Wrench },
        { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
        ...(showAdmin ? [{ name: 'Admin', href: '/dashboard/admin', icon: Shield }] : []),
      ],
    },
  ];
}

const mobileNav = [
  { name: 'Command', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/dashboard/leads', icon: Users },
  { name: 'Agent', href: '/dashboard/tools/strategy', icon: Brain },
  { name: 'Inbox', href: '/dashboard/inbox', icon: MessageSquare },
  { name: 'Pipeline', href: '/dashboard/pipeline', icon: Inbox },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { organization, user } = useOrganization();
  const [collapsed, setCollapsed] = useState(false);
  const [newLeadCount, setNewLeadCount] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAdmin() {
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token || cancelled) return;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data?.isSuperAdmin) setIsSuperAdmin(true);
        }
      } catch {
        // Leave non-admin on timeout or network failure.
      }
    }

    checkAdmin();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!organization?.id) return;
    const supabase = createClient();
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organization.id)
      .eq('status', 'new')
      .then(({ count }) => setNewLeadCount(count || 0));
  }, [organization?.id, pathname]);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    document.cookie =
      'od_session_confirmed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  }

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 88 : 292 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex h-screen sticky top-0 z-30 shrink-0 border-r border-[var(--od-border-subtle)] bg-[linear-gradient(180deg,var(--od-shell),var(--od-shell-elevated))]"
      >
        <div className="flex h-full w-full flex-col gap-4 px-4 py-4">
          <div className="rounded-[28px] border border-[var(--od-border-default)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent_42%)] p-4 shadow-[var(--od-shadow-sm)]">
            <div className="flex items-start justify-between gap-3">
              <Link href="/dashboard" className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(79,209,229,0.22)] bg-[var(--od-accent-muted)]">
                    <Image
                      src="/odyssey-logo.png"
                      unoptimized
                      alt="Odyssey"
                      width={26}
                      height={26}
                      className="h-7 w-7 object-contain"
                      priority
                    />
                  </div>
                  {!collapsed && (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tracking-tight text-[var(--od-text-primary)]">
                        Odyssey
                      </p>
                      <p className="truncate text-[11px] text-[var(--od-text-muted)]">
                        24/7 agent workspace
                      </p>
                    </div>
                  )}
                </div>
              </Link>

              <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] text-[var(--od-text-muted)] transition-colors hover:border-[var(--od-border-default)] hover:text-[var(--od-text-primary)]"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                type="button"
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </button>
            </div>

            {!collapsed && (
              <div className="mt-4 rounded-2xl border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[var(--od-accent)] shadow-[0_0_12px_rgba(79,209,229,0.6)]" />
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--od-accent-text)]">
                      Agent active
                    </span>
                  </div>
                  <Sparkles className="h-4 w-4 text-[var(--od-accent)]" />
                </div>
                <p className="mt-3 text-sm font-semibold text-[var(--od-text-primary)]">
                  {organization?.name || 'Odyssey workspace'}
                </p>
                <p className="mt-1 text-xs leading-5 text-[var(--od-text-tertiary)]">
                  Keep users in active work. Lead queue, conversations, and automations should be reachable in one move.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--od-text-muted)]">
                      New queue
                    </p>
                    <p className="mt-1 text-lg font-semibold text-[var(--od-text-primary)]">
                      {newLeadCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] px-3 py-3">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--od-text-muted)]">
                      Mode
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--od-text-primary)]">
                      Assisted
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto pr-1" aria-label="Primary navigation">
            {getNavSections(isSuperAdmin).map((section) => (
              <div key={section.label ?? 'main'} className="space-y-2">
                {!collapsed && section.label && (
                  <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
                    {section.label}
                  </p>
                )}

                <div className="space-y-1.5">
                  {section.items.map((item) => {
                    const isActive =
                      item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : pathname.startsWith(item.href);

                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          'group relative flex items-center gap-3 rounded-2xl border px-3 py-3 transition-all duration-200',
                          isActive
                            ? 'border-[rgba(79,209,229,0.2)] bg-[linear-gradient(180deg,rgba(79,209,229,0.14),rgba(79,209,229,0.04))] text-[var(--od-text-primary)] shadow-[var(--od-shadow-sm)]'
                            : 'border-transparent text-[var(--od-text-tertiary)] hover:border-[var(--od-border-subtle)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--od-text-primary)]'
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active"
                            className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[var(--od-accent)]"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          />
                        )}
                        <span
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                            isActive
                              ? 'border-[rgba(79,209,229,0.24)] bg-[rgba(79,209,229,0.1)] text-[var(--od-accent-text)]'
                              : 'border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] text-[var(--od-text-tertiary)] group-hover:text-[var(--od-text-primary)]'
                          )}
                        >
                          <item.icon className="h-[18px] w-[18px]" />
                        </span>

                        {!collapsed && (
                          <span className="flex min-w-0 flex-1 items-center gap-2">
                            <span className="truncate text-sm font-medium">{item.name}</span>
                            {item.name === 'Leads' && newLeadCount > 0 && (
                              <span className="ml-auto rounded-full bg-[rgba(240,127,134,0.16)] px-2 py-0.5 text-[10px] font-semibold text-[#FFB4BA]">
                                {newLeadCount}
                              </span>
                            )}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="relative">
            <AnimatePresence>
              {showUserMenu && !collapsed && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-2xl border border-[var(--od-border-default)] bg-[var(--od-bg-secondary)] shadow-[var(--od-shadow-lg)]"
                >
                  <Link
                    href="/dashboard/account"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--od-text-secondary)] transition-colors hover:bg-[var(--od-bg-tertiary)] hover:text-[var(--od-text-primary)]"
                  >
                    <User className="h-4 w-4" />
                    My Account
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--od-text-secondary)] transition-colors hover:bg-[var(--od-bg-tertiary)] hover:text-[var(--od-text-primary)]"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <Link
                    href="/dashboard/billing"
                    onClick={() => setShowUserMenu(false)}
                    className="flex items-center gap-2.5 px-4 py-3 text-sm text-[var(--od-text-secondary)] transition-colors hover:bg-[var(--od-bg-tertiary)] hover:text-[var(--od-text-primary)]"
                  >
                    <CreditCard className="h-4 w-4" />
                    Billing
                  </Link>
                  <div className="border-t border-[var(--od-border-subtle)]" />
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-sm text-[#FFB4BA] transition-colors hover:bg-[rgba(240,127,134,0.08)]"
                    type="button"
                  >
                    <LogOut className="h-4 w-4" />
                    {loggingOut ? 'Logging out...' : 'Log Out'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {!collapsed ? (
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] px-3 py-3 transition-colors hover:border-[var(--od-border-default)] hover:bg-[rgba(255,255,255,0.05)]"
                type="button"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] text-xs font-semibold text-[var(--od-text-primary)]">
                  {(organization?.name || 'OD').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-[var(--od-text-primary)]">
                    {organization?.name || 'Odyssey'}
                  </p>
                  <p className="truncate text-[11px] capitalize text-[var(--od-text-muted)]">
                    {user?.role || 'Member'}
                  </p>
                </div>
                <ChevronUp
                  className={cn(
                    'h-3.5 w-3.5 text-[var(--od-text-muted)] transition-transform',
                    showUserMenu ? '' : 'rotate-180'
                  )}
                />
              </button>
            ) : (
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex w-full items-center justify-center rounded-2xl border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-3 text-[var(--od-text-muted)] transition-colors hover:border-[rgba(240,127,134,0.24)] hover:bg-[rgba(240,127,134,0.08)] hover:text-[#FFB4BA]"
                title="Log out"
                type="button"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--od-border-subtle)] bg-[rgba(9,19,29,0.94)] px-2 py-2 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-around">
          {mobileNav.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-colors',
                  isActive
                    ? 'text-[var(--od-accent-text)]'
                    : 'text-[var(--od-text-muted)]'
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
