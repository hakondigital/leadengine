import type { Lead, Organization } from './database.types';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

function twilioAuth(): string {
  return 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
}

interface SMSPayload {
  to: string;
  body: string;
}

async function sendSMS(payload: SMSPayload): Promise<{ id: string } | null> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.warn('Twilio not configured — SMS skipped');
    return null;
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: twilioAuth(),
      },
      body: new URLSearchParams({
        From: TWILIO_PHONE_NUMBER,
        To: payload.to,
        Body: payload.body,
      }).toString(),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('Twilio SMS error:', error);
    return null;
  }

  const data = await response.json();
  return { id: data.sid || '' };
}

function formatUrgency(urgency: string | null): string {
  const map: Record<string, string> = {
    asap: 'URGENT',
    emergency: 'EMERGENCY',
    within_week: 'This week',
    soon: 'Soon',
    this_week: 'This week',
    within_month: 'This month',
    no_rush: 'No rush',
    flexible: 'Flexible',
  };
  return urgency ? map[urgency] || urgency : '';
}

function formatBudget(budget: string | null): string {
  const map: Record<string, string> = {
    under_1k: '<$1k',
    '1k_5k': '$1-5k',
    '5k_15k': '$5-15k',
    '15k_50k': '$15-50k',
    '50k_plus': '$50k+',
    under_10k: '<$10k',
    '10k_50k': '$10-50k',
    '50k_150k': '$50-150k',
    '150k_500k': '$150-500k',
    '500k_plus': '$500k+',
    unsure: 'TBD',
  };
  return budget ? map[budget] || budget : '';
}

export async function sendNewLeadSMS(lead: Lead, org: Organization) {
  if (!org.phone) return null;

  const urgency = formatUrgency(lead.urgency);
  const budget = formatBudget(lead.budget_range);

  let message = `NEW LEAD: ${lead.first_name} ${lead.last_name}`;

  if (lead.service_type) message += ` — ${lead.service_type}`;
  if (lead.location) message += ` in ${lead.location}`;
  if (urgency) message += ` | ${urgency}`;
  if (budget) message += ` | ${budget}`;
  if (lead.phone) message += `\nCall: ${lead.phone}`;

  message += `\n\nView: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

  return sendSMS({
    to: org.phone,
    body: message,
  });
}

export async function sendFollowUpSMS(
  phone: string,
  message: string
): Promise<{ id: string } | null> {
  return sendSMS({ to: phone, body: message });
}

export async function sendReviewRequestSMS(
  customerPhone: string,
  customerName: string,
  orgName: string,
  reviewLink: string,
  customBody?: string
): Promise<{ id: string } | null> {
  const message = customBody || `Hi ${customerName}, thanks for choosing ${orgName}! If you had a great experience, we'd really appreciate a quick review: ${reviewLink}`;

  return sendSMS({ to: customerPhone, body: message });
}
