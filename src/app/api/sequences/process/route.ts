import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendFollowUpEmail } from '@/lib/email';
import { sendFollowUpSMS } from '@/lib/sms';

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const now = new Date().toISOString();

    // Find active enrollments where next_send_at <= now
    const { data: dueEnrollments, error: fetchError } = await supabase
      .from('sequence_enrollments')
      .select('*, sequence:follow_up_sequences(*, organization:organizations(*)), lead:leads(*)')
      .eq('status', 'active')
      .lte('next_send_at', now);

    if (fetchError) {
      console.error('Process fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
    }

    if (!dueEnrollments || dueEnrollments.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No pending sends' });
    }

    let processed = 0;
    let errors = 0;

    for (const enrollment of dueEnrollments) {
      try {
        // Get the current step
        const { data: step } = await supabase
          .from('sequence_steps')
          .select('*')
          .eq('sequence_id', enrollment.sequence_id)
          .eq('step_order', enrollment.current_step)
          .maybeSingle();

        if (!step || !enrollment.lead || !enrollment.sequence) {
          await supabase
            .from('sequence_enrollments')
            .update({ status: 'completed' })
            .eq('id', enrollment.id);
          continue;
        }

        const lead = enrollment.lead;
        const org = enrollment.sequence.organization;

        // Send based on channel — use message_template (DB column name)
        const messageBody = step.message_template || step.body || '';
        if ((step.channel === 'email' || step.channel === 'both') && lead.email) {
          await sendFollowUpEmail(lead, org, messageBody).catch((e: Error) =>
            console.error('[Process] Email error:', e)
          );
        }
        if ((step.channel === 'sms' || step.channel === 'both') && lead.phone) {
          await sendFollowUpSMS(lead.phone, messageBody).catch((e: Error) =>
            console.error('[Process] SMS error:', e)
          );
        }

        // Log the send — only fields that exist in sequence_logs schema
        await supabase.from('sequence_logs').insert({
          enrollment_id: enrollment.id,
          step_id: step.id,
          channel: step.channel,
          status: 'sent',
          sent_at: now,
        });

        // Check if there's a next step
        const { data: nextStep } = await supabase
          .from('sequence_steps')
          .select('*')
          .eq('sequence_id', enrollment.sequence_id)
          .eq('step_order', enrollment.current_step + 1)
          .maybeSingle();

        if (nextStep) {
          const nextSendAt = new Date(
            Date.now() + (nextStep.delay_hours || 24) * 3600000
          ).toISOString();

          await supabase
            .from('sequence_enrollments')
            .update({
              current_step: enrollment.current_step + 1,
              next_send_at: nextSendAt,
              last_sent_at: now,
            })
            .eq('id', enrollment.id);
        } else {
          // No more steps — mark as completed
          await supabase
            .from('sequence_enrollments')
            .update({
              status: 'completed',
              last_sent_at: now,
              completed_at: now,
            })
            .eq('id', enrollment.id);
        }

        processed++;
      } catch (err) {
        console.error(`Error processing enrollment ${enrollment.id}:`, err);
        errors++;
      }
    }

    return NextResponse.json({
      processed,
      errors,
      total: dueEnrollments.length,
    });
  } catch (error) {
    console.error('Sequence process error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
