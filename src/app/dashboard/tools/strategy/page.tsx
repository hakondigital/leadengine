'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { getEffectivePlanLimits } from '@/lib/client-plan';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Brain,
  DollarSign,
  Lightbulb,
  Loader2,
  Lock,
  Send,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data_points?: { label: string; value: string }[];
  recommendations?: string[];
  follow_up_questions?: string[];
}

const suggestedPrompts = [
  {
    icon: TrendingUp,
    label: 'Performance overview',
    prompt: 'Give me a performance overview of my business this month, including leads, conversion rate, revenue, and anything unusual.',
  },
  {
    icon: DollarSign,
    label: 'Revenue analysis',
    prompt: "Analyse my revenue. What's my average deal size, where is the most money coming from, and how can I increase it?",
  },
  {
    icon: Users,
    label: 'Lead sources',
    prompt: 'Which lead sources are performing best right now, and where should I focus my marketing spend?',
  },
  {
    icon: Target,
    label: 'Pipeline risk',
    prompt: 'How healthy is the pipeline right now? Which leads are at risk of going cold and need attention?',
  },
  {
    icon: BarChart3,
    label: 'Win-loss patterns',
    prompt: 'What patterns do you see in my wins versus losses, and what do the best customers have in common?',
  },
  {
    icon: Lightbulb,
    label: 'Growth opportunities',
    prompt: 'Based on my data, what are the top three growth opportunities I should act on next?',
  },
];

