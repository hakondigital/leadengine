'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useTour } from '@/components/tour/tour-provider';
import {
  Settings,
  FileText,
  Send,
  Palette,
  Bell,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
  Rocket,
  Zap,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type OnboardingMode = 'welcome' | 'guided' | null;

interface SetupStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  navigateTo: string;
  buttonLabel: string;
  tip: string;
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: 'settings',
    title: 'Set up your business details',
    description: 'First things first — tell us about your business. Add your company name, contact email, and phone number so leads and notifications go to the right place.',
    icon: Settings,
    color: '#5B8DEF',
    navigateTo: '/dashboard/settings',
    buttonLabel: 'Go to Settings',
    tip: 'Fill in your business name, notification email, and phone number in the General section.',
  },
  {
    id: 'form',
    title: 'Create your first lead capture form',
    description: 'Choose from industry-specific templates (trades, consulting, real estate, and more) and customise the fields to match your business. You\'ll get an embed code to drop on your website.',
    icon: FileText,
    color: '#E8636C',
    navigateTo: '/dashboard/forms',
    buttonLabel: 'Go to Forms',
    tip: 'Pick a template, tweak the fields, then copy the embed code to add it to your site.',
  },
  {
    id: 'lead',
    title: 'Submit a test lead',
    description: 'Try your form yourself — submit a test enquiry to see exactly what your customers will experience, and how leads appear in your dashboard with AI scoring.',
    icon: Send,
    color: '#34C77B',
    navigateTo: '/dashboard/forms',
    buttonLabel: 'Go to Forms',
    tip: 'Open your form preview and fill it in as if you were a customer. The lead will show up instantly.',
  },
  {
    id: 'branding',
    title: 'Customise your branding',
    description: 'Make it yours — upload your logo and pick your brand colours. These will be applied across your forms, emails, and client-facing pages.',
    icon: Palette,
    color: '#F0A030',
    navigateTo: '/dashboard/settings',
    buttonLabel: 'Go to Branding',
    tip: 'Scroll to the Branding section in Settings to upload your logo and set your colours.',
  },
  {
    id: 'notifications',
    title: 'Configure notifications',
    description: 'Never miss a lead — set up email alerts and SMS notifications so you get pinged the moment a new enquiry comes in. You can also enable auto-reply to respond instantly.',
    icon: Bell,
    color: '#4FD1E5',
    navigateTo: '/dashboard/settings',
    buttonLabel: 'Go to Notifications',
    tip: 'Enable SMS notifications and auto-reply in the Notifications section of Settings.',
  },
  {
    id: 'team',
    title: 'Set up team assignment',
    description: 'Choose how new leads are distributed to your team. You can assign manually, use round-robin to spread the load, or match leads by service type.',
    icon: Users,
    color: '#8B5CF6',
    navigateTo: '/dashboard/settings',
    buttonLabel: 'Go to Team Settings',
    tip: 'Scroll to Team & Lead Assignment in Settings. You can change this any time.',
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [mode, setMode] = useState<OnboardingMode>('welcome');
  const [currentStep, setCurrentStep] = useState(0);
  const router = useRouter();

  const step = SETUP_STEPS[currentStep];
  const isLast = currentStep === SETUP_STEPS.length - 1;
  const progress = ((currentStep + 1) / SETUP_STEPS.length) * 100;

  const handleSkipAll = useCallback(() => {
    onComplete();
    router.push('/dashboard');
  }, [onComplete, router]);

  const { startTour } = useTour();

  const handleStartGuided = useCallback(() => {
    onComplete();
    startTour();
  }, [onComplete, startTour]);

  const handleNext = useCallback(() => {
    if (isLast) {
      onComplete();
      router.push('/dashboard');
      return;
    }
    setCurrentStep((s) => s + 1);
  }, [isLast, onComplete, router]);

  const handleBack = useCallback(() => {
    if (currentStep === 0) {
      setMode('welcome');
      return;
    }
    setCurrentStep((s) => s - 1);
  }, [currentStep]);

  const handleGoToStep = useCallback(() => {
    if (step.navigateTo) {
      onComplete();
      router.push(step.navigateTo);
    }
  }, [step, onComplete, router]);

  // ─── Welcome screen: Choose your path ───
  if (mode === 'welcome') {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="welcome-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 w-full max-w-md mx-4"
          >
            <div className="bg-[var(--od-bg-secondary)] rounded-2xl border border-[var(--od-border-subtle)] shadow-2xl overflow-hidden">
              <div className="p-8 text-center">
                {/* Icon */}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-[rgba(79,209,229,0.1)]">
                  <Rocket className="w-8 h-8 text-[#4FD1E5]" />
                </div>

                <h2 className="text-2xl font-bold text-[var(--od-text-primary)] tracking-tight mb-2">
                  Welcome to Odyssey
                </h2>
                <p className="text-sm text-[var(--od-text-secondary)] leading-relaxed mb-8">
                  Let&apos;s get your account set up. You can follow our guided setup or jump straight in and configure things yourself.
                </p>

                {/* Option A: Guided */}
                <button
                  onClick={handleStartGuided}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-[var(--od-accent)]/30 bg-[var(--od-accent-muted)] hover:bg-[var(--od-accent)]/15 transition-colors text-left mb-3 group"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--od-accent)]/15 shrink-0">
                    <Sparkles className="w-5 h-5 text-[var(--od-accent)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--od-text-primary)]">
                      Walk me through setup
                    </p>
                    <p className="text-xs text-[var(--od-text-muted)] mt-0.5">
                      5 quick steps — takes about 3 minutes
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--od-accent)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>

                {/* Option B: Self-serve */}
                <button
                  onClick={handleSkipAll}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-[var(--od-border-subtle)] hover:bg-[var(--od-bg-tertiary)] transition-colors text-left group"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--od-bg-tertiary)] shrink-0">
                    <Zap className="w-5 h-5 text-[var(--od-text-muted)]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[var(--od-text-primary)]">
                      I&apos;ll figure it out myself
                    </p>
                    <p className="text-xs text-[var(--od-text-muted)] mt-0.5">
                      Skip to the dashboard — the setup checklist will guide you
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--od-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ─── Guided setup steps ───
  const StepIcon = step.icon;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="guided-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-lg mx-4"
        >
          <div className="bg-[var(--od-bg-secondary)] rounded-2xl border border-[var(--od-border-subtle)] shadow-2xl overflow-hidden">
            {/* Progress bar */}
            <div className="h-1 bg-[var(--od-bg-tertiary)]">
              <motion.div
                className="h-full bg-[var(--od-accent)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Skip button */}
            <button
              onClick={handleSkipAll}
              className="absolute top-4 right-4 p-1.5 rounded-md text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-tertiary)] transition-colors z-10"
              aria-label="Skip setup"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8">
              {/* Icon */}
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center mb-5"
                style={{ backgroundColor: `${step.color}15`, color: step.color }}
              >
                <StepIcon className="w-7 h-7" />
              </div>

              {/* Step counter */}
              <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider mb-2">
                Step {currentStep + 1} of {SETUP_STEPS.length}
              </p>

              {/* Title */}
              <h2 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight mb-3">
                {step.title}
              </h2>

              {/* Description */}
              <p className="text-sm text-[var(--od-text-secondary)] leading-relaxed mb-4">
                {step.description}
              </p>

              {/* Tip */}
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[rgba(91,141,239,0.06)] border border-[rgba(91,141,239,0.12)] mb-5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--od-accent)] shrink-0 mt-0.5" />
                <p className="text-xs text-[var(--od-accent)] leading-relaxed">
                  {step.tip}
                </p>
              </div>

              {/* Action: Go do this step */}
              <Button
                className="w-full mb-4"
                onClick={handleGoToStep}
              >
                {step.buttonLabel}
                <ArrowRight className="w-4 h-4" />
              </Button>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </Button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSkipAll}
                    className="text-xs text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] transition-colors px-3 py-1.5"
                  >
                    Skip setup
                  </button>
                  <Button variant="secondary" size="sm" onClick={handleNext}>
                    {isLast ? 'Finish' : 'Skip this step'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 pb-5">
              {SETUP_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'bg-[var(--od-accent)] w-4'
                      : i < currentStep
                        ? 'bg-[var(--od-accent)]/40 w-1.5'
                        : 'bg-[var(--od-border-subtle)] w-1.5'
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
