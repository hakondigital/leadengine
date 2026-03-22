import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getFollowUpSchedule } from '@/lib/follow-ups';
import { sendReviewRequestSMS } from '@/lib/sms';
import { autoSetRevenueFromQuotes } from '@/lib/automation-pipeline';
import { triggerSequenceEvent } from '@/lib/sequence-triggers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Auto-create client for any lead without one (backfill for old leads)
    if (lead.status !== 'new' && !lead.client_id) {
      (async () => {
        try {
          let existingClientId: string | null = null;
          if (lead.email) {
            const { data: existing } = await supabase
              .from('clients')
              .select('id')
              .eq('organization_id', lead.organization_id)
              .eq('email', lead.email)
              .limit(1)
              .maybeSingle();
            if (existing) existingClientId = existing.id;
          }
          if (existingClientId) {
            await supabase.from('leads').update({ client_id: existingClientId }).eq('id', id);
          } else {
            const { data: newClient } = await supabase
              .from('clients')
              .insert({
                organization_id: lead.organization_id,
                first_name: lead.first_name || '',
                last_name: lead.last_name || '',
                email: lead.email || null,
                phone: lead.phone || null,
                company_name: lead.company || null,
                address: lead.location || null,
                postcode: lead.postcode || null,
                source: lead.source || 'lead',
                status: 'active',
                type: lead.company ? 'company' : 'individual',
                primary_lead_id: id,
              })
              .select('id')
              .single();
            if (newClient) {
              await supabase.from('leads').update({ client_id: newClient.id }).eq('id', id);
            }
          }
        } catch (err) {
          console.error('Backfill client error:', err);
        }
      })();
    }

    // Auto-mark as "reviewed" when opened for the first time
    if (lead.status === 'new') {
      await supabase.from('leads').update({ status: 'reviewed' }).eq('id', id);
      await supabase.from('lead_status_changes').insert({
        lead_id: id,
        from_status: 'new',
        to_status: 'reviewed',
      });
      await supabase.from('lead_notes').insert({
        lead_id: id,
        content: 'Lead opened and marked as reviewed.',
        is_system: true,
      });
      lead.status = 'reviewed';

      // Auto-create client record (fire and forget)
      if (!lead.client_id) {
        (async () => {
          try {
            let existingClientId: string | null = null;
            if (lead.email) {
              const { data: existing } = await supabase
                .from('clients')
                .select('id')
                .eq('organization_id', lead.organization_id)
                .eq('email', lead.email)
                .limit(1)
                .maybeSingle();
              if (existing) existingClientId = existing.id;
            }
            if (existingClientId) {
              await supabase.from('leads').update({ client_id: existingClientId }).eq('id', id);
            } else {
              const { data: newClient } = await supabase
                .from('clients')
                .insert({
                  organization_id: lead.organization_id,
                  first_name: lead.first_name || '',
                  last_name: lead.last_name || '',
                  email: lead.email || null,
                  phone: lead.phone || null,
                  company_name: lead.company || null,
                  address: lead.location || null,
                  postcode: lead.postcode || null,
                  source: lead.source || 'lead',
                  status: 'active',
                  type: lead.company ? 'company' : 'individual',
                  primary_lead_id: id,
                })
                .select('id')
                .single();
              if (newClient) {
                await supabase.from('leads').update({ client_id: newClient.id }).eq('id', id);
              }
            }
          } catch (err) {
            console.error('Auto-create client on view error:', err);
          }
        })();
      }
    }

    // Fetch related data
    const [notesResult, statusChangesResult, aiResult, tagsResult, remindersResult] = await Promise.all([
      supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('lead_status_changes')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('ai_analyses')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('lead_tags')
        .select('*, tag:tags(*)')
        .eq('lead_id', id),
      supabase
        .from('follow_up_reminders')
        .select('*')
        .eq('lead_id', id)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true }),
    ]);

    return NextResponse.json({
      ...lead,
      notes: notesResult.data || [],
      status_changes: statusChangesResult.data || [],
      ai_analysis: aiResult.data || null,
      tags: tagsResult.data || [],
      reminders: remindersResult.data || [],
    });
  } catch (error) {
    console.error('Lead fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = await createServiceRoleClient();

    // Get current lead state before update
    const { data: current } = await supabase
      .from('leads')
      .select('*, organization:organizations(*)')
      .eq('id', id)
      .single();

    if (!current) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const oldStatus = current.status;
    const newStatus = body.status;

    // If status changed, record it and schedule follow-ups
    if (newStatus && oldStatus !== newStatus) {
      await supabase.from('lead_status_changes').insert({
        lead_id: id,
        from_status: oldStatus,
        to_status: newStatus,
      });

      // ── Auto-create client when lead is first acknowledged ──
      // When status changes from "new" to anything, the business has reviewed
      // the lead — create a client record (if not already linked).
      if (oldStatus === 'new' && newStatus !== 'new' && !current.client_id) {
        (async () => {
          try {
            // Check for existing client by email
            let existingClientId: string | null = null;
            if (current.email) {
              const { data: existing } = await supabase
                .from('clients')
                .select('id')
                .eq('organization_id', current.organization_id)
                .eq('email', current.email)
                .limit(1)
                .maybeSingle();
              if (existing) existingClientId = existing.id;
            }

            if (existingClientId) {
              await supabase.from('leads').update({ client_id: existingClientId }).eq('id', id);
              await supabase.from('client_activities').insert({
                client_id: existingClientId,
                organization_id: current.organization_id,
                type: 'note',
                title: 'Lead reviewed and linked',
                description: `${current.first_name} ${current.last_name} — lead reviewed and linked to this client.`,
              });
            } else {
              const { data: newClient } = await supabase
                .from('clients')
                .insert({
                  organization_id: current.organization_id,
                  first_name: current.first_name || '',
                  last_name: current.last_name || '',
                  email: current.email || null,
                  phone: current.phone || null,
                  company_name: current.company || null,
                  address: current.location || null,
                  postcode: current.postcode || null,
                  source: current.source || 'lead',
                  status: 'active',
                  type: current.company ? 'company' : 'individual',
                  primary_lead_id: id,
                })
                .select('id')
                .single();

              if (newClient) {
                await supabase.from('leads').update({ client_id: newClient.id }).eq('id', id);
                await supabase.from('client_activities').insert({
                  client_id: newClient.id,
                  organization_id: current.organization_id,
                  type: 'status_change',
                  title: 'Client created from reviewed lead',
                  description: `${current.first_name} ${current.last_name} was reviewed and added to the client database.`,
                });
              }
            }
          } catch (err) {
            console.error('Auto-create client on review error:', err);
          }
        })();
      }

      // Auto-set won_date when marking as Won
      if (newStatus === 'won' && !body.won_date) {
        body.won_date = new Date().toISOString();
      }

      // Auto-set won_value from associated quotes if not manually set
      if (newStatus === 'won' && !body.won_value && !current.won_value) {
        const autoValue = await autoSetRevenueFromQuotes(id, current.organization_id, supabase);
        if (autoValue) {
          body.won_value = autoValue;
        }
      }

      // Schedule follow-up reminders
      if (current.organization) {
        const schedules = getFollowUpSchedule(oldStatus, newStatus, current, current.organization);
        for (const schedule of schedules) {
          const scheduledFor = new Date(Date.now() + schedule.delay_hours * 3600000).toISOString();
          await supabase.from('follow_up_reminders').insert({
            lead_id: id,
            organization_id: current.organization_id,
            reminder_type: schedule.reminder_type,
            scheduled_for: scheduledFor,
            message_template: schedule.message_template,
            status: 'pending',
          });
        }

        // If marking as Won and org has Google review link, schedule review SMS
        if (newStatus === 'won' && current.organization.google_review_link && current.phone) {
          // Schedule for 7 days later (handled by follow_up_reminders)
          // Also could send immediately if preferred
        }
      }

      // Add system note for status change
      await supabase.from('lead_notes').insert({
        lead_id: id,
        content: `Status changed from ${oldStatus} to ${newStatus}`,
        is_system: true,
      });

      // Trigger smart sequences (fire and forget)
      triggerSequenceEvent('status_change', id, current.organization_id, supabase).catch(console.error);

      // Trigger job_completed sequences when lead is won
      if (newStatus === 'won') {
        triggerSequenceEvent('job_completed', id, current.organization_id, supabase).catch(console.error);

        // ── Auto-create client record when lead is won ──────────
        // Check if this lead is already linked to a client, if not create one
        (async () => {
          try {
            if (current.client_id) return; // Already linked

            // Check if a client with this email already exists
            let existingClientId: string | null = null;
            if (current.email) {
              const { data: existing } = await supabase
                .from('clients')
                .select('id')
                .eq('organization_id', current.organization_id)
                .eq('email', current.email)
                .limit(1)
                .maybeSingle();
              if (existing) existingClientId = existing.id;
            }

            if (existingClientId) {
              // Link lead to existing client
              await supabase.from('leads').update({ client_id: existingClientId }).eq('id', id);
              // Update lifetime value
              const wonVal = body.won_value || current.won_value || 0;
              if (wonVal > 0) {
                const { data: cli } = await supabase.from('clients').select('lifetime_value, total_invoiced').eq('id', existingClientId).single();
                if (cli) {
                  await supabase.from('clients').update({
                    lifetime_value: (Number(cli.lifetime_value) || 0) + Number(wonVal),
                    total_invoiced: (Number(cli.total_invoiced) || 0) + Number(wonVal),
                    outstanding_balance: (Number(cli.total_invoiced) || 0) + Number(wonVal) - (Number(cli.lifetime_value) || 0),
                  }).eq('id', existingClientId);
                }
              }
              await supabase.from('client_activities').insert({
                client_id: existingClientId,
                organization_id: current.organization_id,
                type: 'status_change',
                title: 'Lead converted',
                description: `${current.first_name} ${current.last_name} — lead marked as won and linked.`,
              });
            } else {
              // Create new client from lead data
              const wonVal = body.won_value || current.won_value || 0;
              const { data: newClient } = await supabase
                .from('clients')
                .insert({
                  organization_id: current.organization_id,
                  first_name: current.first_name || '',
                  last_name: current.last_name || '',
                  email: current.email || null,
                  phone: current.phone || null,
                  company_name: current.company || null,
                  address: current.location || null,
                  postcode: current.postcode || null,
                  source: current.source || 'lead',
                  status: 'active',
                  type: current.company ? 'company' : 'individual',
                  primary_lead_id: id,
                  lifetime_value: wonVal,
                  total_invoiced: wonVal,
                  outstanding_balance: wonVal,
                })
                .select('id')
                .single();

              if (newClient) {
                await supabase.from('leads').update({ client_id: newClient.id }).eq('id', id);
                await supabase.from('client_activities').insert({
                  client_id: newClient.id,
                  organization_id: current.organization_id,
                  type: 'status_change',
                  title: 'Client created from won lead',
                  description: `${current.first_name} ${current.last_name} converted from lead to client.`,
                });
              }
            }
          } catch (err) {
            console.error('Auto-create client error:', err);
          }
        })();
      }
    }

    // If won_value is being set, add a note
    if (body.won_value && body.won_value !== current.won_value) {
      await supabase.from('lead_notes').insert({
        lead_id: id,
        content: `Job value recorded: $${Number(body.won_value).toLocaleString()}`,
        is_system: true,
      });
    }

    // Remove the joined organization before updating
    const updateBody = { ...body };
    delete updateBody.organization;

    const { data: lead, error } = await supabase
      .from('leads')
      .update(updateBody)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 });
    }

    return NextResponse.json(lead);
  } catch (error) {
    console.error('Lead update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
