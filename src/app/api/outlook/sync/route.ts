import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/outlook/sync — syncs new emails from Outlook for an organization
// Also exported as a function so the cron job can call it directly.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';

interface OutlookClassification {
  isEnquiry: boolean;
  confidence: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  serviceType: string | null;
  location: string | null;
  summary: string;
}

async function classifyEmail(from: string, subject: string, body: string): Promise<OutlookClassification> {
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
  const fullName = nameMatch ? nameMatch[1].trim() : from;
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
async function refreshOutlookToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
} | null> {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'openid email Mail.Read User.Read offline_access',
    });

    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      console.error('Outlook token refresh failed:', await res.text());
      return null;
    }

    const data = await res.json();
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      expires_in: data.expires_in || 3600,
    };
  } catch (err) {
    console.error('Outlook token refresh error:', err);
    return null;
  }
}

// Strip HTML tags for plaintext extraction
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// Core sync logic — exported so the cron job can import it
export async function syncOutlookForOrg(organizationId: string): Promise<{
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
  let accessToken = settings.outlook_access_token as string | undefined;
  const refreshToken = settings.outlook_refresh_token as string | undefined;
  const tokenExpiresAt = settings.outlook_token_expires_at as number | undefined;

  if (!refreshToken) {
    return { synced: 0, skipped: 0, error: 'Outlook not connected' };
  }

  // Refresh access token if expired or about to expire (5 min buffer)
  if (!accessToken || !tokenExpiresAt || Date.now() > tokenExpiresAt - 300_000) {
    const refreshed = await refreshOutlookToken(refreshToken);
    if (!refreshed) {
      return { synced: 0, skipped: 0, error: 'Failed to refresh access token' };
    }
    accessToken = refreshed.access_token;

    // Save refreshed tokens (Microsoft may rotate the refresh token)
    await supabase
      .from('organizations')
      .update({
        settings: {
          ...settings,
          outlook_access_token: accessToken,
          outlook_refresh_token: refreshed.refresh_token,
          outlook_token_expires_at: Date.now() + refreshed.expires_in * 1000,
        },
      })
      .eq('id', organizationId);
  }

  // Fetch recent inbox messages from Outlook (last 24 hours)
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const graphUrl = `https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages?$top=20&$orderby=receivedDateTime desc&$filter=receivedDateTime ge ${since}`;

  const listRes = await fetch(graphUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!listRes.ok) {
    const errText = await listRes.text();
    console.error('Outlook list messages failed:', errText);
    return { synced: 0, skipped: 0, error: 'Outlook API list failed' };
  }

  const listData = await listRes.json();
  const messages: Array<Record<string, unknown>> = listData.value || [];

  if (messages.length === 0) {
    // Update last sync timestamp even if no messages
    await supabase
      .from('organizations')
      .update({
        settings: { ...settings, outlook_access_token: accessToken, outlook_last_sync: new Date().toISOString() },
      })
      .eq('id', organizationId);
    return { synced: 0, skipped: 0 };
  }

  // Check which outlook message IDs we've already processed
  const outlookIds = messages.map((m) => m.id as string);
  const { data: existingMessages } = await supabase
    .from('inbox_messages')
    .select('metadata')
    .eq('organization_id', organizationId)
    .in('metadata->>outlook_id', outlookIds);

  const processedOutlookIds = new Set(
    (existingMessages || [])
      .map((m) => (m.metadata as Record<string, unknown>)?.outlook_id as string)
      .filter(Boolean)
  );

  let synced = 0;
  let skipped = 0;

  for (const msg of messages) {
    const outlookMsgId = msg.id as string;

    if (processedOutlookIds.has(outlookMsgId)) {
      skipped++;
      continue;
    }

    try {
      const fromObj = msg.from as { emailAddress: { address: string; name: string } } | undefined;
      const senderEmail = fromObj?.emailAddress?.address || '';
      const senderName = fromObj?.emailAddress?.name || '';
      const subject = (msg.subject as string) || '(No subject)';
      const bodyContent = (msg.body as { content: string; contentType: string })?.content || '';
      const receivedDate = msg.receivedDateTime as string;

      // Extract plaintext from body (Outlook returns HTML by default)
      const bodyText = bodyContent.includes('<') ? stripHtml(bodyContent) : bodyContent;

      if (!senderEmail) {
        skipped++;
        continue;
      }

      // AI classify
      const fromLine = senderName ? `${senderName} <${senderEmail}>` : senderEmail;
      const classification = await classifyEmail(fromLine, subject, bodyText);

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
          sender_name: `${classification.firstName} ${classification.lastName}`.trim() || senderName || senderEmail,
          sender_contact: senderEmail,
          subject,
          body: bodyText.slice(0, 5000) || '(No body)',
          is_read: false,
          metadata: {
            outlook_id: outlookMsgId,
            outlook_date: receivedDate,
            source: 'outlook_sync',
          },
        });

        // Log on client if linked
        if (existingLead.client_id) {
          await supabase.from('client_activities').insert({
            client_id: existingLead.client_id,
            organization_id: organizationId,
            type: 'email',
            title: `Outlook: ${subject}`,
            description: bodyText.slice(0, 300),
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
            message: bodyText.slice(0, 2000) || subject,
            source: 'outlook',
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
            sender_name: `${classification.firstName} ${classification.lastName}`.trim() || senderName || senderEmail,
            sender_contact: senderEmail,
            subject,
            body: bodyText.slice(0, 5000) || '(No body)',
            is_read: false,
            metadata: {
              outlook_id: outlookMsgId,
              outlook_date: receivedDate,
              source: 'outlook_sync',
            },
          });

          await supabase.from('lead_status_changes').insert({
            lead_id: lead.id,
            from_status: null,
            to_status: 'new',
          });

          // Auto-link to existing client
          const { data: existingClient } = await supabase
            .from('clients')
            .select('id')
            .eq('organization_id', organizationId)
            .eq('email', senderEmail)
            .limit(1)
            .maybeSingle();

          if (existingClient) {
            await supabase.from('leads').update({ client_id: existingClient.id }).eq('id', lead.id);
            await supabase.from('client_activities').insert({
              client_id: existingClient.id,
              organization_id: organizationId,
              type: 'email',
              title: `New enquiry via Outlook: ${subject}`,
              description: classification.summary,
            });
          }
        }
      }

      synced++;
    } catch (err) {
      console.error(`[Outlook Sync] Error processing message ${outlookMsgId}:`, err);
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
      settings: { ...latestSettings, outlook_last_sync: new Date().toISOString() },
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

    const result = await syncOutlookForOrg(organization_id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Outlook sync error:', error);
    return NextResponse.json(
      { error: 'Outlook sync failed' },
      { status: 500 }
    );
  }
}
