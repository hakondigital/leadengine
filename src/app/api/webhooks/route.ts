import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature } from '@/lib/check-plan';

// GET: List configured webhooks
export async function GET() {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user: authUser } } = await authClient.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_id', authUser.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', userProfile.organization_id)
      .single();

    const webhooks = (org?.settings as Record<string, unknown>)?.webhooks || [];
    return NextResponse.json({ webhooks });
  } catch (error) {
    console.error('Webhooks GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Add or update a webhook
export async function POST(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user: authUser } } = await authClient.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('auth_id', authUser.id)
      .single();

    if (!userProfile || (userProfile.role !== 'owner' && userProfile.role !== 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const webhookCheck = await checkFeature(userProfile.organization_id, 'webhooks');
    if (!webhookCheck.allowed) {
      return NextResponse.json({ error: 'Webhooks are not available on your plan. Upgrade to Professional or Enterprise.' }, { status: 403 });
    }

    const { url, events, name } = await request.json();

    if (!url || !events || !Array.isArray(events)) {
      return NextResponse.json({ error: 'url and events[] are required' }, { status: 400 });
    }

    // Validate URL — must be a public HTTPS endpoint
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 });
    }

    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Webhook URL must be a public HTTPS endpoint' }, { status: 400 });
    }

    const privatePatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^::1$/,
      /^fd[0-9a-f]{2}:/i,
    ];
    if (privatePatterns.some((p) => p.test(parsedUrl.hostname))) {
      return NextResponse.json({ error: 'Webhook URL must be a public HTTPS endpoint' }, { status: 400 });
    }

    const validEvents = ['lead.created', 'lead.status_changed', 'lead.won', 'lead.lost'];
    const filteredEvents = events.filter((e: string) => validEvents.includes(e));

    if (filteredEvents.length === 0) {
      return NextResponse.json({ error: `Invalid events. Valid: ${validEvents.join(', ')}` }, { status: 400 });
    }

    // Get current settings
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', userProfile.organization_id)
      .single();

    const settings = (org?.settings || {}) as Record<string, unknown>;
    const webhooks = (settings.webhooks || []) as Array<Record<string, unknown>>;

    // Add new webhook
    webhooks.push({
      id: crypto.randomUUID(),
      name: name || url,
      url,
      events: filteredEvents,
      active: true,
      created_at: new Date().toISOString(),
    });

    // Save
    await supabase
      .from('organizations')
      .update({ settings: { ...settings, webhooks } })
      .eq('id', userProfile.organization_id);

    return NextResponse.json({ success: true, webhook: webhooks[webhooks.length - 1] }, { status: 201 });
  } catch (error) {
    console.error('Webhook POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove a webhook
export async function DELETE(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user: authUser } } = await authClient.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('auth_id', authUser.id)
      .single();

    if (!userProfile || (userProfile.role !== 'owner' && userProfile.role !== 'admin')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { webhookId } = await request.json();
    if (!webhookId) {
      return NextResponse.json({ error: 'webhookId is required' }, { status: 400 });
    }

    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', userProfile.organization_id)
      .single();

    const settings = (org?.settings || {}) as Record<string, unknown>;
    const webhooks = ((settings.webhooks || []) as Array<Record<string, unknown>>)
      .filter((w) => w.id !== webhookId);

    await supabase
      .from('organizations')
      .update({ settings: { ...settings, webhooks } })
      .eq('id', userProfile.organization_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
