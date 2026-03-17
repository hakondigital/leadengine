import {
  CloudRain,
  Map,
  Star,
  Image as ImageIcon,
  DollarSign,
  RotateCcw,
  Ghost,
  Megaphone,
  Copy,
  MapPin,
  type LucideIcon,
} from 'lucide-react';

// ─── Marketplace add-on definition ──────────────────────────────────────────

export interface MarketplaceAddon {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  icon: LucideIcon;
  color: string;
  category: 'marketing' | 'operations' | 'sales' | 'automation';
  href: string;
  /** The sidebar section this add-on appears in when enabled */
  sidebarSection: 'engage' | 'grow' | 'configure';
}

// ─── All marketplace add-ons ────────────────────────────────────────────────

export const MARKETPLACE_ADDONS: MarketplaceAddon[] = [
  {
    id: 'weather-campaigns',
    name: 'Weather Campaigns',
    description: 'Trigger automated campaigns based on weather events.',
    longDescription: 'Automatically send targeted emails and SMS to leads when weather conditions match your triggers — rain, heatwaves, storms, and more. Perfect for trades like roofing, plumbing, and HVAC.',
    icon: CloudRain,
    color: '#5B8DEF',
    category: 'marketing',
    href: '/dashboard/tools/weather',
    sidebarSection: 'configure',
  },
  {
    id: 'service-areas',
    name: 'Service Area Map',
    description: 'Define service areas by postcode to auto-filter leads.',
    longDescription: 'Draw your service boundaries by postcode or suburb. Leads outside your areas get auto-rejected or flagged, so your team only works qualified local leads.',
    icon: Map,
    color: '#4070D0',
    category: 'operations',
    href: '/dashboard/tools/service-areas',
    sidebarSection: 'configure',
  },
  {
    id: 'reviews',
    name: 'Reviews Manager',
    description: 'Request and manage Google reviews from won leads.',
    longDescription: 'Automatically request reviews from happy clients after a job is marked as won. Track review status, send follow-up reminders, and boost your Google rating effortlessly.',
    icon: Star,
    color: '#F59E0B',
    category: 'sales',
    href: '/dashboard/reviews',
    sidebarSection: 'grow',
  },
  {
    id: 'portfolio',
    name: 'Portfolio Showcase',
    description: 'Display completed projects on your public profile.',
    longDescription: 'Build a visual portfolio of your best work. Upload before/after photos, add descriptions, and showcase your completed projects to impress potential clients.',
    icon: ImageIcon,
    color: '#A78BFA',
    category: 'sales',
    href: '/dashboard/portfolio',
    sidebarSection: 'grow',
  },
  {
    id: 'roi-tracker',
    name: 'ROI Tracker',
    description: 'Track marketing spend vs revenue by channel.',
    longDescription: 'See exactly which marketing channels deliver the best return. Compare spend against closed revenue for Google Ads, Facebook, referrals, and more.',
    icon: DollarSign,
    color: '#4ADE80',
    category: 'sales',
    href: '/dashboard/roi',
    sidebarSection: 'grow',
  },
  {
    id: 'lifecycle',
    name: 'Post-Job Lifecycle',
    description: 'AI follow-ups, review requests, and referral asks after jobs.',
    longDescription: 'Automated post-job sequences — check-in calls, review requests, referral asks, and cross-sell suggestions. AI crafts personalised messages for each client.',
    icon: RotateCcw,
    color: '#34C77B',
    category: 'automation',
    href: '/dashboard/tools/lifecycle',
    sidebarSection: 'configure',
  },
  {
    id: 'ghost-recovery',
    name: 'Ghost Recovery',
    description: 'AI re-engages leads that went silent.',
    longDescription: 'Smart AI analyses why leads stopped responding and crafts personalised re-engagement messages. Recover lost opportunities automatically.',
    icon: Ghost,
    color: '#8B7CF6',
    category: 'automation',
    href: '/dashboard/settings',
    sidebarSection: 'configure',
  },
  {
    id: 'social-proof',
    name: 'Social Proof Widget',
    description: 'Show real-time lead activity notifications on your site.',
    longDescription: 'Display live notifications like "John from Sydney just requested a quote" on your website. Build trust and urgency with social proof.',
    icon: Megaphone,
    color: '#F59E0B',
    category: 'marketing',
    href: '/dashboard/settings',
    sidebarSection: 'configure',
  },
  {
    id: 'duplicate-detection',
    name: 'Duplicate Detection',
    description: 'Automatically find and merge duplicate leads.',
    longDescription: 'Smart matching identifies duplicate leads by email, phone, and name similarity. Review and merge duplicates to keep your database clean.',
    icon: Copy,
    color: '#8B7CF6',
    category: 'operations',
    href: '/dashboard/settings',
    sidebarSection: 'configure',
  },
  {
    id: 'territory-management',
    name: 'Territory Management',
    description: 'Assign geographic territories to team members.',
    longDescription: 'Divide your service region into territories and assign team members. Leads are automatically routed to the right person based on location.',
    icon: MapPin,
    color: '#34C77B',
    category: 'operations',
    href: '/dashboard/settings',
    sidebarSection: 'configure',
  },
];

export const MARKETPLACE_CATEGORIES = [
  { id: 'all', label: 'All Add-ons' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'sales', label: 'Sales' },
  { id: 'operations', label: 'Operations' },
  { id: 'automation', label: 'Automation' },
] as const;

// Default add-ons enabled for new organizations
export const DEFAULT_ENABLED_ADDONS: string[] = [];

// Helper to check if an add-on is enabled
export function isAddonEnabled(enabledAddons: string[], addonId: string): boolean {
  return enabledAddons.includes(addonId);
}
