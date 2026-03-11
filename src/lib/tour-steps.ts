export interface TourStep {
  id: string;
  page: string;
  /** data-tour attribute value on the target element. null = no spotlight, centred modal. */
  target: string | null;
  title: string;
  description: string;
  /** Clear "do this now" instruction — rendered as an action callout in the tooltip. */
  action?: string;
  /** Extra info — shown only when no action is defined. */
  tip?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'settings',
    page: '/dashboard/settings',
    target: 'business-name',
    title: 'Enter your business details',
    description:
      'Your business name appears on every lead notification and client-facing message. Your notification email is where Odyssey sends instant lead alerts.',
    action:
      'Enter your Business Name and Notification Email in the fields here, then scroll down and click Save.',
  },
  {
    id: 'sms',
    page: '/dashboard/settings',
    target: 'sms-notifications',
    title: 'Enable SMS lead alerts',
    description:
      "Businesses that respond within 5 minutes win 10× more jobs. SMS alerts mean you'll know the second a lead comes in — even when you're on site.",
    action:
      'Enter your mobile number with country code (e.g. +61 400 000 000), toggle on "SMS lead alerts", then click Save.',
  },
  {
    id: 'forms',
    page: '/dashboard/forms',
    target: 'new-form-btn',
    title: 'Create your lead capture form',
    description:
      "Your form turns website visitors into qualified leads. It asks targeted questions and runs every submission through AI scoring before it hits your inbox.",
    action:
      'Click "New Form" to pick an industry template. Customise the questions, then copy the embed code and paste it into your website — works on Squarespace, WordPress, Wix, anything.',
  },
  {
    id: 'calls',
    page: '/dashboard/calls',
    target: 'add-number-btn',
    title: 'Set up call tracking',
    description:
      'Give each marketing channel its own number — website, Google Ads, Facebook. Every call forwards to your real mobile and is logged here with caller details and AI transcription.',
    action:
      'Click "Add Number", search for a local number near you, enter your real mobile as the forwarding number, then click Provision.',
  },
  {
    id: 'sequences',
    page: '/dashboard/sequences',
    target: 'new-sequence-btn',
    title: 'Automate your follow-ups',
    description:
      "Sequences automatically send timed SMS and email messages to new leads — a fast reply while you're on site, a follow-up the next day, a quote request by the end of the week.",
    action:
      'Click "Create Sequence", add an email step at 5 minutes and an SMS step at 2 hours, set the trigger to "New Lead", then activate it.',
  },
  {
    id: 'done',
    page: '/dashboard',
    target: null,
    title: "You're all set!",
    description:
      'Leads will appear on your dashboard the moment someone fills in your form or calls a tracking number. Each gets an AI score so you know who to call back first.',
    tip: 'AI scores run 1–100. Hot leads (70+) are serious buyers — call them back within minutes for the best conversion rate.',
  },
];
