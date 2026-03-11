import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { chatWithLead, extractLeadFromChat } from '@/lib/ai-actions';

export async function POST(request: NextRequest) {
  try {
    const { messages, orgSlug, orgId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    // Chat endpoint is public (used on client websites) but needs an org reference
    let orgName = 'Our Company';
    let industry = 'general services';
    let resolvedOrgId = orgId || null;
    const formFields = ['name', 'email', 'phone', 'project details'];
    let businessContext = '';

    const supabase = await createServiceRoleClient();

    if (orgSlug || orgId) {
      const query = orgSlug
        ? supabase.from('organizations').select('id, name, industry, settings').eq('slug', orgSlug).single()
        : supabase.from('organizations').select('id, name, industry, settings').eq('id', orgId).single();

      const { data: org } = await query;
      if (org) {
        orgName = org.name;
        industry = org.industry || industry;
        resolvedOrgId = org.id;

        // Build business context from chatbot settings
        const settings = (org.settings as Record<string, unknown>) || {};
        const parts: string[] = [];
        if (settings.chatbot_hours) parts.push(`Business hours: ${settings.chatbot_hours}`);
        if (settings.chatbot_services) parts.push(`Services offered: ${settings.chatbot_services}`);
        if (settings.chatbot_instructions) parts.push(`Additional info: ${settings.chatbot_instructions}`);
        if (parts.length > 0) businessContext = parts.join('\n');
      }
    }

    const reply = await chatWithLead(messages, orgName, industry, formFields, businessContext);

    // Try to extract lead info from conversation and auto-create if we have enough
    let leadCreated = false;
    if (resolvedOrgId && messages.length >= 3) {
      const extracted = extractLeadFromChat(messages);

      if (extracted.has_enough_info && extracted.email) {
        // Check if lead already exists for this org + email
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('organization_id', resolvedOrgId)
          .eq('email', extracted.email)
          .limit(1)
          .maybeSingle();

        if (!existing) {
          const nameParts = (extracted.name || '').split(' ');
          await supabase.from('leads').insert({
            organization_id: resolvedOrgId,
            first_name: nameParts[0] || 'Chat',
            last_name: nameParts.slice(1).join(' ') || 'Visitor',
            email: extracted.email,
            phone: extracted.phone || null,
            service_type: extracted.service_type || null,
            message: extracted.message || null,
            source: 'chat_widget',
            status: 'new',
          });
          leadCreated = true;
        }
      }
    }

    return NextResponse.json({ reply, lead_created: leadCreated });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
