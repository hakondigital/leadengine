import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'leads@odyssey.io';

// Vercel Cron — runs every morning at 6:30am AEST (20:30 UTC previous day).
// Sends each org owner a morning briefing with today's agenda.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();

  // Get all orgs with morning briefing enabled
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, notification_email, settings, phone');

  if (!orgs || orgs.length === 0) {
    return NextResponse.json({ message: 'No organizations', sent: 0 });
  }

  let sent = 0;

  for (const org of orgs) {
    const settings = (org.settings as Record<string, unknown>) || {};
    if (settings.morning_briefing_enabled === false) continue;

    try {
      const briefing = await buildBriefing(supabase, org.id, org.name);
      if (!briefing) continue;

      // Send email
      if (RESEND_API_KEY && org.notification_email) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: `${org.name} <${FROM_EMAIL}>`,
            to: org.notification_email,
            subject: `☀️ Morning Briefing — ${briefing.headline}`,
            html: renderBriefingEmail(briefing, org.name),
          }),
        });
        sent++;
      }

      // Send SMS summary if org has phone and SMS enabled
      if (settings.morning_briefing_sms !== false && org.phone) {
        const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
        const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
        const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

        if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
          await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization: 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64'),
              },
              body: new URLSearchParams({
                From: TWILIO_PHONE_NUMBER,
                To: org.phone,
                Body: briefing.smsText,
              }).toString(),
            }
          );
        }
      }
    } catch (error) {
      console.error(`[Morning Briefing] Error for org ${org.id}:`, error);
    }
  }

  return NextResponse.json({ message: 'Morning briefing complete', sent });
}

interface Briefing {
  headline: string;
  newLeadsOvernight: number;
  todayAppointments: Array<{ title: string; time: string; leadName: string }>;
  expiringQuotes: Array<{ leadName: string; total: number; daysSent: number; viewCount: number }>;
  hotLeads: Array<{ name: string; score: number; service: string }>;
  pipelineValue: number;
  followUpsNeeded: number;
  weatherAlert: string | null;
  smsText: string;
}

