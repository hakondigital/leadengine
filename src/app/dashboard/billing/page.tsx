'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PLANS, type PlanId } from '@/lib/stripe';
import { useOrganization } from '@/hooks/use-organization';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Check,
  Sparkles,
  CreditCard,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BillingPage() {
  const { organization } = useOrganization();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const settings = (organization?.settings as Record<string, unknown>) || {};
  const currentPlan = (settings.plan as string) || null;
  const billingStatus = (settings.billing_status as string) || null;
  const customerId = (settings.stripe_customer_id as string) || null;
  const hasUsedTrial = !!settings.has_used_trial;

  const handleSubscribe = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    if (!customerId) return;
    setLoadingPlan('portal');
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal error:', error);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
                Billing & Plans
              </h1>
              <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
                {currentPlan
                  ? `Current plan: ${PLANS[currentPlan as PlanId]?.name || currentPlan} (${billingStatus})`
                  : 'Choose a plan to get started'}
              </p>
            </div>
            {customerId && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleManageBilling}
                disabled={loadingPlan === 'portal'}
              >
                {loadingPlan === 'portal' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5" />
                )}
                Manage Billing
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {(Object.entries(PLANS) as [PlanId, (typeof PLANS)[PlanId]][]).map(
            ([planId, plan], i) => {
              const isCurrentPlan = currentPlan === planId;
              const isPopular = 'popular' in plan && plan.popular;

              return (
                <motion.div
                  key={planId}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: i * 0.08 }}
                >
                  <Card
                    className={cn(
                      'relative overflow-hidden transition-all duration-200',
                      isPopular &&
                        'border-[var(--le-accent)] shadow-[0_0_24px_rgba(79,209,229,0.12)]',
                      isCurrentPlan && 'ring-2 ring-[var(--le-accent)]'
                    )}
                  >
                    {isPopular && (
                      <div className="absolute top-0 right-0 px-3 py-1 bg-[var(--le-accent)] text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-lg">
                        Most Popular
                      </div>
                    )}

                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2">
                        {plan.name}
                        {isCurrentPlan && (
                          <Badge variant="accent" size="sm">
                            Current
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="mt-3">
                        <span className="text-3xl font-bold text-[var(--le-text-primary)]">
                          ${plan.price}
                        </span>
                        <span className="text-sm text-[var(--le-text-muted)]">
                          /month
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <ul className="space-y-2.5 mb-6">
                        {plan.features.map((feature) => (
                          <li
                            key={feature}
                            className="flex items-start gap-2.5 text-sm text-[var(--le-text-secondary)]"
                          >
                            <Check className="w-4 h-4 text-[var(--le-accent)] shrink-0 mt-0.5" />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {isCurrentPlan ? (
                        <Button
                          variant="secondary"
                          className="w-full"
                          disabled
                        >
                          <Check className="w-3.5 h-3.5" />
                          Active Plan
                        </Button>
                      ) : (
                        <Button
                          className={cn(
                            'w-full',
                            isPopular &&
                              'bg-[var(--le-accent)] text-white hover:bg-[#38BCD0]'
                          )}
                          onClick={() => handleSubscribe(planId)}
                          disabled={!!loadingPlan}
                        >
                          {loadingPlan === planId ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              {isPopular ? (
                                <Sparkles className="w-3.5 h-3.5" />
                              ) : (
                                <ArrowRight className="w-3.5 h-3.5" />
                              )}
                            </>
                          )}
                          {currentPlan ? 'Switch Plan' : hasUsedTrial ? 'Get Started' : 'Start 14-Day Free Trial'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            }
          )}
        </div>

        {/* FAQ / Info */}
        <div className="max-w-2xl mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Billing FAQ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-[var(--le-text-tertiary)]">
              <div>
                <p className="font-medium text-[var(--le-text-secondary)] mb-1">
                  Can I change plans anytime?
                </p>
                <p>
                  Yes, you can upgrade or downgrade at any time. Changes take
                  effect immediately and are prorated.
                </p>
              </div>
              <div>
                <p className="font-medium text-[var(--le-text-secondary)] mb-1">
                  What payment methods do you accept?
                </p>
                <p>
                  We accept all major credit cards via Stripe. Enterprise
                  customers can also pay via invoice.
                </p>
              </div>
              <div>
                <p className="font-medium text-[var(--le-text-secondary)] mb-1">
                  Is there a free trial?
                </p>
                <p>
                  New accounts get a one-time 14-day free trial on their first
                  plan. The trial cannot be reused when switching plans.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
