'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useToast } from '@/components/ui/toast';
import {
  Sparkles,
  ArrowRight,
  Check,
  Copy,
  Mail,
  Phone,
  Building2,
  X,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Loader2,
  SkipForward,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type OnboardingStep = 0 | 1 | 2 | 3 | 4; // 0-based: business, contact, email, form, complete

interface ChatBubble {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  buttons?: QuickButton[];
  inputType?: 'text' | 'email' | 'tel' | 'none';
  inputPlaceholder?: string;
  copyBlock?: { label: string; value: string };
  embedBlock?: { label: string; value: string };
}

interface QuickButton {
  label: string;
  value: string;
  icon?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatAuPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) {
    return '+61' + digits.slice(1);
  }
  if (digits.startsWith('61') && digits.length === 11) {
    return '+' + digits;
  }
  if (raw.startsWith('+')) return raw;
  return raw;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ------------------------------------------------------------------ */
/*  Step definitions                                                   */
/* ------------------------------------------------------------------ */

const INDUSTRY_OPTIONS: QuickButton[] = [
  { label: 'Electrical', value: 'electrical' },
  { label: 'Plumbing', value: 'plumbing' },
  { label: 'Building', value: 'building' },
  { label: 'Landscaping', value: 'landscaping' },
  { label: 'Cleaning', value: 'cleaning' },
  { label: 'Consulting', value: 'consulting' },
  { label: 'Other', value: 'other' },
];

const STEP_LABELS = [
  'Business Details',
  'Contact Info',
  'Connect Email',
  'Lead Capture',
  'Complete',
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function OnboardingAgent() {
  const { organization, loading: orgLoading } = useOrganization();
  const { success: toastSuccess } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Panel visibility
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);

  // Current step & sub-step tracking
  const [step, setStep] = useState<OnboardingStep>(0);
  const [subStep, setSubStep] = useState(0); // within-step progression
  const [messages, setMessages] = useState<ChatBubble[]>([]);
  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Determine if onboarding already complete
  const settings = (organization?.settings as Record<string, unknown>) || {};
  const alreadyComplete = !!settings.onboarding_completed;

  // Restore saved step from org settings
  useEffect(() => {
    if (orgLoading || !organization) return;
    if (alreadyComplete) {
      setOnboardingDone(true);
      return;
    }

    // Auto-detect completed steps and skip ahead
    const emailConnected = !!(settings.gmail_email || settings.outlook_email || organization.notification_email);
    const hasPhone = !!organization.phone;
    const hasName = !!organization.name && organization.name !== 'My Business';

    if (hasName && hasPhone && emailConnected) {
      // Everything done — jump to form link step or complete
      setStep(3);
    } else if (hasName && hasPhone) {
      // Name + phone done, need email
      setStep(emailConnected ? 3 : 2);
    } else if (hasName) {
      // Name done, need phone
      setStep(1);
    } else {
      const savedStep = settings.onboarding_step;
      if (typeof savedStep === 'number' && savedStep >= 0 && savedStep <= 4) {
        setStep(savedStep as OnboardingStep);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgLoading, organization?.id, alreadyComplete]);

  // Auto-open on first visit when onboarding not done
  useEffect(() => {
    if (orgLoading || !organization || hasAutoOpened || onboardingDone || alreadyComplete) return;
    const timer = setTimeout(() => {
      setIsOpen(true);
      setHasAutoOpened(true);
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgLoading, organization?.id, onboardingDone, alreadyComplete]);

  // Populate initial messages for the current step
  useEffect(() => {
    if (orgLoading || !organization || onboardingDone) return;
    buildStepMessages(step, 0);
    setSubStep(0);
    setInput('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, organization?.id, orgLoading, onboardingDone]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, saving]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen, messages]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  API helper                                                       */
  /* ---------------------------------------------------------------- */

  const patchOrg = useCallback(
    async (payload: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch('/api/organization', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const saveStepProgress = useCallback(
    async (s: number) => {
      try {
        await fetch('/api/organization', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings_update: { onboarding_step: s } }),
        });
      } catch {
        // Non-critical
      }
    },
    []
  );

  /* ---------------------------------------------------------------- */
  /*  Build messages for each step                                     */
  /* ---------------------------------------------------------------- */

  const buildStepMessages = useCallback(
    (s: OnboardingStep, sub: number) => {
      const org = organization;
      const msgs: ChatBubble[] = [];

      if (s === 0) {
        if (sub === 0) {
          msgs.push({
            id: uid(),
            role: 'assistant',
            content:
              "Welcome to Odyssey! I'm your setup assistant — let's get your CRM ready in a few minutes.\n\nFirst up, what's your business name?",
            inputType: 'text',
            inputPlaceholder: 'e.g. Smith Electrical',
          });
        } else if (sub === 1) {
          msgs.push({
            id: uid(),
            role: 'assistant',
            content: `Great — "${org?.name}" is locked in. Now, what industry are you in?`,
            buttons: INDUSTRY_OPTIONS,
            inputType: 'none',
          });
        }
      } else if (s === 1) {
        if (sub === 0) {
          msgs.push({
            id: uid(),
            role: 'assistant',
            content:
              "Perfect. Now let's set up your notifications so you never miss a lead.\n\nWhat's your phone number for SMS alerts?",
            inputType: 'tel',
            inputPlaceholder: '0412 345 678',
          });
        }
      } else if (s === 2) {
        msgs.push({
          id: uid(),
          role: 'assistant',
          content:
            "Now let's connect your email so all your business enquiries flow into the CRM automatically.\n\nChoose your email provider:",
          buttons: [
            { label: 'Connect Gmail', value: 'gmail', icon: <img src="/gmail-logo.svg" alt="Gmail" className="w-5 h-5" /> },
            { label: 'Connect Outlook', value: 'outlook', icon: <img src="/outlook-logo.svg" alt="Outlook" className="w-5 h-5" /> },
            { label: 'I don\'t use either', value: 'manual_email' },
          ],
          inputType: 'none',
        });
      } else if (s === 3) {
        const formUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/form/${org?.slug || 'my-business'}`;
        const embedCode = `<iframe src="${formUrl}" width="100%" height="600" frameborder="0" style="border:none;border-radius:12px;"></iframe>`;
        msgs.push({
          id: uid(),
          role: 'assistant',
          content:
            "Here's your lead capture form link. Add this to your website to start capturing leads — or share it directly with potential customers.",
          inputType: 'none',
          copyBlock: { label: 'Form URL', value: formUrl },
          embedBlock: { label: 'Embed Code', value: embedCode },
        });
      } else if (s === 4) {
        msgs.push({
          id: uid(),
          role: 'assistant',
          content:
            "You're all set! Your CRM is ready to capture and manage leads.\n\nIf you need help with anything, I'm always here — just click the AI Assistant button in the top right.",
          inputType: 'none',
        });
      }

      setMessages(msgs);
    },
    [organization]
  );

  /* ---------------------------------------------------------------- */
  /*  Handlers                                                         */
  /* ---------------------------------------------------------------- */

  const advanceStep = useCallback(
    async (nextStep: OnboardingStep) => {
      setStep(nextStep);
      setSubStep(0);
      await saveStepProgress(nextStep);

      if (nextStep === 4) {
        // Mark onboarding complete
        try {
          await patchOrg({
            settings_update: {
              onboarding_completed: true,
              onboarding_completed_at: new Date().toISOString(),
              onboarding_step: 4,
            },
          });
        } catch {
          // Non-critical
        }
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }
    },
    [patchOrg, saveStepProgress]
  );

  const handleSubmit = useCallback(async () => {
    const value = input.trim();
    if (!value || saving) return;

    // Add user message
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'user', content: value, inputType: 'none' },
    ]);
    setInput('');

    if (step === 0 && subStep === 0) {
      // Save business name
      await patchOrg({ name: value });
      toastSuccess('Business name saved');
      setSubStep(1);
      // Show industry question after brief delay
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: `Great — "${value}" is locked in. Now, what industry are you in?`,
            buttons: INDUSTRY_OPTIONS,
            inputType: 'none',
          },
        ]);
      }, 500);
    } else if (step === 1 && subStep === 0) {
      // Save phone + enable SMS
      const formatted = formatAuPhone(value);
      await patchOrg({ phone: formatted, sms_notifications_enabled: true });
      toastSuccess('Phone saved & SMS alerts enabled');
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: `Done — SMS alerts are now on at ${formatted}.`,
            inputType: 'none',
          },
        ]);
        setTimeout(() => advanceStep(2), 1000);
      }, 500);
    } else if (step === 2 && subStep === 1) {
      // Manual email input (user chose "I don't use either")
      await patchOrg({ notification_email: value });
      toastSuccess('Email saved');
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: `Email set to ${value}. Lead notifications will be sent there.`,
            inputType: 'none',
          },
        ]);
        setTimeout(() => advanceStep(3), 1000);
      }, 500);
    }
  }, [input, saving, step, subStep, patchOrg, toastSuccess, advanceStep]);

  const handleQuickButton = useCallback(
    async (value: string) => {
      if (saving) return;

      // Add user message
      const label =
        INDUSTRY_OPTIONS.find((o) => o.value === value)?.label || value;
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'user', content: label, inputType: 'none' },
      ]);

      if (step === 0 && subStep === 1) {
        // Save industry
        await patchOrg({ industry: value });
        toastSuccess('Industry saved');
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: uid(),
              role: 'assistant',
              content: `${label} — nice! Let's move on to your contact details.`,
              inputType: 'none',
            },
          ]);
          setTimeout(() => advanceStep(1), 1000);
        }, 500);
      } else if (step === 2) {
        // Connect email
        if (value === 'gmail') {
          window.location.href = `/api/auth/google?organization_id=${organization?.id}`;
        } else if (value === 'outlook') {
          window.location.href = `/api/auth/outlook?organization_id=${organization?.id}`;
        } else if (value === 'manual_email') {
          // Show manual email input
          setSubStep(1);
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: uid(),
                role: 'assistant',
                content: 'No worries — just enter your email address and we\'ll send lead notifications there.',
                inputType: 'email',
                inputPlaceholder: 'you@yourbusiness.com',
              },
            ]);
          }, 500);
        }
      }
    },
    [saving, step, subStep, patchOrg, toastSuccess, advanceStep, organization?.id]
  );

  const handleSkip = useCallback(async () => {
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'user', content: 'Skip this step', inputType: 'none' },
    ]);
    setTimeout(() => {
      const next = Math.min(step + 1, 4) as OnboardingStep;
      advanceStep(next);
    }, 300);
  }, [step, advanceStep]);

  const handleFinish = useCallback(() => {
    setOnboardingDone(true);
    setIsOpen(false);
  }, []);

  const handleCopy = useCallback(
    (text: string, type: 'url' | 'embed') => {
      navigator.clipboard.writeText(text);
      if (type === 'url') {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } else {
        setCopiedEmbed(true);
        setTimeout(() => setCopiedEmbed(false), 2000);
      }
      toastSuccess('Copied to clipboard');
    },
    [toastSuccess]
  );

  /* ---------------------------------------------------------------- */
  /*  Determine current input type from the latest assistant message   */
  /* ---------------------------------------------------------------- */

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const currentInputType = lastAssistant?.inputType ?? 'none';
  const currentPlaceholder = lastAssistant?.inputPlaceholder ?? 'Type your answer...';
  const currentButtons = lastAssistant?.buttons;
  const currentCopyBlock = lastAssistant?.copyBlock;
  const currentEmbedBlock = lastAssistant?.embedBlock;

  /* ---------------------------------------------------------------- */
  /*  Don't render if complete or loading                              */
  /* ---------------------------------------------------------------- */

  if (orgLoading || !organization || onboardingDone || alreadyComplete) return null;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <>
      {/* Floating prompt — only when panel is closed */}
      {!isOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40
                     flex items-center gap-2.5 px-5 py-3 rounded-2xl
                     bg-[#6366F1] hover:bg-[#5558E6] text-white
                     shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30
                     transition-all duration-200"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-semibold">Continue Setup</span>
          <span className="ml-1 text-xs opacity-75">
            Step {Math.min(step + 1, 4)} of 4
          </span>
        </motion.button>
      )}

      {/* Full side panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm lg:bg-black/20"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-[90] m-auto
                         w-full sm:w-[520px] lg:w-[580px] h-[90vh] sm:h-[85vh] max-h-[700px]
                         flex flex-col
                         bg-white rounded-2xl
                         shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-gray-100"
                   style={{ backgroundColor: '#09090B' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Setup Assistant</h2>
                    <p className="text-[11px] text-gray-400">
                      {step < 4 ? `Step ${step + 1} of 4 — ${STEP_LABELS[step]}` : 'All done!'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg
                             text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Step progress dots */}
              <div className="px-5 py-3 flex items-center gap-2 shrink-0 border-b border-gray-100 bg-gray-50/50">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 flex-1">
                    <div
                      className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
                        i < step
                          ? 'bg-indigo-500'
                          : i === step
                          ? 'bg-indigo-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Confetti overlay */}
              <AnimatePresence>
                {showConfetti && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
                  >
                    {Array.from({ length: 30 }).map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{
                          x: '50%',
                          y: '30%',
                          scale: 0,
                          rotate: 0,
                        }}
                        animate={{
                          x: `${Math.random() * 100}%`,
                          y: `${60 + Math.random() * 40}%`,
                          scale: [0, 1, 0.5],
                          rotate: Math.random() * 720 - 360,
                        }}
                        transition={{
                          duration: 2 + Math.random() * 2,
                          delay: Math.random() * 0.5,
                          ease: 'easeOut',
                        }}
                        className="absolute w-2.5 h-2.5 rounded-sm"
                        style={{
                          backgroundColor: ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'][
                            i % 6
                          ],
                        }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages area */}
              <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[90%] ${msg.role === 'assistant' ? 'flex gap-2.5' : ''}`}>
                        {msg.role === 'assistant' && (
                          <div className="shrink-0 w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center mt-0.5">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          </div>
                        )}
                        <div className="space-y-3">
                          <div
                            className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                              msg.role === 'user'
                                ? 'rounded-2xl rounded-br-md bg-indigo-500 text-white'
                                : 'rounded-2xl rounded-bl-md bg-gray-50 text-gray-800 border border-gray-100'
                            }`}
                          >
                            {msg.content}
                          </div>

                          {/* Copy block (form URL) */}
                          {msg.copyBlock && (
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                                  {msg.copyBlock.label}
                                </span>
                                <button
                                  onClick={() => handleCopy(msg.copyBlock!.value, 'url')}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium
                                             text-indigo-500 hover:bg-indigo-50 transition-colors"
                                >
                                  {copiedUrl ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  {copiedUrl ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <code className="text-xs text-gray-600 break-all leading-relaxed">
                                {msg.copyBlock.value}
                              </code>
                            </div>
                          )}

                          {/* Embed block */}
                          {msg.embedBlock && (
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                                  {msg.embedBlock.label}
                                </span>
                                <button
                                  onClick={() => handleCopy(msg.embedBlock!.value, 'embed')}
                                  className="flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium
                                             text-indigo-500 hover:bg-indigo-50 transition-colors"
                                >
                                  {copiedEmbed ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  {copiedEmbed ? 'Copied' : 'Copy'}
                                </button>
                              </div>
                              <code className="text-[11px] text-gray-500 break-all leading-relaxed block max-h-20 overflow-y-auto">
                                {msg.embedBlock.value}
                              </code>
                            </div>
                          )}

                          {/* Quick buttons */}
                          {msg.buttons && msg.buttons.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {msg.buttons.map((btn) => (
                                <button
                                  key={btn.value}
                                  onClick={() => handleQuickButton(btn.value)}
                                  disabled={saving}
                                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium
                                             bg-white border border-gray-200 text-gray-700
                                             hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600
                                             disabled:opacity-50
                                             transition-all duration-150"
                                >
                                  {btn.icon}
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {saving && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start"
                  >
                    <div className="flex gap-2.5">
                      <div className="shrink-0 w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      </div>
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-xs">Saving...</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input / action bar */}
              <div className="shrink-0 border-t border-gray-100 bg-white">
                {/* Text input — only for text/email/tel steps */}
                {currentInputType && currentInputType !== 'none' && step < 4 && (
                  <div className="px-5 py-4">
                    <div className="flex items-end gap-3">
                      <div className="flex-1 relative">
                        <input
                          ref={inputRef}
                          type={currentInputType}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSubmit();
                            }
                          }}
                          placeholder={currentPlaceholder}
                          disabled={saving}
                          className="w-full px-4 py-3 text-sm rounded-xl
                                     bg-[#F5F5F5] text-gray-900
                                     placeholder:text-gray-400
                                     border border-gray-200
                                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                                     disabled:opacity-50 transition-all"
                        />
                      </div>
                      <button
                        onClick={handleSubmit}
                        disabled={!input.trim() || saving}
                        className="shrink-0 w-11 h-11 rounded-xl
                                   bg-indigo-500 hover:bg-indigo-600
                                   text-white disabled:opacity-30
                                   flex items-center justify-center
                                   transition-all duration-200"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 4 (complete) — finish button */}
                {step === 4 && (
                  <div className="px-5 py-4">
                    <button
                      onClick={handleFinish}
                      className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600
                                 text-white text-sm font-semibold
                                 transition-colors duration-200
                                 flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Go to Dashboard
                    </button>
                  </div>
                )}

                {/* Step 3 (form) — Next button */}
                {step === 3 && (
                  <div className="px-5 py-4">
                    <button
                      onClick={() => advanceStep(4)}
                      className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-600
                                 text-white text-sm font-semibold
                                 transition-colors duration-200
                                 flex items-center justify-center gap-2"
                    >
                      Finish Setup
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Skip + progress footer */}
                {step < 4 && (
                  <div className="px-5 py-3 flex items-center justify-between border-t border-gray-50">
                    <button
                      onClick={handleSkip}
                      disabled={saving}
                      className="flex items-center gap-1.5 text-xs font-medium text-gray-400
                                 hover:text-gray-600 transition-colors disabled:opacity-50"
                    >
                      <SkipForward className="w-3 h-3" />
                      {step === 3 ? 'Skip & finish' : "I'll do this later"}
                    </button>
                    <span className="text-[10px] text-gray-300">
                      Press Esc to minimise
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
