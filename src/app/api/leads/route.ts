import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';
import { sendBusinessNotification, sendProspectConfirmation, sendSmartAutoReply, sendCredibilityPackage } from '@/lib/email';
import { qualifyLead } from '@/lib/ai-qualification';
import { sendNewLeadSMS } from '@/lib/sms';
import { fireWebhooks } from '@/lib/webhooks';
import { getPlanLimits } from '@/lib/plan-limits';
import { countLeadsThisMonth } from '@/lib/check-plan';
import { runLeadAutomation } from '@/lib/automation-pipeline';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      organization_id,
      first_name,
      last_name,
      email,
      phone,
      company,
      service_type,
      project_type,
      location,
      budget_range,
      urgency,
      timeframe,
      message,
      source,
      source_url,
      custom_fields,
      // Enhanced tracking fields
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      referrer_url,
      landing_page,
      postcode,
    } = body;

    if (!organization_id || !first_name || !last_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Get organization settings
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organization_id)
      .single();

    // ── Plan Limit Check ──────────────────────────────────
    const settings = (org?.settings as Record<string, unknown>) || {};
    const plan = (settings.plan as string) || null;
    const limits = getPlanLimits(plan);
    const leadCount = await countLeadsThisMonth(organization_id);

    if (limits.leads_per_month !== -1 && leadCount >= limits.leads_per_month) {
      return NextResponse.json(
        { error: `Monthly lead limit reached (${limits.leads_per_month}). Please upgrade your plan.` },
        { status: 403 }
      );
    }

    // ── Duplicate Detection ──────────────────────────────────
    let isDuplicate = false;
    if (org?.duplicate_detection_enabled !== false) {
      const { data: existingByEmail } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('email', email)
        .limit(1);

      if (existingByEmail && existingByEmail.length > 0) {
        isDuplicate = true;
      }

      if (!isDuplicate && phone) {
        const { data: existingByPhone } = await supabase
          .from('leads')
          .select('id')
          .eq('organization_id', organization_id)
          .eq('phone', phone)
          .limit(1);
        if (existingByPhone && existingByPhone.length > 0) {
          isDuplicate = true;
        }
      }
    }

    // ── Service Area Check ───────────────────────────────────
    let serviceAreaAssignee: string | null = null;
    if (org?.service_area_enabled && postcode) {
      const { data: areas } = await supabase
        .from('service_areas')
        .select('*, territory_rules(*)')
        .eq('organization_id', organization_id)
        .eq('is_active', true)
        .contains('postcodes', [postcode]);

      if (areas && areas.length > 0) {
        const rule = areas[0].territory_rules?.[0];
        if (rule?.assigned_user_id) {
          serviceAreaAssignee = rule.assigned_user_id;
        }
      } else if (org?.service_area_enabled) {
        // Check if auto-reject is on
        const { data: anyArea } = await supabase
          .from('service_areas')
          .select('auto_reject_outside')
          .eq('organization_id', organization_id)
          .eq('auto_reject_outside', true)
          .limit(1);
        // We still accept the lead but flag it
      }
    }

    // ── Auto-Assignment ──────────────────────────────────────
    let assignedTo: string | null = serviceAreaAssignee;
    if (!assignedTo) {
      const { data: rules } = await supabase
        .from('assignment_rules')
        .select('*')
        .eq('organization_id', organization_id)
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (rules && rules.length > 0) {
        for (const rule of rules) {
          if (rule.rule_type === 'round_robin' && rule.assigned_user_ids?.length > 0) {
            const nextIndex = (rule.last_assigned_index + 1) % rule.assigned_user_ids.length;
            assignedTo = rule.assigned_user_ids[nextIndex];
            // Update round robin index
            await supabase.from('assignment_rules').update({ last_assigned_index: nextIndex }).eq('id', rule.id);
            break;
          }
          if (rule.rule_type === 'service_type' && service_type) {
            const conditions = rule.conditions as Record<string, unknown>;
            if (conditions?.service_types && Array.isArray(conditions.service_types) && conditions.service_types.includes(service_type)) {
              assignedTo = rule.assigned_user_ids?.[0] || null;
              break;
            }
          }
          if (rule.rule_type === 'location' && location) {
            const conditions = rule.conditions as Record<string, unknown>;
            if (conditions?.locations && Array.isArray(conditions.locations) && conditions.locations.some((l: string) => location.toLowerCase().includes(l.toLowerCase()))) {
              assignedTo = rule.assigned_user_ids?.[0] || null;
              break;
            }
          }
        }
      }
    }

    // ── Insert Lead ──────────────────────────────────────────
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        organization_id,
        first_name,
        last_name,
        email,
        phone: phone || null,
        company: company || null,
        service_type: service_type || null,
        project_type: project_type || null,
        location: location || null,
        budget_range: budget_range || null,
        urgency: urgency || null,
        timeframe: timeframe || null,
        message: message || null,
        source: source || 'website',
        source_url: source_url || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_term: utm_term || null,
        utm_content: utm_content || null,
        referrer_url: referrer_url || null,
        landing_page: landing_page || null,
        postcode: postcode || null,
        is_duplicate: isDuplicate,
        assigned_to: assignedTo,
        custom_fields: (() => { try { return custom_fields ? JSON.parse(custom_fields) : {}; } catch { return {}; } })(),
        status: 'new',
        priority: 'medium',
      })
      .select()
      .single();

    if (leadError) {
      console.error('Lead insert error:', leadError);
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
    }

    // ── Flag Duplicate ───────────────────────────────────────
    if (isDuplicate) {
      const { data: original } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', organization_id)
        .eq('email', email)
        .neq('id', lead.id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (original) {
        await supabase.from('duplicate_leads').insert({
          organization_id,
          original_lead_id: original.id,
          duplicate_lead_id: lead.id,
          match_type: 'email',
          confidence: 100,
          status: 'flagged',
        });
      }
    }

    // ── Log to Inbox ─────────────────────────────────────────
    await supabase.from('inbox_messages').insert({
      organization_id,
      lead_id: lead.id,
      channel: 'form',
      direction: 'inbound',
      sender_name: `${first_name} ${last_name}`,
      sender_contact: email,
      subject: service_type ? `New enquiry: ${service_type}` : 'New form submission',
      body: message || `${first_name} ${last_name} submitted a lead capture form.`,
      is_read: false,
      metadata: { source: source || 'website', utm_source, utm_campaign },
    });

    // Create initial status change record
    await supabase.from('lead_status_changes').insert({
      lead_id: lead.id,
      from_status: null,
      to_status: 'new',
    });

    // ── Auto-link to existing client ──────────────────────────
    // Check if email domain or company name matches an existing client.
    // If found, link this lead to the client record.
    (async () => {
      try {
        let clientId: string | null = null;

        // Match by email
        if (email) {
          const { data: emailMatch } = await supabase
            .from('clients')
            .select('id')
            .eq('organization_id', organization_id)
            .eq('email', email)
            .limit(1)
            .maybeSingle();
          if (emailMatch) clientId = emailMatch.id;
        }

        // Match by company name
        if (!clientId && company) {
          const { data: companyMatch } = await supabase
            .from('clients')
            .select('id')
            .eq('organization_id', organization_id)
            .ilike('company_name', company)
            .limit(1)
            .maybeSingle();
          if (companyMatch) clientId = companyMatch.id;
        }

        // Match by email domain (e.g. two leads from @smithbuilders.com.au)
        if (!clientId && email && !email.endsWith('@gmail.com') && !email.endsWith('@outlook.com') && !email.endsWith('@hotmail.com') && !email.endsWith('@yahoo.com') && !email.endsWith('@icloud.com')) {
          const domain = email.split('@')[1];
          if (domain) {
            const { data: domainMatch } = await supabase
              .from('clients')
              .select('id')
              .eq('organization_id', organization_id)
              .ilike('email', `%@${domain}`)
              .limit(1)
              .maybeSingle();
            if (domainMatch) clientId = domainMatch.id;
          }
        }

        if (clientId) {
          await supabase.from('leads').update({ client_id: clientId }).eq('id', lead.id);
          // Log activity on the client
          await supabase.from('client_activities').insert({
            client_id: clientId,
            organization_id,
            type: 'note',
            title: 'New lead linked',
            description: `${first_name} ${last_name} (${email}) was automatically linked to this client.`,
          });
        }
      } catch (err) {
        console.error('Client auto-link error:', err);
      }
    })();

    // Fire async tasks (don't block the response)

    // 1. AI qualification
    qualifyLead(lead).then(async (analysis) => {
      if (analysis) {
        await supabase
          .from('leads')
          .update({
            ai_summary: analysis.summary,
            ai_priority: analysis.priority,
            ai_score: analysis.quality_score,
            ai_recommended_action: analysis.recommended_action,
          })
          .eq('id', lead.id);

        await supabase.from('ai_analyses').insert({
          lead_id: lead.id,
          ...analysis,
        });

        // 2. Smart auto-reply based on AI score (if org has auto_reply_enabled)
        if (org?.auto_reply_enabled !== false) {
          sendSmartAutoReply(lead, org!, analysis.quality_score, analysis.recommended_action).catch(console.error);
        }

        // 3. Run automation pipeline (auto-quote, auto-appointment, auto-sequence)
        if (org) {
          // Re-fetch lead with AI data so automations have full context
          const { data: updatedLead } = await supabase
            .from('leads')
            .select('*')
            .eq('id', lead.id)
            .single();

          runLeadAutomation(updatedLead || lead, org, supabase).catch(console.error);
        }
      }
    }).catch(console.error);

    if (org) {
      // 4. Email notification to business
      sendBusinessNotification(lead, org).catch(console.error);

      // 5. Confirmation email to prospect
      sendProspectConfirmation(lead, org).catch(console.error);

      // 5b. Credibility package (delayed 2 minutes so it doesn't stack with confirmation)
      // Plan gate: Starter+ (credibility_package)
      if (settings.credibility_package_enabled !== false && limits.credibility_package) {
        setTimeout(() => {
          sendCredibilityPackage(lead, org!).catch(console.error);
        }, 2 * 60 * 1000);
      }

      // 6. SMS notification to business (if enabled)
      if (org.sms_notifications_enabled && org.phone) {
        sendNewLeadSMS(lead, org).then(async (result) => {
          if (result) {
            await supabase.from('sms_logs').insert({
              lead_id: lead.id,
              organization_id: org.id,
              recipient_phone: org.phone,
              message: `New lead: ${lead.first_name} ${lead.last_name}`,
              sms_type: 'new_lead_alert',
              status: 'sent',
              twilio_sid: result.id,
            });
          }
        }).catch(console.error);
      }
    }

    // 7. Fire webhooks
    fireWebhooks(organization_id, 'lead.created', {
      lead_id: lead.id,
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone,
      service_type: lead.service_type,
      source: lead.source,
      status: lead.status,
    }).catch(console.error);

    return NextResponse.json({ success: true, id: lead.id }, { status: 201 });
  } catch (error) {
    console.error('Lead submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sort_by') || 'created_at';
    const sortOrder = searchParams.get('sort_order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { unauthorized } = await requireCallerOwnsOrg(orgId);
    if (unauthorized) return unauthorized;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority);
    }
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%,location.ilike.%${search}%`
      );
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data: leads, count, error } = await query;

    if (error) {
      console.error('Leads fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
    }

    return NextResponse.json({
      leads,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Leads fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