export default function StrategyPage() {
  const { organization, user, authEmail } = useOrganization();
  const orgSettings = (organization?.settings as Record<string, unknown>) || {};
  const orgPlan = (orgSettings.plan as string) || null;
  const canUse = getEffectivePlanLimits(orgPlan, authEmail ?? user?.email).ai_strategy;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !organization?.id || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages.map((message) => ({
        role: message.role,
        content:
          message.role === 'assistant'
            ? JSON.stringify({
                answer: message.content,
                data_points: message.data_points || [],
                recommendations: message.recommendations || [],
                follow_up_questions: message.follow_up_questions || [],
              })
            : message.content,
      }));

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch('/api/ai/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text,
          organization_id: organization.id,
          conversation: conversationHistory,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        data_points: data.data_points,
        recommendations: data.recommendations,
        follow_up_questions: data.follow_up_questions,
      };

      setMessages((current) => [...current, assistantMessage]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: "Sorry, I couldn't process that right now. Please try again.",
          follow_up_questions: ['Give me a performance overview', 'How is my pipeline looking?'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!canUse) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)]/80 backdrop-blur-xl">
          <div className="px-4 py-5 lg:px-6">
            <Link
              href="/dashboard/tools"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--od-text-muted)] transition-colors hover:text-[var(--od-text-secondary)]"
            >
              <ArrowLeft className="h-3 w-3" />
              Agent systems
            </Link>
            <div className="mt-3 flex items-center gap-2">
              <Brain className="h-5 w-5 text-[var(--od-accent)]" />
              <h1 className="text-2xl font-bold tracking-tight text-[var(--od-text-primary)]">Agent Console</h1>
            </div>
          </div>
        </header>

        <div className="flex items-center justify-center px-4 py-20">
          <div className="w-full max-w-md rounded-[28px] border border-[var(--od-border-default)] bg-[var(--od-bg-secondary)] p-8 text-center shadow-[var(--od-shadow-md)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--od-bg-tertiary)]">
              <Lock className="h-7 w-7 text-[var(--od-text-muted)]" />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-tight text-[var(--od-text-primary)]">
              Upgrade to unlock the agent console
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--od-text-tertiary)]">
              This surface analyses live Odyssey data and returns prioritised business guidance. It is available on Professional and Enterprise plans.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/settings?tab=billing">
                Upgrade plan
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--od-border-subtle)] bg-[var(--od-bg-primary)]/80 backdrop-blur-xl">
        <div className="px-4 py-5 lg:px-6">
          <Link
            href="/dashboard/tools"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--od-text-muted)] transition-colors hover:text-[var(--od-text-secondary)]"
          >
            <ArrowLeft className="h-3 w-3" />
            Agent systems
          </Link>

          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-[var(--od-accent)]" />
                <h1 className="text-2xl font-bold tracking-tight text-[var(--od-text-primary)]">
                  Agent Console
                </h1>
              </div>
              <p className="mt-2 text-sm leading-7 text-[var(--od-text-tertiary)]">
                Ask the agent to interpret your Odyssey data, explain what matters, and suggest the next move without dropping the user into a generic chatbot screen.
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(79,209,229,0.22)] bg-[var(--od-accent-muted)] px-3 py-2 text-xs font-medium text-[var(--od-accent-text)]">
              <Sparkles className="h-3.5 w-3.5" />
              Live data analysis
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-4 px-4 py-6 lg:px-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-[28px] border border-[var(--od-border-default)] bg-[linear-gradient(180deg,rgba(79,209,229,0.08),transparent_40%),var(--od-bg-secondary)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-accent-text)]">
              Console brief
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--od-text-primary)]">
              Use the agent like an analyst and operator.
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--od-text-secondary)]">
              Ask for pressure points, revenue risk, source quality, pipeline health, or immediate priorities. The output should feel like guidance for action, not content for browsing.
            </p>
          </section>

          <section className="rounded-[28px] border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
              Prompt starters
            </p>
            <div className="mt-4 space-y-2">
              {suggestedPrompts.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + index * 0.04 }}
                    onClick={() => sendMessage(item.prompt)}
                    className="group flex w-full items-start gap-3 rounded-[20px] border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] p-3 text-left transition-all hover:border-[var(--od-border-default)] hover:bg-[var(--od-bg-tertiary)]"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--od-accent)]/10 transition-colors group-hover:bg-[var(--od-accent)]/16">
                      <Icon className="h-4 w-4 text-[var(--od-accent)]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--od-text-primary)]">{item.label}</p>
                      <p className="mt-1 text-xs leading-6 text-[var(--od-text-tertiary)]">
                        {item.prompt}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
              Session state
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              <ConsoleStat label="Workspace" value={organization?.name || 'Odyssey'} />
              <ConsoleStat label="Thread depth" value={`${messages.length} message${messages.length === 1 ? '' : 's'}`} />
            </div>
          </section>
        </aside>

        <section className="flex min-h-[calc(100vh-180px)] flex-col rounded-[30px] border border-[var(--od-border-default)] bg-[var(--od-bg-secondary)] shadow-[var(--od-shadow-md)]">
          <div className="border-b border-[var(--od-border-subtle)] px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
              Live agent thread
            </p>
            <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-[var(--od-text-primary)]">
                  Ask what matters, then keep moving.
                </h2>
                <p className="mt-2 text-sm leading-7 text-[var(--od-text-tertiary)]">
                  Responses should summarise the situation, surface key signals, and give the user clear follow-up options.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] px-3 py-1.5 text-xs text-[var(--od-text-secondary)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--od-accent)]" />
                {loading ? 'Agent analysing' : 'Ready'}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[28px] border border-[rgba(79,209,229,0.16)] bg-[linear-gradient(180deg,rgba(79,209,229,0.1),transparent_65%),var(--od-bg-secondary)] p-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--od-accent-muted)]">
                  <Sparkles className="h-6 w-6 text-[var(--od-accent)]" />
                </div>
                <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--od-text-primary)]">
                  Start with an operational question.
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--od-text-secondary)]">
                  Ask about conversion, source quality, lead decay, revenue pressure, or what the team should do next. The best questions are decision-focused.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-5">
                <AnimatePresence initial={false}>
                  {messages.map((message, index) => (
                    <motion.div
                      key={`${message.role}-${index}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className={message.role === 'user' ? 'ml-auto max-w-[78%]' : 'max-w-[92%]'}
                    >
                      {message.role === 'user' ? (
                        <div className="rounded-[24px] border border-[rgba(79,209,229,0.18)] bg-[var(--od-accent-muted)] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--od-accent-text)]">
                            User prompt
                          </p>
                          <p className="mt-2 text-sm leading-7 text-[var(--od-text-secondary)]">{message.content}</p>
                        </div>
                      ) : (
                        <div className="space-y-3 rounded-[26px] border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] p-5">
                          <div className="flex items-center gap-2">
                            <Brain className="h-4 w-4 text-[var(--od-accent)]" />
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
                              Agent response
                            </p>
                          </div>

                          <p className="text-sm leading-7 text-[var(--od-text-secondary)] whitespace-pre-wrap">
                            {message.content}
                          </p>

                          {message.data_points && message.data_points.length > 0 ? (
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              {message.data_points.map((point, pointIndex) => (
                                <div
                                  key={`${point.label}-${pointIndex}`}
                                  className="rounded-[18px] border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] p-3"
                                >
                                  <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--od-text-muted)]">
                                    {point.label}
                                  </p>
                                  <p className="mt-2 text-sm font-semibold text-[var(--od-text-primary)]">
                                    {point.value}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {message.recommendations && message.recommendations.length > 0 ? (
                            <div className="rounded-[20px] border border-[rgba(79,209,229,0.16)] bg-[var(--od-accent-muted)] p-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-accent-text)]">
                                Recommended actions
                              </p>
                              <div className="mt-3 space-y-2">
                                {message.recommendations.map((recommendation, recommendationIndex) => (
                                  <p
                                    key={`${recommendation}-${recommendationIndex}`}
                                    className="text-sm leading-7 text-[var(--od-text-secondary)]"
                                  >
                                    {recommendationIndex + 1}. {recommendation}
                                  </p>
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {message.follow_up_questions && message.follow_up_questions.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {message.follow_up_questions.map((question, questionIndex) => (
                                <button
                                  key={`${question}-${questionIndex}`}
                                  onClick={() => sendMessage(question)}
                                  disabled={loading}
                                  className="rounded-full border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] px-3 py-1.5 text-xs font-medium text-[var(--od-text-secondary)] transition-colors hover:border-[var(--od-border-default)] hover:text-[var(--od-text-primary)] disabled:opacity-50"
                                >
                                  {question}
                                </button>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {loading ? (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-[92%] rounded-[24px] border border-[var(--od-border-subtle)] bg-[rgba(255,255,255,0.03)] px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-[var(--od-text-secondary)]">
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--od-accent)]" />
                      Agent is analysing your Odyssey data...
                    </div>
                  </motion.div>
                ) : null}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-[var(--od-border-subtle)] px-6 py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--od-text-muted)]">
              Ask the agent
            </p>
            <div className="mt-3 flex items-end gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask about pipeline pressure, lead quality, revenue risk, or what to do next..."
                rows={2}
                className="min-h-[84px] flex-1 rounded-[22px] border border-[var(--od-border-default)] bg-[var(--od-bg-tertiary)] px-4 py-3 text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)]/30 resize-none"
              />
              <Button
                size="lg"
                disabled={!input.trim() || loading}
                onClick={() => sendMessage(input)}
                className="h-[84px] px-6"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ConsoleStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-[var(--od-border-subtle)] bg-[var(--od-bg-tertiary)] p-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--od-text-muted)]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[var(--od-text-primary)]">{value}</p>
    </div>
  );
}
