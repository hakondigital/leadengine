import 'server-only';
import Stripe from 'stripe';

export { PLANS, type PlanId } from './plans';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

export function getStripe(): Stripe | null {
  if (!stripeSecretKey) {
    console.warn('Stripe secret key not configured');
    return null;
  }
  return new Stripe(stripeSecretKey, { apiVersion: '2026-02-25.clover' });
}
