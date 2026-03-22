import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { syncGmailForOrg } from '@/app/api/gmail/sync/route';
import { syncOutlookForOrg } from '@/app/api/outlook/sync/route';

// GET /api/cron/gmail-sync — cron job that syncs all connected Gmail and Outlook accounts
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  // ── Gmail sync ──────────────────────────────────────────────

  const { data: gmailOrgs, error: gmailQueryError } = await supabase
    .from('organizations')
    .select('id, name, settings')
    .not('settings->>gmail_refresh_token', 'is', null);

  if (gmailQueryError) {
    console.error('[Gmail Cron] Query error:', gmailQueryError);
  }

  const gmailResults: Array<{ org_id: string; org_name: string; synced: number; skipped: number; error?: string }> = [];

  for (const org of gmailOrgs || []) {
    const settings = (org.settings as Record<string, unknown>) || {};
    if (!settings.gmail_refresh_token) continue;

    try {
      const result = await syncGmailForOrg(org.id);
      gmailResults.push({
        org_id: org.id,
        org_name: org.name,
        synced: result.synced,
        skipped: result.skipped,
        error: result.error,
      });
    } catch (err) {
      console.error(`[Gmail Cron] Error syncing org ${org.id}:`, err);
      gmailResults.push({
        org_id: org.id,
        org_name: org.name,
        synced: 0,
        skipped: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // ── Outlook sync ────────────────────────────────────────────

  const { data: outlookOrgs, error: outlookQueryError } = await supabase
    .from('organizations')
    .select('id, name, settings')
    .not('settings->>outlook_refresh_token', 'is', null);

  if (outlookQueryError) {
    console.error('[Outlook Cron] Query error:', outlookQueryError);
  }

  const outlookResults: Array<{ org_id: string; org_name: string; synced: number; skipped: number; error?: string }> = [];

  for (const org of outlookOrgs || []) {
    const settings = (org.settings as Record<string, unknown>) || {};
    if (!settings.outlook_refresh_token) continue;

    try {
      const result = await syncOutlookForOrg(org.id);
      outlookResults.push({
        org_id: org.id,
        org_name: org.name,
        synced: result.synced,
        skipped: result.skipped,
        error: result.error,
      });
    } catch (err) {
      console.error(`[Outlook Cron] Error syncing org ${org.id}:`, err);
      outlookResults.push({
        org_id: org.id,
        org_name: org.name,
        synced: 0,
        skipped: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // ── Summary ─────────────────────────────────────────────────

  const allResults = [...gmailResults, ...outlookResults];
  const totalSynced = allResults.reduce((sum, r) => sum + r.synced, 0);
  const totalSkipped = allResults.reduce((sum, r) => sum + r.skipped, 0);
  const totalErrors = allResults.filter((r) => r.error).length;

  return NextResponse.json({
    message: 'Email sync cron complete',
    gmail: {
      organizations_processed: gmailResults.length,
      total_synced: gmailResults.reduce((sum, r) => sum + r.synced, 0),
      total_skipped: gmailResults.reduce((sum, r) => sum + r.skipped, 0),
      total_errors: gmailResults.filter((r) => r.error).length,
      details: gmailResults,
    },
    outlook: {
      organizations_processed: outlookResults.length,
      total_synced: outlookResults.reduce((sum, r) => sum + r.synced, 0),
      total_skipped: outlookResults.reduce((sum, r) => sum + r.skipped, 0),
      total_errors: outlookResults.filter((r) => r.error).length,
      details: outlookResults,
    },
    total_synced: totalSynced,
    total_skipped: totalSkipped,
    total_errors: totalErrors,
  });
}
