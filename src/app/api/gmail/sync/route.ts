import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/gmail/sync — syncs new emails from Gmail for an organization
// Also exported as a function so the cron job can call it directly.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

interface GmailClassification {
  isEnquiry: boolean;
  confidence: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  serviceType: string | null;
  location: string | null;
  summary: string;
}

async function classifyEmail(from: string, subject: string, body: string): Promise<GmailClassification> {
  const prompt = `You are an AI email classifier for a service business CRM. Analyze this inbound email and determine if it's a genuine business enquiry/lead, or spam/marketing/newsletter/automated email.

FROM: ${from}
SUBJECT: ${subject}
BODY:
${body.slice(0, 2000)}

Respond in JSON only:
{
  "is_enquiry": true/false,
  "confidence": 0-100,
  "first_name": "extracted first name or empty string",
  "last_name": "extracted last name or empty string",
  "phone": "extracted phone number or null",
  "service_type": "what service they're asking about or null",
  "location": "their location if mentioned or null",
  "summary": "one-line summary of what they want"
}

Rules:
- Newsletter/marketing emails = NOT enquiry
- Automated receipts, notifications = NOT enquiry
- Someone asking about services, pricing, availability = enquiry
- Job applications = NOT enquiry (but flag in summary)
- Existing client follow-ups = enquiry
- Spam/phishing = NOT enquiry with 0 confidence`;

  try {
    if (AI_PROVIDER === 'anthropic' && ANTHROPIC_API_KEY) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.content?.[0]?.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            isEnquiry: parsed.is_enquiry === true,
            confidence: parsed.confidence || 0,
            firstName: parsed.first_name || '',
            lastName: parsed.last_name || '',
            phone: parsed.phone || null,
            serviceType: parsed.service_type || null,
            location: parsed.location || null,
            summary: parsed.summary || '',
          };
        }
      }
    } else if (OPENAI_API_KEY) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 500,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        const parsed = JSON.parse(text);
        return {
          isEnquiry: parsed.is_enquiry === true,
          confidence: parsed.confidence || 0,
          firstName: parsed.first_name || '',
          lastName: parsed.last_name || '',
          phone: parsed.phone || null,
          serviceType: parsed.service_type || null,
          location: parsed.location || null,
          summary: parsed.summary || '',
        };
      }
    }
  } catch (err) {
    console.error('AI classification error:', err);
  }

  // Fallback: basic keyword matching
  const lowerBody = body.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  const spamKeywords = ['unsubscribe', 'newsletter', 'marketing', 'promotion', 'click here', 'limited time', 'act now', 'no obligation'];
  const enquiryKeywords = ['quote', 'estimate', 'price', 'available', 'service', 'help', 'need', 'looking for', 'interested', 'booking', 'appointment'];

  const isSpam = spamKeywords.some((k) => lowerBody.includes(k) || lowerSubject.includes(k));
  const isEnquiryMatch = enquiryKeywords.some((k) => lowerBody.includes(k) || lowerSubject.includes(k));

  const nameMatch = from.match(/^([^<]+)</);
  const fullName = nameMatch ? nameMatch[1].trim() : '';
  const parts = fullName.split(' ');

  return {
    isEnquiry: !isSpam && (isEnquiryMatch || !isSpam),
    confidence: isSpam ? 10 : isEnquiryMatch ? 70 : 40,
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
    phone: null,
    serviceType: null,
    location: null,
    summary: subject,
  };
}

// Refresh an expired access token using the refresh token
async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
} | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      console.error('Token refresh failed:', await res.text());
      return null;
    }

    const data = await res.json();
    return { access_token: data.access_token, expires_in: data.expires_in || 3600 };
  } catch (err) {
    console.error('Token refresh error:', err);
    return null;
  }
}

