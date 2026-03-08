import type { Lead, Organization } from './database.types';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'leads@leadengine.io';

interface EmailPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(payload: EmailPayload): Promise<{ id: string } | null> {
  if (!RESEND_API_KEY) {
    console.warn('Resend API key not configured — email skipped');
    return null;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Email send error:', error);
    return null;
  }

  return response.json();
}

function getPriorityLabel(lead: Lead): string {
  if (lead.urgency === 'asap' || lead.urgency === 'emergency') return 'URGENT';
  if (lead.budget_range?.includes('50k') || lead.budget_range?.includes('150k') || lead.budget_range?.includes('500k')) return 'HIGH VALUE';
  return '';
}

function getUrgencyColor(lead: Lead): string {
  if (lead.urgency === 'asap' || lead.urgency === 'emergency') return '#E8636C';
  if (lead.urgency === 'within_week' || lead.urgency === 'soon') return '#F0A030';
  return '#5B8DEF';
}

export async function sendBusinessNotification(lead: Lead, org: Organization) {
  const priorityLabel = getPriorityLabel(lead);
  const urgencyColor = getUrgencyColor(lead);
  const subject = `${priorityLabel ? `[${priorityLabel}] ` : ''}New Lead: ${lead.first_name} ${lead.last_name}${lead.service_type ? ` — ${lead.service_type}` : ''}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F7F9FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <!-- Header -->
    <div style="margin-bottom:24px;">
      <div style="display:inline-block;padding:4px 12px;border-radius:6px;background:${urgencyColor}15;border:1px solid ${urgencyColor}30;color:${urgencyColor};font-size:12px;font-weight:600;letter-spacing:0.5px;">
        NEW LEAD${priorityLabel ? ` — ${priorityLabel}` : ''}
      </div>
    </div>

    <!-- Main card -->
    <div style="background:#FFFFFF;border:1px solid #EEF1F5;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(28,42,58,0.06);">
      <!-- Lead name header -->
      <div style="padding:24px 24px 16px;border-bottom:1px solid #EEF1F5;">
        <h1 style="margin:0;color:#1A2332;font-size:20px;font-weight:600;letter-spacing:-0.02em;">
          ${lead.first_name} ${lead.last_name}
        </h1>
        ${lead.company ? `<p style="margin:4px 0 0;color:#7B8794;font-size:14px;">${lead.company}</p>` : ''}
      </div>

      <!-- Details grid -->
      <div style="padding:20px 24px;">
        <table style="width:100%;border-collapse:collapse;">
          ${lead.email ? `<tr>
            <td style="padding:6px 0;color:#7B8794;font-size:13px;width:100px;">Email</td>
            <td style="padding:6px 0;color:#1A2332;font-size:13px;"><a href="mailto:${lead.email}" style="color:#2DA8BC;text-decoration:none;">${lead.email}</a></td>
          </tr>` : ''}
          ${lead.phone ? `<tr>
            <td style="padding:6px 0;color:#7B8794;font-size:13px;">Phone</td>
            <td style="padding:6px 0;color:#1A2332;font-size:13px;"><a href="tel:${lead.phone}" style="color:#2DA8BC;text-decoration:none;">${lead.phone}</a></td>
          </tr>` : ''}
          ${lead.service_type ? `<tr>
            <td style="padding:6px 0;color:#7B8794;font-size:13px;">Service</td>
            <td style="padding:6px 0;color:#1A2332;font-size:13px;">${lead.service_type}</td>
          </tr>` : ''}
          ${lead.project_type ? `<tr>
            <td style="padding:6px 0;color:#7B8794;font-size:13px;">Project</td>
            <td style="padding:6px 0;color:#1A2332;font-size:13px;">${lead.project_type}</td>
          </tr>` : ''}
          ${lead.location ? `<tr>
            <td style="padding:6px 0;color:#7B8794;font-size:13px;">Location</td>
            <td style="padding:6px 0;color:#1A2332;font-size:13px;">${lead.location}</td>
          </tr>` : ''}
          ${lead.budget_range ? `<tr>
            <td style="padding:6px 0;color:#7B8794;font-size:13px;">Budget</td>
            <td style="padding:6px 0;color:#1A2332;font-size:13px;">${lead.budget_range}</td>
          </tr>` : ''}
          ${lead.urgency ? `<tr>
            <td style="padding:6px 0;color:#7B8794;font-size:13px;">Urgency</td>
            <td style="padding:6px 0;color:${urgencyColor};font-size:13px;font-weight:500;">${lead.urgency}</td>
          </tr>` : ''}
        </table>
      </div>

      ${lead.message ? `
      <!-- Message -->
      <div style="padding:16px 24px 24px;border-top:1px solid #EEF1F5;">
        <p style="margin:0 0 8px;color:#7B8794;font-size:12px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Message</p>
        <p style="margin:0;color:#4A5568;font-size:14px;line-height:1.6;">${lead.message}</p>
      </div>` : ''}
    </div>

    <!-- CTA -->
    <div style="margin-top:24px;text-align:center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/leads/${lead.id}"
         style="display:inline-block;padding:12px 28px;background:#2F3E4F;color:#FFFFFF;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
        View Full Lead
      </a>
    </div>

    <!-- Footer -->
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #EEF1F5;text-align:center;">
      <p style="margin:0;color:#A0ABB5;font-size:11px;">
        Sent by ${org.name} Lead System
      </p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    from: `${org.name} Leads <${FROM_EMAIL}>`,
    to: org.notification_email,
    subject,
    html,
  });
}

export async function sendProspectConfirmation(lead: Lead, org: Organization) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F7F9FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <!-- Logo / Brand -->
    <div style="margin-bottom:32px;text-align:center;">
      <h2 style="margin:0;color:#1A2332;font-size:18px;font-weight:600;letter-spacing:-0.01em;">${org.name}</h2>
    </div>

    <!-- Main card -->
    <div style="background:#FFFFFF;border:1px solid #EEF1F5;border-radius:12px;padding:32px 24px;text-align:center;box-shadow:0 1px 3px rgba(28,42,58,0.06);">
      <div style="width:48px;height:48px;margin:0 auto 20px;background:#34C77B15;border:1px solid #34C77B30;border-radius:50%;display:flex;align-items:center;justify-content:center;">
        <span style="font-size:24px;color:#34C77B;">&#10003;</span>
      </div>

      <h1 style="margin:0 0 12px;color:#1A2332;font-size:22px;font-weight:600;letter-spacing:-0.02em;">
        We've received your enquiry
      </h1>

      <p style="margin:0 0 24px;color:#4A5568;font-size:14px;line-height:1.6;">
        Hi ${lead.first_name}, thank you for getting in touch. We've received your details and our team will review your enquiry shortly.
      </p>

      <div style="background:#F7F9FB;border:1px solid #EEF1F5;border-radius:8px;padding:16px;text-align:left;">
        <p style="margin:0 0 4px;color:#7B8794;font-size:12px;font-weight:500;">What happens next:</p>
        <p style="margin:0;color:#4A5568;font-size:13px;line-height:1.6;">
          We typically respond within 1 business hour during business hours. If your request is urgent, we'll prioritise it accordingly.
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top:32px;text-align:center;">
      <p style="margin:0;color:#A0ABB5;font-size:11px;">
        ${org.name} &mdash; Powered by LeadEngine
      </p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    from: `${org.name} <${FROM_EMAIL}>`,
    to: lead.email,
    subject: `We've received your enquiry — ${org.name}`,
    html,
  });
}

