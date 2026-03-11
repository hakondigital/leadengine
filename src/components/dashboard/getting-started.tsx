'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useOrganization } from '@/hooks/use-organization';
import { createClient } from '@/lib/supabase/client';
import {
  Rocket,
  FileText,
  Settings,
  Bell,
  Palette,
  CheckCircle2,
  Circle,
  ChevronDown,
  X,
  ArrowRight,
  Loader2,
  Send,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  completed: boolean;
}

export function GettingStartedChecklist() {
  const { organization } = useOrganization();
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasForm, setHasForm] = useState(false);
  const [hasLead, setHasLead] = useState(false);

  const dismissKey = organization?.id ? `le_checklist_dismissed_${organization.id}` : null;

  // Check if dismissed
  useEffect(() => {
    if (!dismissKey) return;
    try {
      if (localStorage.getItem(dismissKey) === 'true') setDismissed(true);
    } catch {
      // ignore
    }
  }, [dismissKey]);

  // Auto-detect: query for forms and leads
  useEffect(() => {
    if (!organization?.id) return;

    async function checkProgress() {
      try {
        const supabase = createClient();

        const [formResult, leadResult] = await Promise.all([
          supabase
            .from('form_configs')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organization!.id),
          supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', organization!.id),
        ]);

        setHasForm((formResult.count ?? 0) > 0);
        setHasLead((leadResult.count ?? 0) > 0);
      } catch {
        // Silently fail — checklist still works with org data
      }
      setLoading(false);
    }

    checkProgress();
  }, [organization?.id]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    if (dismissKey) {
      try { localStorage.setItem(dismissKey, 'true'); } catch {}
    }
  }, [dismissKey]);

  if (dismissed || !organization) return null;

  // Auto-detect completion from real data
  const hasBusinessDetails = !!(
    organization.name &&
    organization.name !== 'My Business' &&
    organization.notification_email
  );

  const hasBranding = !!(
    organization.logo_url ||
    (organization.primary_color && organization.primary_color !== '#5B8DEF')
  );

  const hasNotifications = !!(
    organization.notification_email &&
    (organization.sms_notifications_enabled || organization.auto_reply_enabled)
  );

  const items: ChecklistItem[] = [
    {
      id: 'settings',
      label: 'Set up your business details',
      description: 'Add your business name, notification email, and phone number',
      href: '/dashboard/settings',
      icon: Settings,
      color: '#5B8DEF',
      completed: hasBusinessDetails,
    },
    {
      id: 'form',
      label: 'Create your first lead capture form',
      description: 'Choose a template and customise it for your industry',
      href: '/dashboard/forms',
      icon: FileText,
      color: '#E8636C',
      completed: hasForm,
    },
    {
      id: 'lead',
      label: 'Submit a test lead',
      description: 'Try out your form to see how leads appear in the dashboard',
      href: '/dashboard/forms',
      icon: Send,
      color: '#34C77B',
      completed: hasLead,
    },
    {
      id: 'branding',
      label: 'Customise your branding',
      description: 'Upload your logo and set your brand colours',
      href: '/dashboard/settings',
      icon: Palette,
      color: '#F0A030',
      completed: hasBranding,
    },
    {
      id: 'notifications',
      label: 'Configure notifications',
      description: 'Set up email and SMS alerts so you never miss a lead',
      href: '/dashboard/settings',
      icon: Bell,
      color: '#4FD1E5',
      completed: hasNotifications,
    },
  ];

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = (completedCount / totalCount) * 100;
  const allDone = completedCount === totalCount;

  // Don't show if all done (auto-dismiss after a moment)
  if (allDone && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)] rounded-xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(52,199,123,0.08)] border border-[rgba(52,199,123,0.15)] flex-1">
            <CheckCircle2 className="w-4 h-4 text-[#34C77B]" />
            <p className="text-xs text-[#34C77B] font-medium">
              All done! You&apos;re ready to capture leads.
            </p>
            <button
              onClick={handleDismiss}
              className="ml-auto text-xs text-[#34C77B] hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)] rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2.5 flex-1"
        >
          <Rocket className="w-4 h-4 text-[var(--od-accent)]" />
          <span className="text-sm font-semibold text-[var(--od-text-primary)]">
            Getting Started
          </span>
          <span className="text-[10px] font-medium text-[var(--od-text-muted)] bg-[var(--od-bg-tertiary)] px-1.5 py-0.5 rounded-full">
            {loading ? <Loader2 className="w-3 h-3 animate-spin inline" /> : `${completedCount}/${totalCount}`}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--od-text-muted)] transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-tertiary)] transition-colors"
          title="Dismiss checklist"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--od-bg-tertiary)] mx-4">
        <motion.div
          className="h-full bg-[var(--od-accent)] rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Checklist items */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-2 space-y-0.5">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-[var(--od-bg-tertiary)] transition-colors group"
                >
                  <div className="mt-0.5 shrink-0">
                    {item.completed ? (
                      <CheckCircle2 className="w-[18px] h-[18px] text-[var(--od-accent)]" />
                    ) : (
                      <Circle className="w-[18px] h-[18px] text-[var(--od-text-muted)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${item.completed ? 'text-[var(--od-text-muted)] line-through' : 'text-[var(--od-text-primary)]'}`}>
                      {item.label}
                    </p>
                    {!item.completed && (
                      <p className="text-xs text-[var(--od-text-muted)] mt-0.5">
                        {item.description}
                      </p>
                    )}
                  </div>
                  {!item.completed && (
                    <Link
                      href={item.href}
                      className="shrink-0 mt-0.5 flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-[var(--od-accent)] opacity-0 group-hover:opacity-100 hover:bg-[var(--od-accent-muted)] transition-all"
                    >
                      Set up
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
