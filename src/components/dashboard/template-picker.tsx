'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Search, X, ChevronRight } from 'lucide-react';
import { DEFAULT_TEMPLATES, CATEGORY_LABELS, fillTemplate, type EmailTemplate } from '@/lib/email-templates';

interface TemplatePickerProps {
  onSelect: (subject: string, body: string) => void;
  clientName?: string;
  orgName?: string;
  serviceType?: string;
}

export function TemplatePicker({ onSelect, clientName, orgName, serviceType }: TemplatePickerProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [search, setSearch] = useState('');
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Fetch templates from API on first open
  useEffect(() => {
    if (!open || loaded) return;
    (async () => {
      try {
        const res = await fetch('/api/templates');
        if (res.ok) {
          const data = await res.json();
          if (data.templates) setTemplates(data.templates);
        }
      } catch {
        // Fall back to defaults already in state
      }
      setLoaded(true);
    })();
  }, [open, loaded]);

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase()),
  );

  // Group by category
  const grouped: Record<string, EmailTemplate[]> = {};
  for (const t of filtered) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }

  const handleSelect = (template: EmailTemplate) => {
    const vars: Record<string, string> = {};
    if (clientName) vars.first_name = clientName;
    if (orgName) vars.business_name = orgName;
    if (serviceType) vars.service_type = serviceType;

    const { subject, body } = fillTemplate(template, vars);
    onSelect(subject, body);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] font-medium rounded-lg transition-colors text-[#737373] hover:text-[#0A0A0A] hover:bg-[#F5F5F5]"
        title="Insert template"
      >
        <FileText className="w-3.5 h-3.5" />
        Templates
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-[340px] max-h-[400px] bg-white rounded-xl shadow-xl border border-[#E5E5E5] z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
              <span className="text-[13px] font-semibold text-[#0A0A0A]">Email Templates</span>
              <button
                type="button"
                onClick={() => { setOpen(false); setSearch(''); }}
                className="p-1 rounded-md hover:bg-[#F5F5F5] text-[#A3A3A3] hover:text-[#0A0A0A] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A3A3A3]" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-lg bg-[#F5F5F5] text-[#0A0A0A] placeholder:text-[#A3A3A3] border-0 focus:outline-none focus:ring-2 focus:ring-[#6366F1]/20"
                  autoFocus
                />
              </div>
            </div>

            {/* Template list */}
            <div className="flex-1 overflow-y-auto px-1.5 pb-2">
              {Object.keys(grouped).length === 0 ? (
                <div className="text-center py-6 text-[12px] text-[#A3A3A3]">
                  No templates found
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-1">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                      {CATEGORY_LABELS[category as EmailTemplate['category']] || category}
                    </div>
                    {items.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleSelect(template)}
                        className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-left hover:bg-[#F5F5F5] transition-colors group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-medium text-[#0A0A0A] truncate">
                            {template.name}
                          </div>
                          <div className="text-[11px] text-[#A3A3A3] truncate">
                            {template.subject}
                          </div>
                        </div>
                        {template.custom && (
                          <span className="shrink-0 text-[9px] font-medium uppercase tracking-wide text-[#6366F1] bg-[#6366F1]/10 px-1.5 py-0.5 rounded">
                            Custom
                          </span>
                        )}
                        <ChevronRight className="w-3 h-3 text-[#D4D4D4] group-hover:text-[#737373] shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
