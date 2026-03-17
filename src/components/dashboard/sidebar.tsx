'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useOrganization } from '@/hooks/use-organization';
import { createClient } from '@/lib/supabase/client';
import { MARKETPLACE_ADDONS } from '@/lib/marketplace';
import Image from 'next/image';
import {
  LayoutDashboard,
  Users,
  Inbox,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  CreditCard,
  Calendar,
  Receipt,
  RefreshCw,
  MessageSquare,
  Phone,
  Briefcase,
  Brain,
  Zap,
  Calculator,
  Upload,
  UsersRound,
  Shield,
  LogOut,
  ChevronUp,
  User,
  Store,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

// ─── Core navigation (always visible) ───────────────────────────────────────

function getCoreNavSections(showAdmin: boolean): NavSection[] {
  return [
    {
      items: [
        { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Leads', href: '/dashboard/leads', icon: Users },
        { name: 'Pipeline', href: '/dashboard/pipeline', icon: Inbox },
        { name: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
      ],
    },
    {
      label: 'Engage',
      items: [
        { name: 'Inbox', href: '/dashboard/inbox', icon: MessageSquare },
        { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
        { name: 'Quotes', href: '/dashboard/quotes', icon: Receipt },
        { name: 'Sequences', href: '/dashboard/sequences', icon: RefreshCw },
        { name: 'Calls', href: '/dashboard/calls', icon: Phone },
      ],
    },
    {
      label: 'AI',
      items: [
        { name: 'Strategy Advisor', href: '/dashboard/tools/strategy', icon: Brain },
        { name: 'Daily Game Plan', href: '/dashboard/game-plan', icon: Zap },
      ],
    },
    {
      label: 'Manage',
      items: [
        { name: 'Team', href: '/dashboard/team', icon: UsersRound },
        { name: 'Estimator', href: '/dashboard/tools/estimator', icon: Calculator },
        { name: 'Team Routing', href: '/dashboard/tools/routing', icon: Users },
        { name: 'CSV Import', href: '/dashboard/tools/import', icon: Upload },
        { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
        { name: 'Forms', href: '/dashboard/forms', icon: FileText },
      ],
    },
    {
      label: 'Account',
      items: [
        { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
        { name: 'Settings', href: '/dashboard/settings', icon: Settings },
        ...(showAdmin ? [{ name: 'Admin', href: '/dashboard/admin', icon: Shield }] : []),
      ],
    },
  ];
}

// ─── Map marketplace addon IDs to sidebar nav items ─────────────────────────

function getAddonNavItems(enabledAddons: string[]): NavItem[] {
  if (!enabledAddons.length) return [];

  const items: NavItem[] = [];
  for (const addon of MARKETPLACE_ADDONS) {
    if (enabledAddons.includes(addon.id)) {
      items.push({
        name: addon.name,
        href: addon.href,
        icon: addon.icon,
      });
    }
  }
  return items;
}

// ─── Mobile nav ─────────────────────────────────────────────────────────────

const mobileNav = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Leads', href: '/dashboard/leads', icon: Users },
  { name: 'Inbox', href: '/dashboard/inbox', icon: MessageSquare },
  { name: 'Pipeline', href: '/dashboard/pipeline', icon: Inbox },
  { name: 'More', href: '/dashboard/marketplace', icon: Store },
];

// ─── Sidebar component ─────────────────────────────────────────────────────

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { organization, user } = useOrganization();
  const [newLeadCount, setNewLeadCount] = useState(0);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const enabledAddons = organization?.enabled_addons || [];

  const coreSections = useMemo(() => getCoreNavSections(isSuperAdmin), [isSuperAdmin]);
  const addonItems = useMemo(() => getAddonNavItems(enabledAddons), [enabledAddons]);

  useEffect(() => {
    let cancelled = false;
    async function checkAdmin() {
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token || cancelled) return;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const res = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (res.ok && !cancelled) {
          const data = await res.json();
          if (data?.isSuperAdmin) setIsSuperAdmin(true);
        }
      } catch {
        // Network error or timeout — leave as non-admin
      }
    }
    checkAdmin();
    return () => { cancelled = true; };
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

  // ── Render a single nav item ──
  const renderNavItem = (item: NavItem) => {
    const isActive =
      item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname.startsWith(item.href);

    return (
      <Link
        key={item.name}
        href={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
          isActive
            ? 'text-[#4FD1E5] bg-[rgba(79,209,229,0.12)]'
            : 'text-white/50 hover:text-white/80 hover:bg-white/[0.06]'
        )}
      >
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#4FD1E5]"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
        <div className="relative shrink-0">
          <item.icon className={cn('w-[18px] h-[18px]', collapsed && 'mx-auto')} />
          {item.name === 'Leads' && newLeadCount > 0 && collapsed && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#EF6C6C] text-[8px] font-bold text-white flex items-center justify-center">
              {newLeadCount > 9 ? '9+' : newLeadCount}
            </span>
          )}
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="whitespace-nowrap overflow-hidden flex-1"
            >
              {item.name}
            </motion.span>
          )}
        </AnimatePresence>
        {item.name === 'Leads' && newLeadCount > 0 && !collapsed && (
          <span className="ml-auto px-1.5 py-0.5 rounded-full bg-[#EF6C6C] text-[9px] font-bold text-white leading-none">
            {newLeadCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex flex-col h-screen bg-[#1C2A3A] border-r border-white/[0.08] sticky top-0 z-30 shrink-0"
      >
        {/* Brand */}
        <div className="flex items-center justify-between h-[84px] px-4 border-b border-white/[0.08]">
          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center"
              >
                <Link href="/dashboard">
                  <Image
                    src="/odyssey-logo.png" unoptimized
                    alt="Odyssey"
                    width={170}
                    height={48}
                    className="h-16 w-auto object-contain"
                    priority
                  />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>

          {collapsed && (
            <Link href="/dashboard">
              <Image
                src="/odyssey-logo.png" unoptimized
                alt="Odyssey"
                width={36}
                height={36}
                className="w-12 h-12 object-contain mx-auto"
                priority
              />
            </Link>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-md text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-4">
          {/* Core sections */}
          {coreSections.map((section, sIdx) => (
            <div key={sIdx}>
              {section.label && !collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  {section.label}
                </p>
              )}
              {section.label && collapsed && (
                <div className="mx-auto w-5 border-t border-white/[0.08] mb-2" />
              )}
              <div className="space-y-0.5">
                {section.items.map(renderNavItem)}
              </div>
            </div>
          ))}

          {/* Enabled marketplace add-ons */}
          {addonItems.length > 0 && (
            <div>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">
                  Add-ons
                </p>
              )}
              {collapsed && (
                <div className="mx-auto w-5 border-t border-white/[0.08] mb-2" />
              )}
              <div className="space-y-0.5">
                {addonItems.map(renderNavItem)}
              </div>
            </div>
          )}

          {/* Marketplace link */}
          <div>
            {!collapsed && (
              <div className="mx-3 border-t border-white/[0.06] mb-2" />
            )}
            {collapsed && (
              <div className="mx-auto w-5 border-t border-white/[0.08] mb-2" />
            )}
            <Link
              href="/dashboard/marketplace"
              className={cn(
                'flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
                pathname === '/dashboard/marketplace'
                  ? 'text-[#4FD1E5] bg-[rgba(79,209,229,0.12)]'
                  : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
              )}
            >
              {pathname === '/dashboard/marketplace' && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#4FD1E5]"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative shrink-0">
                <Store className={cn('w-[18px] h-[18px]', collapsed && 'mx-auto')} />
              </div>
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    className="whitespace-nowrap overflow-hidden flex-1"
                  >
                    Marketplace
                  </motion.span>
                )}
              </AnimatePresence>
              {!collapsed && addonItems.length === 0 && (
                <span className="ml-auto px-1.5 py-0.5 rounded-full bg-[#A78BFA]/20 text-[9px] font-bold text-[#A78BFA] leading-none">
                  NEW
                </span>
              )}
            </Link>
          </div>
        </nav>

        {/* Bottom section — user menu */}
        <div className="relative p-3 border-t border-white/[0.08]">
          {/* Popup menu */}
          <AnimatePresence>
            {showUserMenu && !collapsed && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-2 right-2 mb-1 bg-[#243447] border border-white/[0.08] rounded-lg shadow-xl overflow-hidden z-50"
              >
                <Link
                  href="/dashboard/account"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:bg-white/[0.06] transition-colors"
                >
                  <User className="w-4 h-4" />
                  My Account
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:bg-white/[0.06] transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <Link
                  href="/dashboard/billing"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-white/70 hover:bg-white/[0.06] transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Billing
                </Link>
                <div className="border-t border-white/[0.08]" />
                <button
                  onClick={async () => {
                    setLoggingOut(true);
                    const supabase = createClient();
                    await supabase.auth.signOut();
                    document.cookie = 'od_session_confirmed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    router.push('/login');
                  }}
                  disabled={loggingOut}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" />
                  {loggingOut ? 'Logging out...' : 'Log Out'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {!collapsed ? (
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.1] flex items-center justify-center text-xs font-semibold text-white/70">
                {(organization?.name || 'OD').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-medium text-white/90 truncate">
                  {organization?.name || 'Odyssey'}
                </p>
                <p className="text-[10px] text-white/40 truncate capitalize">
                  {user?.role || 'Member'}
                </p>
              </div>
              <ChevronUp className={cn('w-3.5 h-3.5 text-white/40 transition-transform', showUserMenu ? '' : 'rotate-180')} />
            </button>
          ) : (
            <button
              onClick={async () => {
                setLoggingOut(true);
                const supabase = createClient();
                await supabase.auth.signOut();
                document.cookie = 'od_session_confirmed=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                router.push('/login');
              }}
              disabled={loggingOut}
              className="w-full flex items-center justify-center p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--od-bg-secondary)]/95 backdrop-blur-lg border-t border-[var(--od-border-subtle)] px-2 py-1.5 safe-area-bottom">
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
                  'flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-lg transition-colors',
                  isActive
                    ? 'text-[var(--od-accent)]'
                    : 'text-[var(--od-text-muted)]'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
