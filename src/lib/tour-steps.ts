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
  // ── 1. Welcome overview ──
  {
    id: 'welcome',
    page: '/dashboard',
    target: null,
    title: 'Welcome to Odyssey',
    description:
      'This quick tour will walk you through setting up your CRM step by step. Everything you need to capture, qualify, and convert leads — all in one place.',
    tip: 'You can restart this tour any time from /dashboard/reset-tour.',
  },

  // ── 2. Dashboard stats ──
  {
    id: 'dashboard-stats',
    page: '/dashboard',
    target: 'dashboard-stats',
    title: 'Your dashboard at a glance',
    description:
      'These cards show your key metrics — total leads, new enquiries, active pipeline, won deals, AI scores, and revenue. They update in real time as leads flow in.',
    tip: 'Check your dashboard each morning to see overnight activity and prioritise your day.',
  },

  // ── 3. Business details ──
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

  // ── 4. SMS notifications ──
  {
    id: 'sms',
    page: '/dashboard/settings',
    target: 'sms-notifications',
    title: 'Enable SMS lead alerts',
    description:
      "Businesses that respond within 5 minutes win 10x more jobs. SMS alerts mean you'll know the second a lead comes in — even when you're on site.",
    action:
      'Enter your mobile number with country code (e.g. +61 400 000 000), toggle on "SMS lead alerts", then click Save.',
  },

  // ── 5. Create a form ──
  {
    id: 'forms',
    page: '/dashboard/forms',
    target: 'new-form-btn',
    title: 'Create your lead capture form',
    description:
      'Your form turns website visitors into qualified leads. It asks targeted questions and runs every submission through AI scoring before it hits your inbox.',
    action:
      'Click "New Form" to pick an industry template. Customise the questions, then copy the embed code and paste it into your website — works on Squarespace, WordPress, Wix, anything.',
  },

  // ── 6. Leads page ──
  {
    id: 'leads',
    page: '/dashboard/leads',
    target: 'leads-table',
    title: 'View and manage your leads',
    description:
      'Every lead that comes through your forms lands here. You can search, filter by status, and click any lead to see their full details, AI score, notes, and contact info.',
    action:
      'Try searching for a lead or clicking on one to open the detail drawer. You can add notes, change their status, and assign team members.',
  },

  // ── 7. Pipeline ──
  {
    id: 'pipeline',
    page: '/dashboard/pipeline',
    target: 'pipeline-board',
    title: 'Drag leads through your pipeline',
    description:
      'The pipeline gives you a visual overview of where every deal stands. Drag leads between columns as they progress from new enquiry to won deal.',
    action:
      'Drag a lead card from one column to another to update its status. The columns are: New, Reviewed, Contacted, Quote Sent, Won, Lost.',
  },

  // ── 8. Call tracking ──
  {
    id: 'calls',
    page: '/dashboard/calls',
    target: 'add-number-btn',
    title: 'Set up call tracking',
    description:
      'Give each marketing channel its own number — website, Google Ads, Facebook. Every call forwards to your real mobile and is logged here with caller details.',
    action:
      'Click "Add Number", search for a local number near you, enter your real mobile as the forwarding number, then click Provision.',
  },

  // ── 9. Sequences ──
  {
    id: 'sequences',
    page: '/dashboard/sequences',
    target: 'new-sequence-btn',
    title: 'Automate your follow-ups',
    description:
      'Sequences automatically send timed SMS and email messages to new leads — a fast reply while you\'re on site, a follow-up the next day, a quote request by the end of the week.',
    action:
      'Click "Create Sequence", add an email step at 5 minutes and an SMS step at 2 hours, set the trigger to "New Lead", then activate it.',
  },

  // ── 10. Inbox ──
  {
    id: 'inbox',
    page: '/dashboard/inbox',
    target: 'inbox-tabs',
    title: 'Your unified inbox',
    description:
      'All communication in one place — emails, SMS, chat messages, and phone calls. Filter by channel using the tabs, search for specific messages, and reply directly from here.',
    tip: 'Reply to leads straight from the inbox without switching between apps. Templates save you time on common responses.',
  },

  // ── 11. Tools hub ──
  {
    id: 'tools',
    page: '/dashboard/tools',
    target: 'tools-grid',
    title: 'Explore your tools',
    description:
      'The Tools hub gives you access to powerful automation — AI strategy, ballpark estimator, service areas, weather campaigns, team routing, and more. Enable or disable each tool to match your workflow.',
    action:
      'Browse the available tools and toggle on the ones relevant to your business. Click "Configure" to set up each tool.',
  },

  // ── 12. Analytics ──
  {
    id: 'analytics',
    page: '/dashboard/analytics',
    target: 'analytics-overview',
    title: 'Track your performance',
    description:
      'Analytics shows you conversion rates, lead sources, AI scoring trends, and revenue breakdown. Run AI analysis to get personalised insights on what\'s working and what to improve.',
    action:
      'Click "Run AI Analysis" to generate insights about your win/loss patterns and recommendations for improving conversions.',
  },

  // ── 13. All set ──
  {
    id: 'done',
    page: '/dashboard',
    target: null,
    title: "You're all set!",
    description:
      'Leads will appear on your dashboard the moment someone fills in your form or calls a tracking number. Each gets an AI score so you know who to call back first.',
    tip: 'AI scores run 1-100. Hot leads (70+) are serious buyers — call them back within minutes for the best conversion rate. Check Settings any time to fine-tune notifications, branding, and AI behaviour.',
  },
];
