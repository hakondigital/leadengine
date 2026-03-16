import { NextRequest, NextResponse } from 'next/server';
import { getStripe, PLANS, type PlanId } from '@/lib/stripe';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId } = await req.json();
    if (!planId || !PLANS[planId as PlanId]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const plan = PLANS[planId as PlanId];
    if (!plan.priceId) {
      return NextResponse.json({ error: 'Price ID not configured for this plan' }, { status: 500 });
    }

    // Check if this org has already used a free trial
    const serviceClient = await createServiceRoleClient();
    const { data: orgUser } = await serviceClient
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .maybeSingle();

    let hasUsedTrial = false;
    if (orgUser?.organization_id) {
      const { data: org } = await serviceClient
        .from('organizations')
        .select('settings')
        .eq('id', orgUser.organization_id)
        .single();

      const settings = (org?.settings as Record<string, unknown>) || {};
      hasUsedTrial = !!settings.has_used_trial;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return NextResponse.json({ error: 'Server misconfiguration: APP_URL not set' }, { status: 500 });
    }
    const origin = req.headers.get('origin') || appUrl;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionParams: any = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.priceId, quantity: 1 }],
      customer_email: user.email,
      metadata: {
        userId: user.id,
        planId,
      },
      success_url: `${origin}/dashboard/settings?billing=success`,
      cancel_url: `${origin}/dashboard/settings?billing=cancelled`,
    };

    // Only grant 14-day trial if they haven't used one before
    if (!hasUsedTrial) {
      sessionParams.subscription_data = {
        trial_period_days: 14,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
