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
