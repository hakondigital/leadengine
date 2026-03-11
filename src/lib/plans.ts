export const PLANS = {
  starter: {
    name: 'Starter',
    price: 79,
    originalPrice: null as number | null,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
    features: [
      'Up to 50 leads/month',
      'AI lead qualification',
      'Email notifications',
      '1 lead capture form',
      'Basic analytics',
    ],
    limits: { leads: 50, forms: 1, users: 1 },
  },
  professional: {
    name: 'Professional',
    price: 149,
    originalPrice: null as number | null,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
    features: [
      'Up to 250 leads/month',
      'AI lead qualification + follow-ups',
      'Email & SMS notifications',
      '3 forms, 3 users',
      'Advanced analytics + AI insights',
      'Full AI tools suite',
      'Priority support',
    ],
    limits: { leads: 250, forms: 3, users: 3 },
    popular: true,
  },
  enterprise: {
    name: 'Enterprise',
    price: 410,
    originalPrice: 550 as number | null,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || '',
    features: [
      'Unlimited leads',
      'Full AI suite (all features)',
      'White-label branding',
      'Unlimited forms & users',
      'Call recording & transcription',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    limits: { leads: -1, forms: -1, users: -1 },
  },
} as const;

export type PlanId = keyof typeof PLANS;