// Parse Gmail message body from parts
function extractBody(payload: Record<string, unknown>): string {
  // Simple message with body.data
  const bodyData = (payload.body as Record<string, unknown>)?.data;
  if (bodyData && typeof bodyData === 'string') {
    return Buffer.from(bodyData, 'base64url').toString('utf-8');
  }

  // Multipart message — search parts for text/plain
  const parts = payload.parts as Array<Record<string, unknown>> | undefined;
  if (parts) {
    for (const part of parts) {
      const mimeType = part.mimeType as string;
      if (mimeType === 'text/plain') {
        const data = (part.body as Record<string, unknown>)?.data;
        if (data && typeof data === 'string') {
          return Buffer.from(data, 'base64url').toString('utf-8');
        }
      }
      // Recurse into nested parts (e.g. multipart/alternative inside multipart/mixed)
      if (part.parts) {
        const nested = extractBody(part as Record<string, unknown>);
        if (nested) return nested;
      }
    }
    // Fallback to text/html if no text/plain
    for (const part of parts) {
      const mimeType = part.mimeType as string;
      if (mimeType === 'text/html') {
        const data = (part.body as Record<string, unknown>)?.data;
        if (data && typeof data === 'string') {
          const html = Buffer.from(data, 'base64url').toString('utf-8');
          // Strip HTML tags for a rough plaintext version
          return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }
    }
  }

  return '';
}

// Get header value from Gmail message headers
function getHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  const header = headers.find((h) => h.name.toLowerCase() === name.toLowerCase());
  return header?.value || '';
}