// Smart auto-reply based on AI score — higher urgency = more personal response
export async function sendSmartAutoReply(
  lead: Lead,
  org: Organization,
  aiScore: number,
  recommendedAction: string
) {
  let responseTime = 'within 24 hours';
  let urgencyNote = '';

  if (aiScore >= 80) {
    responseTime = 'within 30 minutes';
    urgencyNote = "We can see this is a priority for you, so we've flagged it for immediate attention.";
  } else if (aiScore >= 60) {
    responseTime = 'within 1-2 hours';
    urgencyNote = "We've prioritised your enquiry and will be in touch soon.";
  } else if (aiScore >= 40) {
    responseTime = 'within 4 hours';
    urgencyNote = '';
  }

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F9FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:32px;text-align:center;">
      <h2 style="margin:0;color:#1A2332;font-size:18px;font-weight:600;">${org.name}</h2>
    </div>
    <div style="background:#FFFFFF;border:1px solid #EEF1F5;border-radius:12px;padding:32px 24px;box-shadow:0 1px 3px rgba(28,42,58,0.06);">
      <h1 style="margin:0 0 16px;color:#1A2332;font-size:20px;font-weight:600;">
        Hi ${lead.first_name}, thanks for reaching out!
      </h1>
      <p style="margin:0 0 16px;color:#4A5568;font-size:14px;line-height:1.7;">
        We've received your enquiry${lead.service_type ? ` about ${lead.service_type}` : ''} and a member of our team will be in touch <strong style="color:#2DA8BC;">${responseTime}</strong>.
      </p>
      ${urgencyNote ? `<p style="margin:0 0 16px;color:#4A5568;font-size:14px;line-height:1.7;">${urgencyNote}</p>` : ''}
      <div style="background:#F7F9FB;border:1px solid #EEF1F5;border-radius:8px;padding:16px;">
        <p style="margin:0 0 8px;color:#7B8794;font-size:12px;font-weight:500;">YOUR ENQUIRY SUMMARY</p>
        <p style="margin:0;color:#1A2332;font-size:13px;line-height:1.6;">
          ${lead.service_type ? `Service: ${lead.service_type}<br>` : ''}
          ${lead.location ? `Location: ${lead.location}<br>` : ''}
          ${lead.budget_range ? `Budget: ${lead.budget_range}<br>` : ''}
        </p>
      </div>
    </div>
    <div style="margin-top:24px;text-align:center;">
      <p style="margin:0;color:#A0ABB5;font-size:11px;">${org.name}</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    from: `${org.name} <${FROM_EMAIL}>`,
    to: lead.email,
    subject: `${org.name} — We'll be in touch ${responseTime}`,
    html,
  });
}

