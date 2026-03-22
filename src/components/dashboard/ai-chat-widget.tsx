'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { useOrganization } from '@/hooks/use-organization';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your Odyssey AI assistant. Ask me anything about your leads, clients, or how to use the CRM.",
  timestamp: new Date(),
};

export function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { organization } = useOrganization();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          organization_id: organization?.id || null,
        }),
      });

      const data = await res.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.reply || "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: "I'm having trouble connecting. Please check your internet and try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, organization?.id]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <>
      {/* Floating button — bottom right, above mobile nav */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-40
                   flex items-center gap-2 px-4 py-2.5 rounded-2xl
                   bg-[#09090B] hover:bg-[#1a1a1e] text-white
                   shadow-xl hover:shadow-2xl transition-all duration-200
                   border border-white/10"
        aria-label="Open AI assistant"
      >
        <Sparkles className="w-4 h-4 text-[#6366F1]" />
        <span className="text-[13px] font-medium">AI Assistant</span>
      </button>

      {/* Full side panel overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm lg:bg-black/20"
              onClick={() => setIsOpen(false)}
            />

            {/* Side panel — slides in from right */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="fixed inset-y-0 right-0 z-[70]
                         w-full sm:w-[420px] lg:w-[480px]
                         flex flex-col
                         bg-[var(--od-bg-secondary)]
                         border-l border-[var(--od-border-subtle)]
                         shadow-2xl"
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-white/10"
                style={{ backgroundColor: '#1C2A3A' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--od-accent)]/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[var(--od-accent)]" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-white">Odyssey AI</h2>
                    <p className="text-[11px] text-gray-400">Your intelligent CRM assistant</p>
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

              {/* Suggestions — shown when conversation is just the welcome message */}
              {messages.length <= 1 && !isLoading && (
                <div className="px-5 py-4 border-b border-[var(--od-border-subtle)] shrink-0">
                  <p className="text-xs font-medium text-[var(--od-text-muted)] mb-2.5">Try asking</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'How many leads do I have?',
                      'What should I focus on today?',
                      'How do I send a quote?',
                      'Show my pipeline summary',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => {
                          setInput(suggestion);
                          setTimeout(() => sendMessage(), 50);
                        }}
                        className="px-3 py-1.5 text-xs font-medium rounded-full
                                   bg-[var(--od-bg-tertiary)] text-[var(--od-text-secondary)]
                                   hover:bg-[var(--od-accent-muted)] hover:text-[var(--od-accent)]
                                   border border-[var(--od-border-subtle)]
                                   transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${msg.role === 'assistant' ? 'flex gap-2.5' : ''}`}>
                      {msg.role === 'assistant' && (
                        <div className="shrink-0 w-7 h-7 rounded-lg bg-[var(--od-accent)]/10 flex items-center justify-center mt-0.5">
                          <Sparkles className="w-3.5 h-3.5 text-[var(--od-accent)]" />
                        </div>
                      )}
                      <div>
                        <div
                          className={`px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                            msg.role === 'user'
                              ? 'rounded-2xl rounded-br-md bg-[var(--od-accent)] text-white'
                              : 'rounded-2xl rounded-bl-md bg-[var(--od-bg-tertiary)] text-[var(--od-text-primary)] border border-[var(--od-border-subtle)]'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <p className={`text-[10px] text-[var(--od-text-muted)] mt-1 ${
                          msg.role === 'user' ? 'text-right' : ''
                        }`}>
                          {formatTime(msg.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex gap-2.5">
                      <div className="shrink-0 w-7 h-7 rounded-lg bg-[var(--od-accent)]/10 flex items-center justify-center mt-0.5">
                        <Sparkles className="w-3.5 h-3.5 text-[var(--od-accent)]" />
                      </div>
                      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)]">
                        <div className="flex items-center gap-2 text-[var(--od-text-muted)]">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-xs">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div className="shrink-0 px-5 py-4 border-t border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)]">
                <div className="flex items-end gap-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Odyssey AI anything..."
                    rows={1}
                    disabled={isLoading}
                    className="flex-1 resize-none px-4 py-2.5 text-sm rounded-xl
                               bg-[var(--od-bg-primary)] text-[var(--od-text-primary)]
                               placeholder:text-[var(--od-text-muted)]
                               border border-[var(--od-border-subtle)]
                               focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)] focus:border-transparent
                               disabled:opacity-50 max-h-28"
                    style={{ minHeight: '42px' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = Math.min(target.scrollHeight, 112) + 'px';
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || isLoading}
                    className="shrink-0 w-10 h-10 rounded-xl
                               bg-[var(--od-accent)] hover:brightness-110
                               text-white disabled:opacity-30
                               flex items-center justify-center
                               transition-all duration-200"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[10px] text-[var(--od-text-muted)] text-center mt-2">
                  Powered by Odyssey AI · Press Esc to close
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
