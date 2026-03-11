'use client';

import { use, useState, useEffect } from 'react';
import { LeadCaptureForm } from '@/components/lead-form/lead-capture-form';
import { AIChatWidget } from '@/components/chat/ai-chat-widget';
import { getDefaultTemplate, getTemplate } from '@/lib/form-templates';
import { createClient } from '@/lib/supabase/client';
import { Sparkles, Loader2 } from 'lucide-react';

export default function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [template, setTemplate] = useState(getDefaultTemplate());
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [chatbotGreeting, setChatbotGreeting] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function lookupOrg() {
      const supabase = createClient();
      const { data } = await supabase
        .from('organizations')
        .select('id, name, settings')
        .eq('slug', slug)
        .single();

      if (data) {
        setOrgId(data.id);
        setOrgName(data.name);
        const settings = (data.settings as Record<string, unknown>) || {};
        setChatbotEnabled(settings.chatbot_enabled !== false);
        if (settings.chatbot_greeting) setChatbotGreeting(settings.chatbot_greeting as string);
        if (settings.form_template) {
          const t = getTemplate(settings.form_template as string);
          if (t) setTemplate(t);
        }
      }
      setLoading(false);
    }
    lookupOrg();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--od-bg-primary)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--od-accent)]" />
      </div>
    );
  }

  if (!orgId) {
    return (
      <div className="min-h-screen bg-[var(--od-bg-primary)] flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[var(--od-text-primary)]">Form not found</h1>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-2">
            This form link is invalid or the organization doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--od-bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--od-accent-muted)] border border-[rgba(79,209,229,0.2)] mb-4">
            <Sparkles className="w-6 h-6 text-[var(--od-accent)]" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--od-text-primary)] tracking-tight">
            {orgName ? `Get a Quote from ${orgName}` : 'Get a Free Quote'}
          </h1>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-1.5 max-w-sm mx-auto">
            Tell us about your project and we&apos;ll get back to you with a detailed quote.
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-[var(--od-radius-xl)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] p-6 sm:p-8 shadow-[var(--od-shadow-lg)] relative overflow-hidden">
          <LeadCaptureForm
            template={template}
            organizationId={orgId}
            source="embedded_form"
            sourceUrl={typeof window !== 'undefined' ? window.location.href : undefined}
          />
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-[var(--od-text-muted)] mt-6">
          Powered by Odyssey
        </p>
      </div>

      {/* AI Chat Widget */}
      {chatbotEnabled && (
        <AIChatWidget
          orgSlug={slug}
          orgId={orgId}
          greeting={chatbotGreeting || undefined}
        />
      )}
    </div>
  );
}
