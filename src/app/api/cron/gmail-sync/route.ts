import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { syncGmailForOrg } from '@/app/api/gmail/sync/route';

// GET /api/cron/gmail-sync — cron job that syncs all connected Gmail accounts
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  // Find all organizations with Gmail connected (have a refresh token)
  const { data: orgs, error: queryError } = await supabase
    .from('organizations')
    .select('id, name, settings')
    .not('settings->>gmail_refresh_token', 'is', null);

  if (queryError) {
    console.error('[Gmail Cron] Query error:', queryError);
    return NextResponse.json({ error: 'Failed to query organizations' }, { status: 500 });
  }

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ message: 'No Gmail-connected organizations', total_synced: 0 });
  }

  const results: Array<{ org_id: string; org_name: string; synced: number; skipped: number; error?: string }> = [];

  for (const org of orgs) {
    const settings = (org.settings as Record<string, unknown>) || {};
    // Double-check refresh token exists (the query filter should handle this, but be safe)
    if (!settings.gmail_refresh_token) continue;

    try {
      const result = await syncGmailForOrg(org.id);
      results.push({
        org_id: org.id,
        org_name: org.name,
        synced: result.synced,
        skipped: result.skipped,
        error: result.error,
      });
    } catch (err) {
      console.error(`[Gmail Cron] Error syncing org ${org.id}:`, err);
      results.push({
        org_id: org.id,
        org_name: org.name,
        synced: 0,
        skipped: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  const totalSynced = results.reduce((sum, r) => sum + r.synced, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skipped, 0);
  const totalErrors = results.filter((r) => r.error).length;

  return NextResponse.json({
    message: 'Gmail sync cron complete',
    organizations_processed: results.length,
    total_synced: totalSynced,
    total_skipped: totalSkipped,
    total_errors: totalErrors,
    details: results,
  });
}
