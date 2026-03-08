import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { chatWithLead } from '@/lib/ai-actions';

export async function POST(request: NextRequest) {
  try {
    const { messages, orgSlug, orgId } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    // Chat endpoint is public (used on client websites) but needs an org reference
    let orgName = 'Our Company';
    let industry = 'general services';
    let formFields = ['name', 'email', 'phone', 'project details'];

    if (orgSlug || orgId) {
      const supabase = await createServiceRoleClient();
      const query = orgSlug
        ? supabase.from('organizations').select('name, industry').eq('slug', orgSlug).single()
        : supabase.from('organizations').select('name, industry').eq('id', orgId).single();

      const { data: org } = await query;
      if (org) {
        orgName = org.name;
        industry = org.industry || industry;
      }
    }

    const reply = await chatWithLead(messages, orgName, industry, formFields);
    return NextResponse.json({ reply });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
