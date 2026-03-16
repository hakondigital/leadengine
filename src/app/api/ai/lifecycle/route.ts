import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature } from '@/lib/check-plan';
import { generateLifecycleMessage, type LifecycleStage } from '@/lib/ai-actions';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'leads@odyssey.io';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

const VALID_STAGES: LifecycleStage[] = ['check_in', 'review_request', 'referral_ask', 'cross_sell', 'maintenance', 'anniversary'];

// POST: Generate a lifecycle message (preview)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organization_id, lead_id, stage, custom_template } = body;

    if (!organization_id || !lead_id || !stage) {
      return NextResponse.json({ error: 'organization_id, lead_id, and stage required' }, { status: 400 });
    }

    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: `Invalid stage. Must be one of: ${VALID_STAGES.join(', ')}` }, { status: 400 });
    }

    // Plan gate
    const { allowed } = await checkFeature(organization_id, 'post_job_lifecycle');
    if (!allowed) {
      return NextResponse.json({ error: 'Upgrade to Professional to access Post-Job Lifecycle' }, { status: 403 });
    }

    const supabase = await createServiceRoleClient();

    // Fetch lead
    const { data: lead } = await supabase
      .from('leads')
      .select('first_name, last_name, service_type')
      .eq('id', lead_id)
      .eq('organization_id', organization_id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Get org name
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organization_id)
      .single();

    const message = await generateLifecycleMessage(
      `${lead.first_name} ${lead.last_name}`,
      lead.service_type || 'your project',
      org?.name || 'Our Team',
      stage as LifecycleStage,
      custom_template || undefined
    );

    return NextResponse.json(message);
  } catch (error) {
    console.error('[Lifecycle] Error:', error);
    return NextResponse.json({ error: 'Failed to generate lifecycle message' }, { status: 500 });
  }
}

// GET: Process lifecycle events for all eligible won leads (cron-only, requires secret token)
export async function GET(req: NextRequest) {
  try {
    const expectedToken = process.env.LIFECYCLE_SECRET_TOKEN;
    if (!expectedToken) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = req.nextUrl.searchParams.get('organization_id');
    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    // Check if lifecycle is enabled for this org
    const supabase = await createServiceRoleClient();
    const { data: org } = await supabase
      .from('organizations')
      .select('name, settings')
      .eq('id', orgId)
      .single();

    const settings = (org?.settings as Record<string, unknown>) || {};
    if (settings.post_job_lifecycle_enabled === false) {
      return NextResponse.json({ message: 'Post-job lifecycle is disabled', processed: 0 });
    }

    // Fetch won leads with won_date
    const { data: wonLeads } = await supabase
      .from('leads')
      .select('id, first_name, last_name, email, phone, service_type, won_date')
      .eq('organization_id', orgId)
      .eq('status', 'won')
      .not('won_date', 'is', null);

    if (!wonLeads || wonLeads.length === 0) {
      return NextResponse.json({ message: 'No completed jobs to process', processed: 0 });
    }

    const now = new Date();
    const processed: string[] = [];

    // Define lifecycle schedule (days after won_date)
    const schedule: { stage: LifecycleStage; day: number }[] = [
      { stage: 'check_in', day: 1 },
      { stage: 'review_request', day: 3 },
      { stage: 'referral_ask', day: 14 },
      { stage: 'cross_sell', day: 30 },
    ];

    // Get custom templates from settings
    const templates = (settings.lifecycle_templates as Record<string, string>) || {};

    for (const lead of wonLeads) {
      if (!lead.won_date) continue;
      const daysSinceWon = Math.floor((now.getTime() - new Date(lead.won_date).getTime()) / 86400000);

      for (const { stage, day } of schedule) {
        if (daysSinceWon !== day) continue;

        // Check if already sent (by looking for a system note)
        const { data: existing } = await supabase
          .from('lead_notes')
          .select('id')
          .eq('lead_id', lead.id)
          .eq('is_system', true)
          .ilike('content', `%lifecycle:${stage}%`)
          .limit(1);

        if (existing && existing.length > 0) continue;

        // Check stage-specific setting
        if (settings[`lifecycle_${stage}_enabled`] === false) continue;

        const message = await generateLifecycleMessage(
          `${lead.first_name} ${lead.last_name}`,
          lead.service_type || 'your project',
          org?.name || 'Our Team',
          stage,
          templates[stage] || undefined
        );

        // Log the lifecycle event
        await supabase.from('lead_notes').insert({
          lead_id: lead.id,
          content: `lifecycle:${stage} — ${stage.replace('_', ' ')} message generated`,
          is_system: true,
        });

        processed.push(`${lead.first_name} ${lead.last_name}: ${stage}`);

        // Send via configured channel
        const lifecycleChannel = (settings.lifecycle_channel as string) || 'email';

        if ((lifecycleChannel === 'email' || lifecycleChannel === 'both') && lead.email && RESEND_API_KEY) {
          const bodyHtml = (message.email_body || '')
            .split('\n\n')
            .map((p: string) => `<p style="margin:0 0 16px;color:#4A5568;font-size:14px;line-height:1.7;">${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
          const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F7F9FB;font-family:-apple-system,sans-serif;"><div style="max-width:600px;margin:0 auto;padding:32px 24px;"><div style="background:#FFFFFF;border:1px solid #EEF1F5;border-radius:12px;padding:32px 24px;">${bodyHtml}</div><p style="margin:24px 0 0;text-align:center;color:#A0ABB5;font-size:11px;">${org?.name || ''}</p></div></body></html>`;
          try {
            const emailRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
              body: JSON.stringify({
                from: `${org?.name || 'Odyssey'} <${FROM_EMAIL}>`,
                to: lead.email,
                subject: message.email_subject || `${stage.replace(/_/g, ' ')} — ${org?.name || ''}`,
                html,
              }),
            });
            if (!emailRes.ok) {
              console.error(`[Lifecycle] Email send failed for ${lead.email}: ${emailRes.status}`);
            }
          } catch (emailErr) {
            // Non-critical: lifecycle processing continues even if email fails
            console.error('[Lifecycle] Email error:', emailErr instanceof Error ? emailErr.message : emailErr);
          }
        }

        if ((lifecycleChannel === 'sms' || lifecycleChannel === 'both') && lead.phone && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
          try {
            const smsRes = await fetch(
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
                  Body: message.sms_body || `Hi ${lead.first_name}, a message from ${org?.name || 'us'}`,
                }).toString(),
              }
            );
            if (!smsRes.ok) {
              console.error(`[Lifecycle] SMS send failed for ${lead.phone}: ${smsRes.status}`);
            }
          } catch (smsErr) {
            // Non-critical: lifecycle processing continues even if SMS fails
            console.error('[Lifecycle] SMS error:', smsErr instanceof Error ? smsErr.message : smsErr);
          }
        }
      }
    }

    return NextResponse.json({ message: 'Lifecycle processing complete', processed: processed.length, details: processed });
  } catch (error) {
    console.error('[Lifecycle] Error:', error);
    return NextResponse.json({ error: 'Failed to process lifecycle events' }, { status: 500 });
  }
}

