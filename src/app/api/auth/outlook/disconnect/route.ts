import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/auth/outlook/disconnect — removes Outlook integration from an organization
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id } = body;

    if (!organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', organization_id)
      .single();

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const existingSettings = (org.settings as Record<string, unknown>) || {};

    // Remove all outlook_* keys
    const cleanedSettings: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(existingSettings)) {
      if (!key.startsWith('outlook_')) {
        cleanedSettings[key] = value;
      }
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ settings: cleanedSettings })
      .eq('id', organization_id);

    if (updateError) {
      console.error('Failed to disconnect Outlook:', updateError);
      return NextResponse.json(
        { error: 'Failed to disconnect Outlook' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Outlook disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Outlook' },
      { status: 500 }
    );
  }
}
