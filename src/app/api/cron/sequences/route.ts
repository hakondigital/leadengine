import { NextResponse, type NextRequest } from 'next/server';

// Vercel Cron handler — runs every 15 minutes.
// Calls the sequence processor to send due follow-up messages.
export async function GET(req: NextRequest) {
  // Verify this is a genuine Vercel cron call
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
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

  try {
    const res = await fetch(`${appUrl}/api/sequences/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    return NextResponse.json({
      message: 'Sequence cron complete',
      status: res.status,
      ...data,
    });
  } catch (err) {
    console.error('[Cron/Sequences] Error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Failed to process sequences' }, { status: 500 });
  }
}
