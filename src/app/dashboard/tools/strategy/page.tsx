'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { getEffectivePlanLimits } from '@/lib/client-plan';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Brain,
  Send,
  Loader2,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  BarChart3,
  Lightbulb,

  Lock,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  data_points?: { label: string; value: string }[];
  recommendations?: string[];
  follow_up_questions?: string[];
}

const suggestedPrompts = [
  { icon: TrendingUp, label: 'Performance overview', prompt: 'Give me a performance overview of my business this month — leads, conversion rate, revenue, and anything that stands out.' },
  { icon: DollarSign, label: 'Revenue analysis', prompt: 'Analyse my revenue — what\'s my average deal size, where is the most money coming from, and how can I increase it?' },
  { icon: Users, label: 'Best lead sources', prompt: 'Which lead sources are performing best for me? Where should I focus my marketing spend?' },
  { icon: Target, label: 'Pipeline health', prompt: 'How healthy is my pipeline right now? Are there any leads at risk of going cold that I should prioritise?' },
  { icon: BarChart3, label: 'Win/loss patterns', prompt: 'What patterns do you see in my wins vs losses? What do my best customers have in common?' },
  { icon: Lightbulb, label: 'Growth opportunities', prompt: 'Based on my data, what are the top 3 growth opportunities I should pursue right now?' },
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !organization?.id || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.role === 'assistant'
          ? JSON.stringify({
              answer: m.content,
              data_points: m.data_points || [],
              recommendations: m.recommendations || [],
              follow_up_questions: m.follow_up_questions || [],
            })
          : m.content,
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

      if (!res.ok) {
        throw new Error('Failed to get response');
      }

      const data = await res.json();
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.answer,
        data_points: data.data_points,
        recommendations: data.recommendations,
        follow_up_questions: data.follow_up_questions,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I couldn\'t process that right now. Please try again.',
          follow_up_questions: ['Give me a performance overview', 'How is my pipeline looking?'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Locked state for non-Pro users
  if (!canUse) {
    return (
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
          <div className="px-4 lg:px-6 py-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-[var(--od-accent)]" />
              <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">AI Strategy Advisor</h1>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-center px-4 py-20">
          <div className="text-center max-w-sm">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--od-bg-tertiary)] mx-auto mb-4">
              <Lock className="w-7 h-7 text-[var(--od-text-muted)]" />
            </div>
            <h2 className="text-lg font-semibold text-[var(--od-text-primary)] mb-2">Upgrade to unlock</h2>
            <p className="text-sm text-[var(--od-text-tertiary)] mb-5">
              AI Strategy Advisor analyses your real business data and gives personalised growth recommendations. Available on Professional and Enterprise plans.
            </p>
            <a
              href="/dashboard/settings?tab=billing"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-[var(--od-radius-md)] text-sm font-semibold bg-[var(--od-accent)] text-white hover:brightness-110 transition-all"
            >
              Upgrade plan
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[var(--od-accent)]" />
            <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">AI Strategy Advisor</h1>
          </div>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
            Ask anything about your business — powered by your real Odyssey data
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col px-4 lg:px-6 py-4 max-w-4xl mx-auto w-full">
        {/* Chat area */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {/* Welcome state */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 pt-8"
            >
              <div className="text-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--od-accent)]/10 mx-auto mb-4">
                  <Sparkles className="w-7 h-7 text-[var(--od-accent)]" />
                </div>
                <h2 className="text-lg font-semibold text-[var(--od-text-primary)] mb-1">
                  What would you like to know?
                </h2>
                <p className="text-sm text-[var(--od-text-tertiary)] max-w-md mx-auto">
                  I have access to your leads, quotes, appointments, calls, and inbox data. Ask me anything about your business performance.
                </p>
              </div>

              {/* Suggested prompts */}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {suggestedPrompts.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <motion.button
                      key={item.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.05 }}
                      onClick={() => sendMessage(item.prompt)}
                      className="flex items-start gap-3 p-3 rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] hover:border-[var(--od-accent)]/30 hover:bg-[var(--od-bg-tertiary)] transition-all text-left group"
                    >
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--od-accent)]/8 shrink-0 group-hover:bg-[var(--od-accent)]/15 transition-colors">
                        <Icon className="w-4 h-4 text-[var(--od-accent)]" />
                      </div>
                      <span className="text-xs font-medium text-[var(--od-text-secondary)] leading-snug pt-1.5">
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Messages */}
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-br-md bg-[var(--od-accent)] text-white text-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[90%] space-y-3">
                    {/* Main answer */}
                    <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)]">
                      <p className="text-sm text-[var(--od-text-secondary)] leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>

                    {/* Data points */}
                    {msg.data_points && msg.data_points.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {msg.data_points.map((dp, j) => (
                          <div
                            key={j}
                            className="px-3 py-2 rounded-[var(--od-radius-sm)] bg-[var(--od-bg-secondary)] border border-[var(--od-border-subtle)]"
                          >
                            <p className="text-[10px] text-[var(--od-text-muted)] uppercase tracking-wider">{dp.label}</p>
                            <p className="text-sm font-semibold text-[var(--od-text-primary)]">{dp.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recommendations */}
                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div className="px-3 py-2 rounded-[var(--od-radius-sm)] bg-[var(--od-accent)]/5 border border-[var(--od-accent)]/15">
                        <p className="text-[10px] font-semibold text-[var(--od-accent)] uppercase tracking-wider mb-1.5">Recommended actions</p>
                        {msg.recommendations.map((rec, j) => (
                          <p key={j} className="text-xs text-[var(--od-text-secondary)] leading-relaxed">
                            {j + 1}. {rec}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Follow-up questions */}
                    {msg.follow_up_questions && msg.follow_up_questions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.follow_up_questions.map((q, j) => (
                          <button
                            key={j}
                            onClick={() => sendMessage(q)}
                            disabled={loading}
                            className="px-2.5 py-1 rounded-full text-[10px] font-medium bg-[var(--od-bg-tertiary)] text-[var(--od-text-secondary)] hover:bg-[var(--od-accent-muted)] hover:text-[var(--od-accent)] border border-[var(--od-border-subtle)] transition-colors disabled:opacity-50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading */}
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)]">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-[var(--od-accent)] animate-spin" />
                  <span className="text-xs text-[var(--od-text-muted)]">Analysing your data...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="sticky bottom-0 bg-[var(--od-bg-primary)] pt-2 pb-4 border-t border-[var(--od-border-subtle)]">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder="Ask about your business..."
                rows={1}
                className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)] focus:border-transparent resize-none"
              />
            </div>
            <Button
              size="sm"
              disabled={!input.trim() || loading}
              onClick={() => sendMessage(input)}
              className="h-[46px] px-4"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-[var(--od-text-muted)] mt-1.5 text-center">
            AI analyses your Odyssey data to provide tailored business insights
          </p>
        </div>
      </div>
    </div>
  );
}
