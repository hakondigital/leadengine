'use client';

import { use, useState, useEffect } from 'react';
import { LeadCaptureForm } from '@/components/lead-form/lead-capture-form';
import { AIChatWidget } from '@/components/chat/ai-chat-widget';
import { getDefaultTemplate } from '@/lib/form-templates';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';

export default function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const template = getDefaultTemplate();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function lookupOrg() {
      const supabase = createClient();
      const { data } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('slug', slug)
        .single();

      if (data) {
        setOrgId(data.id);
        setOrgName(data.name);
      }
      setLoading(false);
    }
    lookupOrg();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--le-bg-primary)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--le-accent)]" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="min-h-screen bg-[var(--le-bg-primary)] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[var(--le-text-primary)]">Form not found</h1>
          <p className="text-sm text-[var(--le-text-tertiary)] mt-2">
            This form link is invalid or the organization doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--le-bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--le-accent-muted)] border border-[rgba(79,209,229,0.2)] mb-4">
            <Sparkles className="w-6 h-6 text-[var(--le-accent)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--le-text-primary)] tracking-tight">
            {orgName ? `Get a Quote from ${orgName}` : 'Get a Free Quote'}
          </h1>
          <p className="text-sm text-[var(--le-text-tertiary)] mt-1.5 max-w-sm mx-auto">
            Tell us about your project and we&apos;ll get back to you with a detailed quote.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-[var(--le-radius-xl)] border border-[var(--le-border-subtle)] bg-[var(--le-bg-secondary)] p-6 sm:p-8 shadow-[var(--le-shadow-lg)] relative overflow-hidden">
          <LeadCaptureForm
            template={template}
            organizationId={orgId}
            source="embedded_form"
            sourceUrl={typeof window !== 'undefined' ? window.location.href : undefined}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-[var(--le-text-muted)] mt-6">
          Powered by LeadEngine
        </p>
      </div>

      {/* AI Chat Widget */}
      <AIChatWidget orgSlug={slug} orgId={orgId} />
    </div>
  );
}