// Follow-up email
export async function sendFollowUpEmail(
  lead: Lead,
  org: Organization,
  message: string
) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F9FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:32px;text-align:center;">
      <h2 style="margin:0;color:#1A2332;font-size:18px;font-weight:600;">${org.name}</h2>
    </div>
    <div style="background:#FFFFFF;border:1px solid #EEF1F5;border-radius:12px;padding:32px 24px;box-shadow:0 1px 3px rgba(28,42,58,0.06);">
      <p style="margin:0;color:#4A5568;font-size:14px;line-height:1.7;">
        ${message}
      </p>
    </div>
    <div style="margin-top:24px;text-align:center;">
      <p style="margin:0;color:#A0ABB5;font-size:11px;">${org.name}</p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    from: `${org.name} <${FROM_EMAIL}>`,
    to: lead.email,
    subject: `Following up — ${org.name}`,
    html,
  });
}

// Google Review request email — supports custom AI-generated content
export async function sendReviewRequestEmail(
  lead: Lead,
  org: Organization,
  reviewLink: string,
  customSubject?: string,
  customBody?: string
) {
  // Convert plain text body to HTML paragraphs if custom body provided
  const bodyHtml = customBody
    ? customBody.split('\n\n').map(p => `<p style="margin:0 0 16px;color:#4A5568;font-size:14px;line-height:1.7;">${p.replace(/\n/g, '<br>')}</p>`).join('')
    : `<p style="margin:0 0 24px;color:#4A5568;font-size:14px;line-height:1.7;">
        Hi ${lead.first_name}, thanks for choosing ${org.name}! We hope you're happy with the work. If you had a great experience, we'd really appreciate a quick Google review — it helps other people find us.
      </p>`;

  const heading = customBody ? '' : `<h1 style="margin:0 0 12px;color:#1A2332;font-size:20px;font-weight:600;">How did we go?</h1>`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F9FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:32px;text-align:center;">
      <h2 style="margin:0;color:#1A2332;font-size:18px;font-weight:600;">${org.name}</h2>
    </div>
    <div style="background:#FFFFFF;border:1px solid #EEF1F5;border-radius:12px;padding:32px 24px;text-align:center;box-shadow:0 1px 3px rgba(28,42,58,0.06);">
      ${heading}
      ${bodyHtml}
      <a href="${reviewLink}" style="display:inline-block;padding:14px 32px;background:#2F3E4F;color:#FFFFFF;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;">
        Leave a Review
      </a>
      <p style="margin:16px 0 0;color:#7B8794;font-size:12px;">
        It only takes 30 seconds and means a lot to us.
      </p>
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    from: `${org.name} <${FROM_EMAIL}>`,
    to: lead.email,
    subject: customSubject || `How was your experience? — ${org.name}`,
    html,
  });
}
