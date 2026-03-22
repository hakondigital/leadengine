export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'follow_up' | 'quote' | 'thank_you' | 'review' | 'appointment' | 'general';
  custom?: boolean;
}

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'default-initial-followup',
    name: 'Initial Follow-Up',
    subject: 'Thanks for reaching out to {{business_name}}',
    body: `Hi {{first_name}},

Thanks for reaching out to {{business_name}}! We received your enquiry about {{service_type}} and wanted to let you know we're on it.

One of our team members will be in touch shortly to discuss your needs in more detail and provide you with a personalised quote.

In the meantime, feel free to reply to this email if you have any questions.

Looking forward to working with you!

Best regards,
The {{business_name}} Team`,
    category: 'follow_up',
  },
  {
    id: 'default-quote-followup',
    name: 'Quote Follow-Up',
    subject: 'Following up on your {{service_type}} quote',
    body: `Hi {{first_name}},

Just checking in on the quote we sent through for your {{service_type}} project. We want to make sure you have everything you need to make a decision.

If you have any questions about pricing, scope, or timelines, we're happy to jump on a quick call to talk it through.

We'd love the opportunity to take care of this for you.

Cheers,
The {{business_name}} Team`,
    category: 'quote',
  },
  {
    id: 'default-thank-you',
    name: 'Thank You (After Job)',
    subject: 'Thank you for choosing {{business_name}}',
    body: `Hi {{first_name}},

Thank you for choosing {{business_name}} for your recent {{service_type}} work. We hope you're happy with the result!

We take a lot of pride in what we do, and it means a lot to have clients like you trust us with their projects.

If anything comes up or you need any follow-up work, don't hesitate to reach out — we're always here to help.

Thanks again,
The {{business_name}} Team`,
    category: 'thank_you',
  },
  {
    id: 'default-review-request',
    name: 'Review Request',
    subject: "We'd love your feedback, {{first_name}}",
    body: `Hi {{first_name}},

We hope you're enjoying the results of your recent {{service_type}} project with {{business_name}}.

If you have a moment, we'd really appreciate it if you could leave us a quick review. It only takes a minute and helps other people find us.

Your feedback means the world to our small team and helps us keep improving.

Thank you so much!

Warm regards,
The {{business_name}} Team`,
    category: 'review',
  },
  {
    id: 'default-appointment-confirmation',
    name: 'Appointment Confirmation',
    subject: 'Your appointment with {{business_name}} is confirmed',
    body: `Hi {{first_name}},

Just confirming your upcoming appointment with {{business_name}} for {{service_type}}.

Please make sure someone is available on-site so we can get started on time. If you need to reschedule or have any special instructions, just reply to this email and we'll sort it out.

See you soon!

Cheers,
The {{business_name}} Team`,
    category: 'appointment',
  },
  {
    id: 'default-appointment-reminder',
    name: 'Appointment Reminder',
    subject: 'Reminder: Your appointment with {{business_name}}',
    body: `Hi {{first_name}},

Friendly reminder that you have an appointment coming up with {{business_name}} for {{service_type}}.

If anything has changed or you need to reschedule, please let us know as soon as possible so we can adjust our schedule.

We look forward to seeing you!

Best,
The {{business_name}} Team`,
    category: 'appointment',
  },
  {
    id: 'default-general-checkin',
    name: 'General Check-In',
    subject: 'Checking in — {{business_name}}',
    body: `Hi {{first_name}},

Just checking in to see how everything is going since we last spoke. We hope the {{service_type}} work is holding up well.

If there's anything else we can help with — whether it's maintenance, a new project, or just a question — we're only an email away.

Hope to hear from you soon!

All the best,
The {{business_name}} Team`,
    category: 'general',
  },
  {
    id: 'default-winback',
    name: 'Win-Back',
    subject: "It's been a while, {{first_name}}!",
    body: `Hi {{first_name}},

It's been a while since we last spoke, and we wanted to reach out to see if there's anything {{business_name}} can help you with.

Whether you have a new {{service_type}} project in mind or just need some advice, we'd love to reconnect.

As a valued past client, we're happy to offer you a priority booking if you're interested.

Hope to chat soon!

Warm regards,
The {{business_name}} Team`,
    category: 'general',
  },
];

export const CATEGORY_LABELS: Record<EmailTemplate['category'], string> = {
  follow_up: 'Follow-Up',
  quote: 'Quotes',
  thank_you: 'Thank You',
  review: 'Reviews',
  appointment: 'Appointments',
  general: 'General',
};

/**
 * Replace `{{placeholder}}` tokens in a template's subject and body.
 */
export function fillTemplate(
  template: EmailTemplate,
  vars: Record<string, string>,
): { subject: string; body: string } {
  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    subject = subject.replace(regex, value);
    body = body.replace(regex, value);
  }

  return { subject, body };
}
