import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest) {
  try {
    const authClient = await createServerSupabaseClient();

    // Get authenticated user
    const { data: { user: authUser } } = await authClient.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    // Get user profile to find their org
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('auth_id', authUser.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userProfile.role !== 'owner' && userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();

    // Only allow updating specific fields
    const allowedFields = [
      'name', 'notification_email', 'phone', 'sms_notifications_enabled',
      'auto_reply_enabled', 'google_review_link', 'follow_up_enabled',
      'primary_color', 'accent_color', 'logo_url', 'timezone',
    ];

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = body[key];
      }
    }

    // Handle settings_update — merges into existing settings JSONB
    if (body.settings_update && typeof body.settings_update === 'object') {
      const { data: currentOrg } = await supabase
        .from('organizations')
        .select('settings')
        .eq('id', userProfile.organization_id)
        .single();

      const currentSettings = (currentOrg?.settings as Record<string, unknown>) || {};
      // Only allow safe keys in settings_update
      const safeSettingsKeys = ['onboarding_completed', 'ai_model', 'ai_temperature', 'ai_custom_prompt'];
      const settingsUpdate: Record<string, unknown> = {};
      for (const key of safeSettingsKeys) {
        if (key in body.settings_update) {
          settingsUpdate[key] = body.settings_update[key];
        }
      }
      updates.settings = { ...currentSettings, ...settingsUpdate };
    }

    const { data: org, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', userProfile.organization_id)
      .select()
      .single();

    if (error) {
      console.error('Org update error:', error);
      return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
    }

    return NextResponse.json(org);
  } catch (error) {
    console.error('Org update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
