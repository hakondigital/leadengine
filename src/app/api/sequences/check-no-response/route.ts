import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkNoResponseLeads } from '@/lib/sequence-triggers';

// POST /api/sequences/check-no-response
// Call this periodically (e.g. via cron every hour) to find stale leads
// and auto-enroll them in no_response sequences.

export async function POST() {
  try {
    const supabase = await createServiceRoleClient();
    const enrolled = await checkNoResponseLeads(supabase);

    return NextResponse.json({
      success: true,
      enrolled,
      checked_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('No-response check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