// PUT: Send a lifecycle message (email or SMS) with user-edited content
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { organization_id, lead_id, stage, channel, email_subject, email_body, sms_body } = body;

    if (!organization_id || !lead_id || !stage || !channel) {
      return NextResponse.json({ error: 'organization_id, lead_id, stage, and channel required' }, { status: 400 });
    }

    if (!VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const { allowed } = await checkFeature(organization_id, 'post_job_lifecycle');
    if (!allowed) {
      return NextResponse.json({ error: 'Upgrade to Professional to access Post-Job Lifecycle' }, { status: 403 });
    }

    const supabase = await createServiceRoleClient();

    // Fetch lead + org
    const [leadRes, orgRes] = await Promise.all([
      supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone, service_type')
        .eq('id', lead_id)
        .eq('organization_id', organization_id)
        .single(),
      supabase
        .from('organizations')
        .select('name, notification_email')
        .eq('id', organization_id)
        .single(),
    ]);

    const lead = leadRes.data;
    const org = orgRes.data;
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const stageLabel = stage.replace(/_/g, ' ');
    let sent = false;

    if (channel === 'email' && email_body) {
      if (!lead.email) {
        return NextResponse.json({ error: 'Lead has no email address' }, { status: 400 });
      }
      if (!RESEND_API_KEY) {
        return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
      }

      // Convert plain text to HTML paragraphs
      const bodyHtml = email_body
        .split('\n\n')
        .map((p: string) => `<p style="margin:0 0 16px;color:#4A5568;font-size:14px;line-height:1.7;">${p.replace(/\n/g, '<br>')}</p>`)
        .join('');

      const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F9FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:32px;text-align:center;">
      <h2 style="margin:0;color:#1A2332;font-size:18px;font-weight:600;">${org?.name || 'Our Team'}</h2>
    </div>
    <div style="background:#FFFFFF;border:1px solid #EEF1F5;border-radius:12px;padding:32px 24px;box-shadow:0 1px 3px rgba(28,42,58,0.06);">
      ${bodyHtml}
    </div>
    <div style="margin-top:24px;text-align:center;">
      <p style="margin:0;color:#A0ABB5;font-size:11px;">${org?.name || ''}</p>
    </div>
  </div>
</body>
</html>`;

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `${org?.name || 'Odyssey'} <${FROM_EMAIL}>`,
          to: lead.email,
          reply_to: org?.notification_email || undefined,
          subject: email_subject || `${stageLabel} — ${org?.name || ''}`,
          html,
        }),
      });

      if (!emailRes.ok) {
        const err = await emailRes.text().catch(() => 'unknown');
        console.error('[Lifecycle] Email send error:', err);
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
      }
      sent = true;
    }

    if (channel === 'sms' && sms_body) {
      if (!lead.phone) {
        return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 });
      }
      if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
        return NextResponse.json({ error: 'SMS not configured' }, { status: 500 });
      }

      const smsRes = await fetch(
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
            Body: sms_body,
          }).toString(),
        }
      );

      if (!smsRes.ok) {
        const err = await smsRes.text().catch(() => 'unknown');
        console.error('[Lifecycle] SMS send error:', err);
        return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
      }
      sent = true;
    }

    if (!sent) {
      return NextResponse.json({ error: 'No message content provided for the selected channel' }, { status: 400 });
    }

    // Log the send as a system note + update last_contacted_at
    await Promise.all([
      supabase.from('lead_notes').insert({
        lead_id: lead.id,
        content: `lifecycle:${stage} — ${stageLabel} ${channel} sent to ${lead.first_name} ${lead.last_name}`,
        is_system: true,
      }),
      supabase
        .from('leads')
        .update({ last_contacted_at: new Date().toISOString() })
        .eq('id', lead.id),
    ]);

    return NextResponse.json({ success: true, channel, stage });
  } catch (error) {
    console.error('[Lifecycle] Send error:', error);
    return NextResponse.json({ error: 'Failed to send lifecycle message' }, { status: 500 });
  }
}
