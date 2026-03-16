import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Vercel Cron handler — runs every 6 hours.
// Iterates all orgs with lifecycle enabled and calls the lifecycle processor.
export async function GET(req: NextRequest) {
  // Verify this is a genuine Vercel cron call
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET; // Vercel sets this automatically for cron jobs
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.LIFECYCLE_SECRET_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'LIFECYCLE_SECRET_TOKEN not set' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_APP_URL not set' }, { status: 500 });
  }

  // Get all orgs that have lifecycle enabled
  const supabase = await createServiceRoleClient();
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id');

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ message: 'No organizations found', processed: 0 });
  }

  const results: { orgId: string; status: number; processed?: number }[] = [];

  for (const org of orgs) {
    try {
      const res = await fetch(
        `${appUrl}/api/ai/lifecycle?organization_id=${org.id}`,
        {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      results.push({ orgId: org.id, status: res.status, processed: data.processed });
    } catch {
      results.push({ orgId: org.id, status: 500 });
    }
  }

  return NextResponse.json({
    message: 'Lifecycle cron complete',
    orgs_processed: results.length,
    results,
  });
}