async function buildBriefing(
  supabase: ReturnType<typeof createServiceRoleClient> extends Promise<infer T> ? T : never,
  orgId: string,
  orgName: string
): Promise<Briefing | null> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);

  // Parallel data fetches
  const [leadsRes, appointmentsRes, quotesRes, followUpRes] = await Promise.all([
    // New leads since yesterday
    supabase
      .from('leads')
      .select('first_name, last_name, service_type, ai_score, status, created_at')
      .eq('organization_id', orgId)
      .gte('created_at', yesterdayStart.toISOString())
      .order('ai_score', { ascending: false }),

    // Today's appointments
    supabase
      .from('appointments')
      .select('title, start_time, lead_id, leads:lead_id(first_name, last_name)')
      .eq('organization_id', orgId)
      .gte('start_time', todayStart.toISOString())
      .lte('start_time', todayEnd.toISOString())
      .neq('status', 'cancelled')
      .order('start_time', { ascending: true }),

    // Quotes sent but not accepted (potential expiring)
    supabase
      .from('quotes')
      .select('lead_id, total, sent_at, status, leads:lead_id(first_name, last_name)')
      .eq('organization_id', orgId)
      .in('status', ['sent', 'viewed'])
      .order('sent_at', { ascending: true })
      .limit(10),

    // Leads that need follow-up (contacted but no activity in 3+ days)
    supabase
      .from('leads')
      .select('id')
      .eq('organization_id', orgId)
      .in('status', ['contacted', 'quoted'])
      .lt('updated_at', new Date(now.getTime() - 3 * 86400000).toISOString()),
  ]);

  const leads = leadsRes.data || [];
  const appointments = appointmentsRes.data || [];
  const quotes = quotesRes.data || [];
  const followUps = followUpRes.data || [];

  const newLeadsOvernight = leads.filter(
    (l) => new Date(l.created_at || '').getTime() >= yesterdayStart.getTime()
  ).length;

  const hotLeads = leads
    .filter((l) => (l.ai_score || 0) >= 70 && l.status === 'new')
    .slice(0, 3)
    .map((l) => ({
      name: `${l.first_name} ${l.last_name}`,
      score: l.ai_score || 0,
      service: l.service_type || 'General',
    }));

  const todayAppointments = appointments.map((a) => {
    const lead = a.leads as unknown as { first_name: string; last_name: string } | null;
    return {
      title: a.title || 'Appointment',
      time: new Date(a.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
      leadName: lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown',
    };
  });

  const expiringQuotes = quotes
    .filter((q) => {
      if (!q.sent_at) return false;
      const daysSent = Math.floor((now.getTime() - new Date(q.sent_at).getTime()) / 86400000);
      return daysSent >= 5;
    })
    .slice(0, 3)
    .map((q) => {
      const lead = q.leads as unknown as { first_name: string; last_name: string } | null;
      return {
        leadName: lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown',
        total: q.total || 0,
        daysSent: Math.floor((now.getTime() - new Date(q.sent_at!).getTime()) / 86400000),
        viewCount: 0,
      };
    });

  // Calculate pipeline value from active quotes
  const pipelineValue = quotes.reduce((sum, q) => sum + (q.total || 0), 0);

  // Build headline
  let headline = '';
  if (hotLeads.length > 0) {
    headline = `${hotLeads.length} hot lead${hotLeads.length > 1 ? 's' : ''} waiting`;
  } else if (todayAppointments.length > 0) {
    headline = `${todayAppointments.length} appointment${todayAppointments.length > 1 ? 's' : ''} today`;
  } else if (newLeadsOvernight > 0) {
    headline = `${newLeadsOvernight} new lead${newLeadsOvernight > 1 ? 's' : ''} overnight`;
  } else {
    headline = 'Your daily overview';
  }

  // Build SMS text (concise)
  const smsParts: string[] = [`Good morning from ${orgName}.`];
  if (newLeadsOvernight > 0) smsParts.push(`${newLeadsOvernight} new lead${newLeadsOvernight > 1 ? 's' : ''} overnight.`);
  if (hotLeads.length > 0) smsParts.push(`${hotLeads.length} high-score lead${hotLeads.length > 1 ? 's' : ''} to action.`);
  if (todayAppointments.length > 0) smsParts.push(`${todayAppointments.length} appointment${todayAppointments.length > 1 ? 's' : ''} today.`);
  if (expiringQuotes.length > 0) smsParts.push(`${expiringQuotes.length} quote${expiringQuotes.length > 1 ? 's' : ''} expiring.`);
  if (followUps.length > 0) smsParts.push(`${followUps.length} follow-up${followUps.length > 1 ? 's' : ''} needed.`);
  smsParts.push(`Open dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`);

  return {
    headline,
    newLeadsOvernight,
    todayAppointments,
    expiringQuotes,
    hotLeads,
    pipelineValue,
    followUpsNeeded: followUps.length,
    weatherAlert: null,
    smsText: smsParts.join(' '),
  };
}

