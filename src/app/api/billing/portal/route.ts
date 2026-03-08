import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

    const { customerId } = await req.json();
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/dashboard/settings`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Portal error:', error);
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
  }
}
