'use client';

import { useState } from 'react';
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
  Settings,
  Plus,
  Zap,
} from 'lucide-react';

export default function FormsPage() {
  const { organization } = useOrganization();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [embedCopied, setEmbedCopied] = useState(false);

  const orgSlug = organization?.slug || 'general';

  const copyFormLink = (templateId: string) => {
    const url = `${window.location.origin}/form/${templateId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(templateId);
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
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
                Lead Forms
              </h1>
              <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
                Manage your capture form templates
              </p>
            </div>
            <Button size="sm">
              <Plus className="w-3.5 h-3.5" />
              New Form
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {formTemplates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="hover:border-[var(--le-border-default)] transition-colors group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--le-accent-muted)] border border-[rgba(79,209,229,0.2)] flex items-center justify-center">
                        <FileText className="w-5 h-5 text-[var(--le-accent)]" />
                      </div>
                      <div>
                        <CardTitle>{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="accent" size="sm">{template.industry}</Badge>
                          <span className="text-[10px] text-[var(--le-text-muted)]">
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
                        <div className="text-[10px] text-[var(--le-text-muted)] truncate">
                          {step.title}
                        </div>
                        {idx < template.steps.length - 1 && (
                          <div className="flex-1 h-px bg-[var(--le-border-subtle)]" />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" asChild>
                      <a href={`/form/${template.id}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3" />
                        Preview
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => copyFormLink(template.id)}
                    >
                      {copiedId === template.id ? (
                        <Check className="w-3.5 h-3.5 text-[#4ADE80]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon-sm">
                      <Settings className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {/* Add new form card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: formTemplates.length * 0.05 }}
          >
            <button className="w-full h-full min-h-[200px] rounded-[var(--le-radius-lg)] border border-dashed border-[var(--le-border-default)] bg-[var(--le-bg-secondary)]/30 flex flex-col items-center justify-center gap-3 hover:border-[var(--le-accent)]/30 hover:bg-[var(--le-accent-muted)] transition-all duration-200 group">
              <div className="w-10 h-10 rounded-xl bg-[var(--le-bg-tertiary)] border border-[var(--le-border-subtle)] flex items-center justify-center group-hover:bg-[var(--le-accent)]/10 group-hover:border-[var(--le-accent)]/20 transition-all">
                <Plus className="w-5 h-5 text-[var(--le-text-muted)] group-hover:text-[var(--le-accent)] transition-colors" />
              </div>
              <span className="text-xs font-medium text-[var(--le-text-muted)] group-hover:text-[var(--le-accent)] transition-colors">
                Create Custom Form
              </span>
            </button>
          </motion.div>
        </div>

        {/* Embed code section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-[var(--le-accent)]" />
                <CardTitle>Embed Your Form</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-[var(--le-text-tertiary)] mb-3">
                Add this snippet to any website to embed your lead capture form.
              </p>
              <div className="bg-[var(--le-bg-primary)] rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)] p-3 font-mono text-xs text-[var(--le-text-secondary)] overflow-x-auto">
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
