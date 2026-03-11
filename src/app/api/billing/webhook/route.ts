import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (userId && planId) {
          // Find the user's organization
          const { data: orgUser } = await supabase
            .from('users')
            .select('organization_id')
            .eq('id', userId)
            .maybeSingle();

          if (orgUser?.organization_id) {
            // Preserve existing settings and mark trial as used
            const { data: org } = await supabase
              .from('organizations')
              .select('settings')
              .eq('id', orgUser.organization_id)
              .single();

            const existingSettings = (org?.settings as Record<string, unknown>) || {};

            await supabase
              .from('organizations')
              .update({
                settings: {
                  ...existingSettings,
                  stripe_customer_id: customerId,
                  stripe_subscription_id: subscriptionId,
                  plan: planId,
                  billing_status: 'active',
                  has_used_trial: true,
                },
              })
              .eq('id', orgUser.organization_id);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const status = subscription.status;

        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, settings')
          .filter('settings->>stripe_customer_id', 'eq', customerId);

        if (orgs && orgs.length > 0) {
          const org = orgs[0];
          const settings = (org.settings as Record<string, unknown>) || {};
          await supabase
            .from('organizations')
            .update({
              settings: { ...settings, billing_status: status },
            })
            .eq('id', org.id);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;

        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, settings')
          .filter('settings->>stripe_customer_id', 'eq', customerId);

        if (orgs && orgs.length > 0) {
          const org = orgs[0];
          const settings = (org.settings as Record<string, unknown>) || {};
          await supabase
            .from('organizations')
            .update({
              settings: { ...settings, billing_status: 'cancelled', plan: null },
            })
            .eq('id', org.id);
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