function renderBriefingEmail(b: Briefing, orgName: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';

  const appointmentRows = b.todayAppointments
    .map((a) => `<tr><td style="padding:8px 0;color:#1A2332;font-size:13px;font-weight:500;">${a.time}</td><td style="padding:8px 0 8px 16px;color:#4A5568;font-size:13px;">${a.title} — ${a.leadName}</td></tr>`)
    .join('');

  const hotLeadRows = b.hotLeads
    .map((l) => `<tr><td style="padding:6px 0;color:#1A2332;font-size:13px;">${l.name}</td><td style="padding:6px 0 6px 16px;color:#4A5568;font-size:13px;">${l.service}</td><td style="padding:6px 0 6px 16px;color:#2DA8BC;font-size:13px;font-weight:600;">${l.score}/100</td></tr>`)
    .join('');

  const expiringRows = b.expiringQuotes
    .map((q) => `<tr><td style="padding:6px 0;color:#1A2332;font-size:13px;">${q.leadName}</td><td style="padding:6px 0 6px 16px;color:#4A5568;font-size:13px;">$${q.total.toLocaleString()}</td><td style="padding:6px 0 6px 16px;color:#E8636C;font-size:13px;">${q.daysSent}d ago</td></tr>`)
    .join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F9FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">

  <div style="margin-bottom:24px;text-align:center;">
    <h2 style="margin:0;color:#1A2332;font-size:18px;font-weight:600;">${orgName}</h2>
    <p style="margin:4px 0 0;color:#7B8794;font-size:12px;">Morning Briefing — ${new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
  </div>

  <div style="background:#FFFFFF;border:1px solid #EEF1F5;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(28,42,58,0.06);">
    <div style="padding:24px;border-bottom:1px solid #EEF1F5;">
      <h1 style="margin:0;color:#1A2332;font-size:20px;font-weight:700;letter-spacing:-0.02em;">${b.headline}</h1>
    </div>

    <!-- Stats row -->
    <div style="display:flex;border-bottom:1px solid #EEF1F5;">
      <div style="flex:1;padding:16px 24px;text-align:center;border-right:1px solid #EEF1F5;">
        <div style="font-size:24px;font-weight:700;color:#1A2332;">${b.newLeadsOvernight}</div>
        <div style="font-size:11px;color:#7B8794;margin-top:2px;">New Leads</div>
      </div>
      <div style="flex:1;padding:16px 24px;text-align:center;border-right:1px solid #EEF1F5;">
        <div style="font-size:24px;font-weight:700;color:#1A2332;">${b.todayAppointments.length}</div>
        <div style="font-size:11px;color:#7B8794;margin-top:2px;">Appointments</div>
      </div>
      <div style="flex:1;padding:16px 24px;text-align:center;border-right:1px solid #EEF1F5;">
        <div style="font-size:24px;font-weight:700;color:#1A2332;">${b.followUpsNeeded}</div>
        <div style="font-size:11px;color:#7B8794;margin-top:2px;">Follow-ups</div>
      </div>
      <div style="flex:1;padding:16px 24px;text-align:center;">
        <div style="font-size:24px;font-weight:700;color:#2DA8BC;">$${b.pipelineValue.toLocaleString()}</div>
        <div style="font-size:11px;color:#7B8794;margin-top:2px;">Pipeline</div>
      </div>
    </div>

    ${b.todayAppointments.length > 0 ? `
    <div style="padding:20px 24px;border-bottom:1px solid #EEF1F5;">
      <h3 style="margin:0 0 12px;color:#7B8794;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Today's Schedule</h3>
      <table style="width:100%;border-collapse:collapse;">${appointmentRows}</table>
    </div>` : ''}

    ${b.hotLeads.length > 0 ? `
    <div style="padding:20px 24px;border-bottom:1px solid #EEF1F5;">
      <h3 style="margin:0 0 12px;color:#7B8794;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">🔥 Hot Leads — Action Now</h3>
      <table style="width:100%;border-collapse:collapse;">${hotLeadRows}</table>
    </div>` : ''}

    ${b.expiringQuotes.length > 0 ? `
    <div style="padding:20px 24px;border-bottom:1px solid #EEF1F5;">
      <h3 style="margin:0 0 12px;color:#7B8794;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">⏰ Quotes Aging — Follow Up</h3>
      <table style="width:100%;border-collapse:collapse;">${expiringRows}</table>
    </div>` : ''}

    ${b.followUpsNeeded > 0 ? `
    <div style="padding:20px 24px;border-bottom:1px solid #EEF1F5;">
      <p style="margin:0;color:#4A5568;font-size:13px;">
        <strong>${b.followUpsNeeded} lead${b.followUpsNeeded > 1 ? 's' : ''}</strong> haven't heard from you in 3+ days. Don't let them go cold.
      </p>
    </div>` : ''}
  </div>

  <div style="margin-top:24px;text-align:center;">
    <a href="${appUrl}/dashboard" style="display:inline-block;padding:12px 28px;background:#2F3E4F;color:#FFFFFF;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
      Open Dashboard
    </a>
  </div>

  <div style="margin-top:24px;text-align:center;">
    <p style="margin:0;color:#A0ABB5;font-size:11px;">Sent by ${orgName} — Powered by Odyssey</p>
  </div>
</div>
</body></html>`;
}