// Core sync logic — exported so the cron job can import it
export async function syncGmailForOrg(organizationId: string): Promise<{
  synced: number;
  skipped: number;
  error?: string;
}> {
  const supabase = await createServiceRoleClient();

  // Get organization settings
  const { data: org } = await supabase
    .from('organizations')
    .select('id, settings')
    .eq('id', organizationId)
    .single();

  if (!org) {
    return { synced: 0, skipped: 0, error: 'Organization not found' };
  }

  const settings = (org.settings as Record<string, unknown>) || {};
  let accessToken = settings.gmail_access_token as string | undefined;
  const refreshToken = settings.gmail_refresh_token as string | undefined;
  const tokenExpiresAt = settings.gmail_token_expires_at as number | undefined;

  if (!refreshToken) {
    return { synced: 0, skipped: 0, error: 'Gmail not connected' };
  }

  // Refresh access token if expired or about to expire (5 min buffer)
  if (!accessToken || !tokenExpiresAt || Date.now() > tokenExpiresAt - 300_000) {
    const refreshed = await refreshAccessToken(refreshToken);
    if (!refreshed) {
      return { synced: 0, skipped: 0, error: 'Failed to refresh access token' };
    }
    accessToken = refreshed.access_token;

    // Save refreshed token
    await supabase
      .from('organizations')
      .update({
        settings: {
          ...settings,
          gmail_access_token: accessToken,
          gmail_token_expires_at: Date.now() + refreshed.expires_in * 1000,
        },
      })
      .eq('id', organizationId);
  }

  // Fetch recent inbox messages from Gmail
  const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent('is:inbox newer_than:1d')}&maxResults=20`;
  const listRes = await fetch(listUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const errText = await listRes.text();
    console.error('Gmail list messages failed:', errText);
    return { synced: 0, skipped: 0, error: 'Gmail API list failed' };
  }

  const listData = await listRes.json();
  const messageIds: Array<{ id: string }> = listData.messages || [];

  if (messageIds.length === 0) {
    // Update last sync timestamp even if no messages
    await supabase
      .from('organizations')
      .update({
        settings: { ...settings, gmail_access_token: accessToken, gmail_last_sync: new Date().toISOString() },
      })
      .eq('id', organizationId);
    return { synced: 0, skipped: 0 };
  }

  // Check which gmail message IDs we've already processed
  const gmailIds = messageIds.map((m) => m.id);
  const { data: existingMessages } = await supabase
    .from('inbox_messages')
    .select('metadata')
    .eq('organization_id', organizationId)
    .in('metadata->>gmail_id', gmailIds);

  const processedGmailIds = new Set(
    (existingMessages || [])
      .map((m) => (m.metadata as Record<string, unknown>)?.gmail_id as string)
      .filter(Boolean)
  );

  let synced = 0;
  let skipped = 0;

  for (const { id: gmailMsgId } of messageIds) {
    if (processedGmailIds.has(gmailMsgId)) {
      skipped++;
      continue;
    }

    try {
      // Fetch full message
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${gmailMsgId}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!msgRes.ok) {
        skipped++;
        continue;
      }

      const msg = await msgRes.json();
      const headers = msg.payload?.headers || [];
      const from = getHeader(headers, 'From');
      const subject = getHeader(headers, 'Subject') || '(No subject)';
      const date = getHeader(headers, 'Date');
      const body = extractBody(msg.payload || {});

      // Extract sender email
      const senderEmail = from.replace(/.*</, '').replace(/>.*/, '').trim();
      if (!senderEmail) {
        skipped++;
        continue;
      }

      // AI classify
      const classification = await classifyEmail(from, subject, body);

      if (!classification.isEnquiry || classification.confidence < 30) {
        skipped++;
        continue;
      }

      // Check for existing lead with this email
      const { data: existingLead } = await supabase
        .from('leads')
        .select('id, client_id')
        .eq('organization_id', organizationId)
        .eq('email', senderEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingLead) {
        // Existing lead — add inbox message
        await supabase.from('inbox_messages').insert({
          organization_id: organizationId,
          lead_id: existingLead.id,
          channel: 'email',
          direction: 'inbound',
          sender_name: `${classification.firstName} ${classification.lastName}`.trim() || senderEmail,
          sender_contact: senderEmail,
          subject,
          body: body.slice(0, 5000) || '(No body)',
          is_read: false,
          metadata: {
            gmail_id: gmailMsgId,
            gmail_date: date,
            source: 'gmail_sync',
          },
        });

        // Log on client if linked
        if (existingLead.client_id) {
          await supabase.from('client_activities').insert({
            client_id: existingLead.client_id,
            organization_id: organizationId,
            type: 'email',
            title: `Gmail: ${subject}`,
            description: body.slice(0, 300),
          });
        }
      } else {
        // New lead — create from email
        const { data: lead } = await supabase
          .from('leads')
          .insert({
            organization_id: organizationId,
            first_name: classification.firstName || 'Unknown',
            last_name: classification.lastName || '',
            email: senderEmail,
            phone: classification.phone,
            service_type: classification.serviceType,
            location: classification.location,
            message: body.slice(0, 2000) || subject,
            source: 'gmail',
            status: 'new',
            priority: 'medium',
            ai_summary: classification.summary,
          })
          .select()
          .single();

        if (lead) {
          await supabase.from('inbox_messages').insert({
            organization_id: organizationId,
            lead_id: lead.id,
            channel: 'email',
            direction: 'inbound',
            sender_name: `${classification.firstName} ${classification.lastName}`.trim() || senderEmail,
            sender_contact: senderEmail,
            subject,
            body: body.slice(0, 5000) || '(No body)',
            is_read: false,
            metadata: {
              gmail_id: gmailMsgId,
              gmail_date: date,
              source: 'gmail_sync',
            },
          });

          await supabase.from('lead_status_changes').insert({
            lead_id: lead.id,
            from_status: null,
            to_status: 'new',
          });
        }
      }

      synced++;
    } catch (err) {
      console.error(`[Gmail Sync] Error processing message ${gmailMsgId}:`, err);
      skipped++;
    }
  }

  // Update last sync timestamp
  const { data: latestOrg } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', organizationId)
    .single();

  const latestSettings = (latestOrg?.settings as Record<string, unknown>) || {};
  await supabase
    .from('organizations')
    .update({
      settings: { ...latestSettings, gmail_last_sync: new Date().toISOString() },
    })
    .eq('id', organizationId);

  return { synced, skipped };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id } = body;

    if (!organization_id) {
      return NextResponse.json(
        { error: 'organization_id is required' },
        { status: 400 }
      );
    }

    const result = await syncGmailForOrg(organization_id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Gmail sync error:', error);
    return NextResponse.json(
      { error: 'Gmail sync failed' },
      { status: 500 }
    );
  }
}
