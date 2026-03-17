import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'leads@odyssey.io';

// Ghost Recovery Cron — runs daily at 9am AEST (23:00 UTC previous day).
// Detects leads that have gone silent and sends multi-channel re-engagement.
// Stage 1 (5+ days): Email. Stage 2 (10+ days): SMS. Stage 3 (15+ days): Flags for manual call.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createServiceRoleClient();
  const now = new Date();

  // Get all orgs with ghost recovery enabled
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name, notification_email, phone, settings');

  if (!orgs) {
    return NextResponse.json({ message: 'No organizations', processed: 0 });
  }

  let totalRecovered = 0;

  for (const org of orgs) {
    const settings = (org.settings as Record<string, unknown>) || {};
    if (settings.ghost_recovery_enabled === false) continue;

    try {
      // Find ghost leads: contacted/quoted but no activity in 5+ days, not already in ghost recovery
      const { data: ghostLeads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone, service_type, status, updated_at, ghost_recovery_stage')
        .eq('organization_id', org.id)
        .in('status', ['contacted', 'quoted'])
        .lt('updated_at', new Date(now.getTime() - 5 * 86400000).toISOString())
        .order('updated_at', { ascending: true })
        .limit(50);

      if (!ghostLeads || ghostLeads.length === 0) continue;

      for (const lead of ghostLeads) {
        const daysSilent = Math.floor((now.getTime() - new Date(lead.updated_at).getTime()) / 86400000);
        const currentStage = (lead.ghost_recovery_stage as number) || 0;

        // Stage 1: Email (5+ days, not yet contacted)
        if (daysSilent >= 5 && currentStage < 1 && lead.email && RESEND_API_KEY) {
          const subject = lead.service_type
            ? `Still thinking about ${lead.service_type}? — ${org.name}`
            : `Just checking in — ${org.name}`;

          const html = buildGhostEmail(lead, org.name, daysSilent);

          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: `${org.name} <${FROM_EMAIL}>`,
              to: lead.email,
              reply_to: org.notification_email,
              subject,
              html,
            }),
          });

          await supabase
            .from('leads')
            .update({ ghost_recovery_stage: 1 })
            .eq('id', lead.id);

          totalRecovered++;
        }

        // Stage 2: SMS (10+ days, already emailed)
        if (daysSilent >= 10 && currentStage < 2 && lead.phone) {
          const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
          const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
          const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

          if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
            const smsBody = `Hi ${lead.first_name}, it's ${org.name}. We noticed we hadn't heard back from you${lead.service_type ? ` about ${lead.service_type}` : ''}. Still interested? Happy to answer any questions. Just reply to this text.`;

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
                  To: lead.phone,
                  Body: smsBody,
                }).toString(),
              }
            );

            await supabase
              .from('leads')
              .update({ ghost_recovery_stage: 2 })
              .eq('id', lead.id);

            totalRecovered++;
          }
        }

        // Stage 3: Flag for manual call (15+ days)
        if (daysSilent >= 15 && currentStage < 3) {
          await supabase
            .from('leads')
            .update({ ghost_recovery_stage: 3 })
            .eq('id', lead.id);

          // Notify the business owner to make a personal call
          if (RESEND_API_KEY && org.notification_email) {
            await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: `Odyssey <${FROM_EMAIL}>`,
                to: org.notification_email,
                subject: `📞 Ghost lead needs a personal call — ${lead.first_name} ${lead.last_name}`,
                html: `<div style="font-family:-apple-system,sans-serif;max-width:500px;margin:0 auto;padding:24px;">
                  <p style="color:#4A5568;font-size:14px;line-height:1.7;">
                    <strong>${lead.first_name} ${lead.last_name}</strong> has been silent for <strong>${daysSilent} days</strong>.
                    We've already sent an email and SMS with no response.
                  </p>
                  <p style="color:#4A5568;font-size:14px;line-height:1.7;">
                    A personal phone call is the last-resort recovery tactic and often works.
                    ${lead.phone ? `<br><br><strong>Phone:</strong> <a href="tel:${lead.phone}">${lead.phone}</a>` : ''}
                    ${lead.service_type ? `<br><strong>Service:</strong> ${lead.service_type}` : ''}
                  </p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/leads" style="display:inline-block;padding:10px 20px;background:#2F3E4F;color:#fff;border-radius:6px;text-decoration:none;font-size:13px;font-weight:600;margin-top:12px;">
                    View in Dashboard
                  </a>
                </div>`,
              }),
            });
          }

          totalRecovered++;
        }
      }
    } catch (error) {
      console.error(`[Ghost Recovery] Error for org ${org.id}:`, error);
    }
  }

  return NextResponse.json({ message: 'Ghost recovery complete', leads_processed: totalRecovered });
}

function buildGhostEmail(
  lead: { first_name: string; last_name: string; service_type: string | null },
  orgName: string,
  daysSilent: number
): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F9FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <div style="margin-bottom:32px;text-align:center;">
    <h2 style="margin:0;color:#1A2332;font-size:18px;font-weight:600;">${orgName}</h2>
  </div>
  <div style="background:#FFFFFF;border:1px solid #EEF1F5;border-radius:12px;padding:32px 24px;box-shadow:0 1px 3px rgba(28,42,58,0.06);">
    <h1 style="margin:0 0 16px;color:#1A2332;font-size:20px;font-weight:600;">
      Hi ${lead.first_name}, just checking in
    </h1>
    <p style="margin:0 0 16px;color:#4A5568;font-size:14px;line-height:1.7;">
      We reached out a little while ago${lead.service_type ? ` about your ${lead.service_type} enquiry` : ''} and wanted to make sure you got everything you needed.
    </p>
    <p style="margin:0 0 16px;color:#4A5568;font-size:14px;line-height:1.7;">
      If you've got any questions, changed your mind on timing, or just need a quick chat — we're here. No pressure at all.
    </p>
    <p style="margin:0 0 24px;color:#4A5568;font-size:14px;line-height:1.7;">
      Just reply to this email and we'll get back to you straight away.
    </p>
    <div style="border-top:1px solid #EEF1F5;padding-top:16px;">
      <p style="margin:0;color:#7B8794;font-size:12px;">
        Cheers,<br>${orgName} team
      </p>
    </div>
  </div>
</div>
</body></html>`;
}
