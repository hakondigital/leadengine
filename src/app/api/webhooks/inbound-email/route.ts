import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// POST /api/webhooks/inbound-email
// Receives inbound emails via Resend webhook (or email forwarding service).
// Uses AI to classify: real business enquiry vs spam/marketing.
// Real enquiries → auto-create lead. Spam → discard.

const AI_PROVIDER = process.env.AI_PROVIDER || 'openai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface InboundEmail {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

async function classifyEmail(email: InboundEmail): Promise<{
  isEnquiry: boolean;
  confidence: number;
  firstName: string;
  lastName: string;
  phone: string | null;
  serviceType: string | null;
  location: string | null;
  summary: string;
}> {
  const prompt = `You are an AI email classifier for a service business CRM. Analyze this inbound email and determine if it's a genuine business enquiry/lead, or spam/marketing/newsletter/automated email.

FROM: ${email.from}
SUBJECT: ${email.subject}
BODY:
${(email.text || '').slice(0, 2000)}

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
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
  const body = (email.text || '').toLowerCase();
  const subject = email.subject.toLowerCase();
  const spamKeywords = ['unsubscribe', 'newsletter', 'marketing', 'promotion', 'click here', 'limited time', 'act now', 'no obligation'];
  const enquiryKeywords = ['quote', 'estimate', 'price', 'available', 'service', 'help', 'need', 'looking for', 'interested', 'booking', 'appointment'];

  const isSpam = spamKeywords.some((k) => body.includes(k) || subject.includes(k));
  const isEnquiry = enquiryKeywords.some((k) => body.includes(k) || subject.includes(k));

  // Extract name from email "From: Name <email>" format
  const nameMatch = email.from.match(/^([^<]+)</);
  const fullName = nameMatch ? nameMatch[1].trim() : '';
  const parts = fullName.split(' ');

  return {
    isEnquiry: !isSpam && (isEnquiry || !isSpam),
    confidence: isSpam ? 10 : isEnquiry ? 70 : 40,
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || '',
    phone: null,
    serviceType: null,
    location: null,
    summary: subject,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Resend inbound email webhook format
    const inboundEmail: InboundEmail = {
      from: body.from || body.sender || '',
      to: body.to || body.recipient || '',
      subject: body.subject || '(No subject)',
      text: body.text || body.plain || body.body || '',
      html: body.html || '',
    };

    if (!inboundEmail.from || !inboundEmail.to) {
      return NextResponse.json({ received: true });
    }

    const supabase = await createServiceRoleClient();

    // Find org by matching the "to" email with notification_email or phone
    // Try exact match first, then domain match
    const toEmail = inboundEmail.to.replace(/.*</, '').replace(/>.*/, '').trim();

    let orgId: string | null = null;

    // Match by notification email
    const { data: orgByEmail } = await supabase
      .from('organizations')
      .select('id')
      .eq('notification_email', toEmail)
      .limit(1)
      .maybeSingle();

    if (orgByEmail) {
      orgId = orgByEmail.id;
    } else {
      // Match by domain — find orgs whose notification_email shares the same domain
      const domain = toEmail.split('@')[1];
      if (domain) {
        const { data: orgByDomain } = await supabase
          .from('organizations')
          .select('id')
          .ilike('notification_email', `%@${domain}`)
          .limit(1)
          .maybeSingle();
        if (orgByDomain) orgId = orgByDomain.id;
      }
    }

    if (!orgId) {
      console.warn('Inbound email: no matching org for', toEmail);
      return NextResponse.json({ received: true });
    }

    // AI classify the email
    const classification = await classifyEmail(inboundEmail);

    if (!classification.isEnquiry || classification.confidence < 30) {
      // Spam / not a real enquiry — log and discard
      console.log(`Inbound email from ${inboundEmail.from} classified as spam (confidence: ${classification.confidence})`);
      return NextResponse.json({ received: true, classified: 'spam' });
    }

    // Extract sender email
    const senderEmail = inboundEmail.from.replace(/.*</, '').replace(/>.*/, '').trim();

    // Check for existing lead with this email
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, client_id')
      .eq('organization_id', orgId)
      .eq('email', senderEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingLead) {
      // Existing lead — log as inbox message on their record
      await supabase.from('inbox_messages').insert({
        organization_id: orgId,
        lead_id: existingLead.id,
        channel: 'email',
        direction: 'inbound',
        sender_name: `${classification.firstName} ${classification.lastName}`.trim() || senderEmail,
        sender_contact: senderEmail,
        subject: inboundEmail.subject,
        body: inboundEmail.text || '(No body)',
        is_read: false,
      });

      // Log on client if linked
      if (existingLead.client_id) {
        await supabase.from('client_activities').insert({
          client_id: existingLead.client_id,
          organization_id: orgId,
          type: 'email',
          title: `Inbound email: ${inboundEmail.subject}`,
          description: (inboundEmail.text || '').slice(0, 300),
        });
      }
    } else {
      // New lead — create from email
      const { data: lead } = await supabase
        .from('leads')
        .insert({
          organization_id: orgId,
          first_name: classification.firstName || 'Unknown',
          last_name: classification.lastName || '',
          email: senderEmail,
          phone: classification.phone,
          service_type: classification.serviceType,
          location: classification.location,
          message: inboundEmail.text?.slice(0, 2000) || inboundEmail.subject,
          source: 'email',
          status: 'new',
          priority: 'medium',
          ai_summary: classification.summary,
        })
        .select()
        .single();

      if (lead) {
        // Log to inbox
        await supabase.from('inbox_messages').insert({
          organization_id: orgId,
          lead_id: lead.id,
          channel: 'email',
          direction: 'inbound',
          sender_name: `${classification.firstName} ${classification.lastName}`.trim() || senderEmail,
          sender_contact: senderEmail,
          subject: inboundEmail.subject,
          body: inboundEmail.text || '(No body)',
          is_read: false,
        });

        // Status change record
        await supabase.from('lead_status_changes').insert({
          lead_id: lead.id,
          from_status: null,
          to_status: 'new',
        });
      }
    }

    return NextResponse.json({ received: true, classified: 'enquiry' });
  } catch (error) {
    console.error('Inbound email webhook error:', error);
    return NextResponse.json({ received: true });
  }
}
