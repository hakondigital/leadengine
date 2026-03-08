'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useOrganization } from '@/hooks/use-organization';
import {
  Rocket,
  FileText,
  Settings,
  Phone,
  Users,
  Star,
  CheckCircle2,
  Circle,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'settings',
    label: 'Set up your business details',
    description: 'Add your business name, notification email, and phone number',
    href: '/dashboard/settings',
    icon: Settings,
    color: '#5B8DEF',
  },
  {
    id: 'form',
    label: 'Create your first lead capture form',
    description: 'Choose a template and customise it for your industry',
    href: '/dashboard/forms',
    icon: FileText,
    color: '#E8636C',
  },
  {
    id: 'lead',
    label: 'Submit a test lead',
    description: 'Try out your form to see how leads appear in the dashboard',
    href: '/dashboard/forms',
    icon: Users,
    color: '#34C77B',
  },
  {
    id: 'branding',
    label: 'Customise your branding',
    description: 'Upload your logo and set your brand colours',
    href: '/dashboard/settings',
    icon: Star,
    color: '#F0A030',
  },
  {
    id: 'notifications',
    label: 'Configure notifications',
    description: 'Set up email and SMS alerts so you never miss a lead',
    href: '/dashboard/settings',
    icon: Phone,
    color: '#4FD1E5',
  },
];

export function GettingStartedChecklist() {
  const { organization } = useOrganization();
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const storageKey = organization?.id ? `le_checklist_${organization.id}` : null;
  const dismissKey = organization?.id ? `le_checklist_dismissed_${organization.id}` : null;

  useEffect(() => {
    if (!storageKey || !dismissKey) return;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setCompletedItems(JSON.parse(saved));
      const isDismissed = localStorage.getItem(dismissKey);
      if (isDismissed === 'true') setDismissed(true);
    } catch {
      // ignore
    }
  }, [storageKey, dismissKey]);

  const toggleItem = useCallback((id: string) => {
    setCompletedItems(prev => {
      const next = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      }
      return next;
    });
  }, [storageKey]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    if (dismissKey) {
      try { localStorage.setItem(dismissKey, 'true'); } catch {}
    }
  }, [dismissKey]);

  if (dismissed || !organization) return null;

  const completedCount = completedItems.length;
  const totalCount = CHECKLIST_ITEMS.length;
  const progress = (completedCount / totalCount) * 100;
  const allDone = completedCount === totalCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-[var(--le-bg-secondary)] border border-[var(--le-border-subtle)] rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2.5 flex-1"
        >
          <Rocket className="w-4 h-4 text-[var(--le-accent)]" />
          <span className="text-sm font-semibold text-[var(--le-text-primary)]">
            Getting Started
          </span>
          <span className="text-[10px] font-medium text-[var(--le-text-muted)] bg-[var(--le-bg-tertiary)] px-1.5 py-0.5 rounded-full">
            {completedCount}/{totalCount}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-[var(--le-text-muted)] transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded text-[var(--le-text-muted)] hover:text-[var(--le-text-secondary)] hover:bg-[var(--le-bg-tertiary)] transition-colors"
          title="Dismiss checklist"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-[var(--le-bg-tertiary)] mx-4">
        <motion.div
          className="h-full bg-[var(--le-accent)] rounded-full"
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
              {CHECKLIST_ITEMS.map((item) => {
                const done = completedItems.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 px-2 py-2 rounded-lg hover:bg-[var(--le-bg-tertiary)] transition-colors group"
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="mt-0.5 shrink-0"
                    >
                      {done ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-[var(--le-accent)]" />
                      ) : (
                        <Circle className="w-4.5 h-4.5 text-[var(--le-text-muted)]" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${done ? 'text-[var(--le-text-muted)] line-through' : 'text-[var(--le-text-primary)]'}`}>
                        {item.label}
                      </p>
                      {!done && (
                        <p className="text-xs text-[var(--le-text-muted)] mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {!done && (
                      <Link
                        href={item.href}
                        className="shrink-0 mt-0.5 p-1 rounded text-[var(--le-text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--le-accent)] transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>

            {allDone && (
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(52,199,123,0.08)] border border-[rgba(52,199,123,0.15)]">
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
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
