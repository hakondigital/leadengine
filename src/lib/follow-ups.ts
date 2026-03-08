import type { Lead, Organization } from './database.types';

interface FollowUpSchedule {
  reminder_type: string;
  delay_hours: number;
  message_template: string;
}

// Auto-schedule follow-ups based on lead status changes
export function getFollowUpSchedule(
  fromStatus: string | null,
  toStatus: string,
  lead: Lead,
  org: Organization
): FollowUpSchedule[] {
  const schedules: FollowUpSchedule[] = [];

  if (toStatus === 'quote_sent') {
    // Follow up 2 days after sending quote
    schedules.push({
      reminder_type: 'quote_follow_up',
      delay_hours: 48,
      message_template: `Hi ${lead.first_name}, just following up on the quote we sent through. Happy to answer any questions or make adjustments. — ${org.name}`,
    });

    // Second follow up at 7 days
    schedules.push({
      reminder_type: 'quote_follow_up',
      delay_hours: 168,
      message_template: `Hi ${lead.first_name}, wanted to check if you're still interested in going ahead? We can hold the quoted price for another week. Let us know! — ${org.name}`,
    });
  }

  if (toStatus === 'contacted' && !lead.phone) {
    // If contacted but no phone, follow up via email reminder
    schedules.push({
      reminder_type: 'no_response',
      delay_hours: 72,
      message_template: `Hi ${lead.first_name}, we tried reaching out about your enquiry. Would love to help — please reply or call us when you get a chance. — ${org.name}`,
    });
  }

  if (toStatus === 'won') {
    // Schedule Google Review request 7 days after win
    if (org.google_review_link) {
      schedules.push({
        reminder_type: 'review_request',
        delay_hours: 168,
        message_template: `Hi ${lead.first_name}, thanks for choosing ${org.name}! If you had a great experience, we'd really appreciate a quick Google review: ${org.google_review_link}`,
      });
    }
  }

  return schedules;
}

// Build dashboard follow-up reminders for display
export interface FollowUpReminder {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  reminder_type: string;
  scheduled_for: string;
  message_template: string;
  status: string;
  days_overdue: number;
}

export function formatReminderType(type: string): string {
  const map: Record<string, string> = {
    quote_follow_up: 'Follow up on quote',
    no_response: 'No response — try again',
    check_in: 'Check in',
    review_request: 'Request Google review',
  };
  return map[type] || type;
}

export function getReminderUrgency(scheduledFor: string): 'overdue' | 'today' | 'upcoming' {
  const now = new Date();
  const scheduled = new Date(scheduledFor);
  const diffHours = (scheduled.getTime() - now.getTime()) / 3600000;

  if (diffHours < 0) return 'overdue';
  if (diffHours < 24) return 'today';
  return 'upcoming';
}
