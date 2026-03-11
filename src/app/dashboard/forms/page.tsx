'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formTemplates } from '@/lib/form-templates';
import { useOrganization } from '@/hooks/use-organization';
import {
  FileText,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Loader2,
} from 'lucide-react';

export default function FormsPage() {
  const { organization } = useOrganization();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [activateError, setActivateError] = useState<string | null>(null);

  const orgSlug = organization?.slug || 'general';

  useEffect(() => {
    if (organization?.settings) {
      const settings = organization.settings as Record<string, unknown>;
      setActiveTemplateId((settings.form_template as string) || null);
    }
  }, [organization]);

  const activateTemplate = async (templateId: string) => {
    setActivating(templateId);
    setActivateError(null);
    try {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings_update: { form_template: templateId } }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setActiveTemplateId(templateId);
    } catch {
      setActivateError('Failed to activate template. Please try again.');
    } finally {
      setActivating(null);
    }
  };

  const copyFormLink = () => {
    const url = `${window.location.origin}/form/${orgSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedId('link');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyEmbedCode = () => {
    const code = `<iframe src="${window.location.origin}/form/${orgSlug}" width="100%" height="700" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(code);
    setEmbedCopied(true);
    setTimeout(() => setEmbedCopied(false), 2000);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
                Lead Forms
              </h1>
              <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
                Select a template to power your lead capture form
              </p>
            </div>
            <Button data-tour="new-form-btn" variant="secondary" size="sm" asChild>
              <a href={`/form/${orgSlug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                View Live Form
              </a>
            </Button>
          </div>
        </div>
      </header>

      {activateError && (
        <div className="mx-4 lg:mx-6 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
          {activateError}
        </div>
      )}

      <div className="px-4 lg:px-6 py-6">
        <div className="mb-5 p-4 rounded-[var(--od-radius-lg)] bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)] flex items-start gap-3">
          <Zap className="w-4 h-4 text-[var(--od-accent)] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-[var(--od-text-primary)]">Template-based forms</p>
            <p className="text-xs text-[var(--od-text-tertiary)] mt-0.5">
              Activate a template below to set the questions shown on your public form at{' '}
              <span className="text-[var(--od-accent)] font-mono">/form/{orgSlug}</span>.
              Your embed code automatically uses the active template.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formTemplates.map((template, i) => {
            const isActive = activeTemplateId === template.id || (!activeTemplateId && i === 0);
            const isActivating = activating === template.id;
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card className={`hover:border-[var(--od-border-default)] transition-colors group ${isActive ? 'border-[var(--od-accent)]/40 bg-[var(--od-accent-muted)]' : ''}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[var(--od-accent-muted)] border border-[rgba(79,209,229,0.2)] flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[var(--od-accent)]" />
                        </div>
                        <div>
                          <CardTitle>{template.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="accent" size="sm">{template.industry}</Badge>
                            {isActive && <Badge variant="success" size="sm">Active</Badge>}
                            <span className="text-[10px] text-[var(--od-text-muted)]">
                              {template.fields.length} fields &middot; {template.steps.length} steps
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Steps preview */}
                    <div className="flex items-center gap-1 mb-4">
                      {template.steps.map((step, idx) => (
                        <div key={step.id} className="flex items-center gap-1 flex-1">
                          <div className="text-[10px] text-[var(--od-text-muted)] truncate">
                            {step.title}
                          </div>
                          {idx < template.steps.length - 1 && (
                            <div className="flex-1 h-px bg-[var(--od-border-subtle)]" />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <Button variant="secondary" size="sm" className="flex-1" asChild>
                          <a href={`/form/${orgSlug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" />
                            Preview
                          </a>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => activateTemplate(template.id)}
                          disabled={isActivating}
                        >
                          {isActivating ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          {isActivating ? 'Activating…' : 'Activate'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={copyFormLink}
                        title="Copy form link"
                      >
                        {copiedId === 'link' ? (
                          <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Embed code section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--od-accent)]" />
                <CardTitle>Embed Your Form</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[var(--od-text-tertiary)] mb-3">
                Add this snippet to any website to embed your lead capture form.
              </p>
              <div className="bg-[var(--od-bg-primary)] rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] p-3 font-mono text-xs text-[var(--od-text-secondary)] overflow-x-auto">
                <code>
                  {`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/form/${orgSlug}" width="100%" height="700" frameborder="0"></iframe>`}
                </code>
              </div>
              <Button variant="secondary" size="sm" className="mt-3" onClick={copyEmbedCode}>
                {embedCopied ? <Check className="w-3 h-3 text-[#4ADE80]" /> : <Copy className="w-3 h-3" />}
                {embedCopied ? 'Copied!' : 'Copy Embed Code'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
