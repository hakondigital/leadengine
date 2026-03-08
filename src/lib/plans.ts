export const PLANS = {
  starter: {
    name: 'Starter',
    price: 79,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || '',
    features: [
      'Up to 100 leads/month',
      'AI lead qualification',
      'Email notifications',
      '1 lead capture form',
      'Basic analytics',
    ],
    limits: { leads: 100, forms: 1, users: 1 },
  },
  professional: {
    name: 'Professional',
    price: 149,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || '',
    features: [
      'Up to 500 leads/month',
      'AI lead qualification + follow-ups',
      'Email & SMS notifications',
      'Unlimited forms',
      'Advanced analytics + AI insights',
      'Webhook integrations',
      'Priority support',
    ],
    limits: { leads: 500, forms: -1, users: 5 },
    popular: true,
  },
  enterprise: {
    name: 'Enterprise',
    price: 349,
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID || '',
    features: [
      'Unlimited leads',
      'Full AI suite (all features)',
      'White-label branding',
      'Unlimited forms & users',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee',
    ],
    limits: { leads: -1, forms: -1, users: -1 },
  },
} as const;

export type PlanId = keyof typeof PLANS;
