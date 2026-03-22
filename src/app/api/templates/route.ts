import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { DEFAULT_TEMPLATES, type EmailTemplate } from '@/lib/email-templates';

/**
 * Authenticate the caller and return their org ID + service-role client.
 * Returns an error response if authentication fails.
 */
async function getCallerOrg() {
  const authClient = await createServerSupabaseClient();
  const { data: { user: authUser } } = await authClient.auth.getUser();

  if (!authUser) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }

  const supabase = await createServiceRoleClient();
  const { data: profile } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('auth_id', authUser.id)
    .maybeSingle();

  if (!profile) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) } as const;
  }

  return { orgId: profile.organization_id as string, role: profile.role as string, supabase } as const;
}

// ─── GET — return all templates (defaults + custom) ──────────────────────────
export async function GET() {
  try {
    const result = await getCallerOrg();
    if ('error' in result) return result.error;
    const { orgId, supabase } = result;

    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', orgId)
      .single();

    const settings = (org?.settings as Record<string, unknown>) || {};
    const customTemplates = (settings.custom_templates as EmailTemplate[]) || [];

    // Merge: defaults first, then custom
    const all = [...DEFAULT_TEMPLATES, ...customTemplates.map((t) => ({ ...t, custom: true }))];

    return NextResponse.json({ templates: all });
  } catch (error) {
    console.error('Templates GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── POST — save a new custom template ───────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const result = await getCallerOrg();
    if ('error' in result) return result.error;
    const { orgId, role, supabase } = result;

    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { name, subject, body: templateBody, category } = body;

    if (!name || !subject || !templateBody || !category) {
      return NextResponse.json({ error: 'Missing required fields: name, subject, body, category' }, { status: 400 });
    }

    const validCategories = ['follow_up', 'quote', 'thank_you', 'review', 'appointment', 'general'];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Get current settings
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', orgId)
      .single();

    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const customTemplates = (currentSettings.custom_templates as EmailTemplate[]) || [];

    const newTemplate: EmailTemplate = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      subject,
      body: templateBody,
      category,
      custom: true,
    };

    customTemplates.push(newTemplate);

    const { error } = await supabase
      .from('organizations')
      .update({ settings: { ...currentSettings, custom_templates: customTemplates } })
      .eq('id', orgId);

    if (error) {
      console.error('Template save error:', error);
      return NextResponse.json({ error: 'Failed to save template' }, { status: 500 });
    }

    return NextResponse.json({ template: newTemplate });
  } catch (error) {
    console.error('Templates POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── DELETE — remove a custom template by id ─────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const result = await getCallerOrg();
    if ('error' in result) return result.error;
    const { orgId, role, supabase } = result;

    if (role !== 'owner' && role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const templateId = searchParams.get('id');

    if (!templateId) {
      return NextResponse.json({ error: 'Template id required' }, { status: 400 });
    }

    // Cannot delete default templates
    if (templateId.startsWith('default-')) {
      return NextResponse.json({ error: 'Cannot delete default templates' }, { status: 400 });
    }

    // Get current settings
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', orgId)
      .single();

    const currentSettings = (org?.settings as Record<string, unknown>) || {};
    const customTemplates = (currentSettings.custom_templates as EmailTemplate[]) || [];

    const filtered = customTemplates.filter((t) => t.id !== templateId);

    if (filtered.length === customTemplates.length) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('organizations')
      .update({ settings: { ...currentSettings, custom_templates: filtered } })
      .eq('id', orgId);

    if (error) {
      console.error('Template delete error:', error);
      return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Templates DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
