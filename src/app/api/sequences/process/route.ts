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
      .select('*, sequence:sequences(*, organization:organizations(*)), lead:leads(*)')
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
          .single();

        if (!step || !enrollment.lead || !enrollment.sequence) {
          // Skip if step not found
          await supabase
            .from('sequence_enrollments')
            .update({ status: 'completed' })
            .eq('id', enrollment.id);
          continue;
        }

        const lead = enrollment.lead;
        const org = enrollment.sequence.organization;

        // Send based on channel
        if (step.channel === 'email' && lead.email) {
          await sendFollowUpEmail(lead, org, step.body);
        } else if (step.channel === 'sms' && lead.phone) {
          await sendFollowUpSMS(lead.phone, step.body);
        }

        // Log the send
        await supabase.from('sequence_send_logs').insert({
          enrollment_id: enrollment.id,
          sequence_id: enrollment.sequence_id,
          lead_id: enrollment.lead_id,
          step_order: enrollment.current_step,
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
          .single();

        if (nextStep) {
          // Advance to next step
          const nextSendAt = new Date(
            Date.now() + (nextStep.delay_hours || 0) * 3600000
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
