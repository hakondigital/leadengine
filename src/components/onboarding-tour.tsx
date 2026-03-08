'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Inbox as InboxIcon,
  FileText,
  BarChart3,
  Phone,
  MessageSquare,
  Star,
  Settings,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  CheckCircle,
  Rocket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TourStep {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tip?: string;
  navigateTo?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to LeadEngine',
    description: 'Your all-in-one lead capture and management platform. Let us give you a quick tour of the tools that will help you capture more leads and close more deals.',
    icon: Rocket,
    color: '#4FD1E5',
  },
  {
    title: 'Dashboard Overview',
    description: 'Your command centre. See total leads, pipeline status, AI scores, and revenue at a glance. The overview updates in real-time as new leads come in.',
    icon: LayoutDashboard,
    color: '#5B8DEF',
    tip: 'Click any stat card to drill deeper into your data.',
    navigateTo: '/dashboard',
  },
  {
    title: 'Lead Management',
    description: 'Every enquiry lands here with AI qualification scores. Filter, search, and manage all your leads. Click any lead to see the full detail including notes, timeline, and AI insights.',
    icon: Users,
    color: '#34C77B',
    tip: 'Leads are automatically scored by AI so you know who to call first.',
    navigateTo: '/dashboard/leads',
  },
  {
    title: 'Visual Pipeline',
    description: 'Drag and drop leads through your sales stages — from New to Won. See your entire pipeline at a glance and identify bottlenecks instantly.',
    icon: InboxIcon,
    color: '#F0A030',
    tip: 'Drag a lead to "Won" and enter the job value to track revenue.',
    navigateTo: '/dashboard/pipeline',
  },
  {
    title: 'Unified Inbox',
    description: 'All your conversations in one place — emails, SMS, form submissions, and call logs. Never lose track of a conversation with a prospect.',
    icon: MessageSquare,
    color: '#9B59B6',
    navigateTo: '/dashboard/inbox',
  },
  {
    title: 'Lead Capture Forms',
    description: 'Create beautiful, multi-step lead capture forms tailored to your industry. Embed them on your website with a single line of code. Forms are pre-built for trades, consultants, and more.',
    icon: FileText,
    color: '#E8636C',
    tip: 'Go to Forms to create your first form and get the embed code.',
    navigateTo: '/dashboard/forms',
  },
  {
    title: 'Call Tracking',
    description: 'Get unique phone numbers for each marketing channel (Google Ads, website, flyers). Every call is logged, recorded, and can be transcribed by AI. Know exactly which campaigns drive calls.',
    icon: Phone,
    color: '#4FD1E5',
    tip: 'Available on Professional and Enterprise plans.',
    navigateTo: '/dashboard/calls',
  },
  {
    title: 'Reviews & Reputation',
    description: 'Automatically request Google reviews from happy customers after a job is won. Build your online reputation on autopilot.',
    icon: Star,
    color: '#F0A030',
    navigateTo: '/dashboard/reviews',
  },
  {
    title: 'Analytics & ROI',
    description: 'See where your leads come from, conversion rates by source, response times, and revenue tracking. Know your true ROI on every marketing dollar.',
    icon: BarChart3,
    color: '#5B8DEF',
    navigateTo: '/dashboard/analytics',
  },
  {
    title: 'Settings & Customisation',
    description: 'Configure your notifications, branding, team members, AI settings, and integrations. Tailor LeadEngine to work exactly how your business needs.',
    icon: Settings,
    color: '#8B9DB5',
    navigateTo: '/dashboard/settings',
  },
  {
    title: "You're All Set!",
    description: "That's the quick tour. Start by creating your first lead capture form, then embed it on your website. Leads will start flowing in with AI scores, notifications, and everything you need to close more work.",
    icon: CheckCircle,
    color: '#34C77B',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();
  const step = TOUR_STEPS[currentStep];
  const StepIcon = step.icon;
  const isFirst = currentStep === 0;
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
      return;
    }
    const nextStep = TOUR_STEPS[currentStep + 1];
    if (nextStep.navigateTo) {
      router.push(nextStep.navigateTo);
    }
    setCurrentStep((s) => s + 1);
  }, [currentStep, isLast, onComplete, router]);

  const handleBack = useCallback(() => {
    if (isFirst) return;
    const prevStep = TOUR_STEPS[currentStep - 1];
    if (prevStep.navigateTo) {
      router.push(prevStep.navigateTo);
    }
    setCurrentStep((s) => s - 1);
  }, [currentStep, isFirst, router]);

  const handleSkip = useCallback(() => {
    onComplete();
    router.push('/dashboard');
  }, [onComplete, router]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="tour-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        {/* Card */}
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-lg mx-4"
        >
          <div className="bg-[var(--le-bg-secondary)] rounded-2xl border border-[var(--le-border-subtle)] shadow-2xl overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-[var(--le-bg-tertiary)]">
              <motion.div
                className="h-full bg-[var(--le-accent)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Skip button */}
            {!isLast && (
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 p-1.5 rounded-md text-[var(--le-text-muted)] hover:text-[var(--le-text-secondary)] hover:bg-[var(--le-bg-tertiary)] transition-colors z-10"
                aria-label="Skip tour"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Content */}
            <div className="p-8">
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `${step.color}15`, color: step.color }}
              >
                <StepIcon className="w-7 h-7" />
              </div>

              {/* Step counter */}
              <p className="text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider mb-2">
                Step {currentStep + 1} of {TOUR_STEPS.length}
              </p>

              {/* Title */}
              <h2 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight mb-3">
                {step.title}
              </h2>

              {/* Description */}
              <p className="text-sm text-[var(--le-text-secondary)] leading-relaxed mb-4">
                {step.description}
              </p>

              {/* Tip */}
              {step.tip && (
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[rgba(91,141,239,0.06)] border border-[rgba(91,141,239,0.12)] mb-4">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--le-accent)] shrink-0 mt-0.5" />
                  <p className="text-xs text-[var(--le-accent)] leading-relaxed">
                    {step.tip}
                  </p>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  {!isFirst && (
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!isLast && (
                    <button
                      onClick={handleSkip}
                      className="text-xs text-[var(--le-text-muted)] hover:text-[var(--le-text-secondary)] transition-colors px-3 py-1.5"
                    >
                      Skip tour
                    </button>
                  )}
                  <Button size="sm" onClick={handleNext}>
                    {isLast ? (
                      <>
                        Get Started
                        <Rocket className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 pb-5">
              {TOUR_STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const target = TOUR_STEPS[i];
                    if (target.navigateTo) router.push(target.navigateTo);
                    setCurrentStep(i);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'bg-[var(--le-accent)] w-4'
                      : i < currentStep
                        ? 'bg-[var(--le-accent)]/40'
                        : 'bg-[var(--le-border-subtle)]'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
