'use client';

import { useState, useRef, useEffect, useCallback, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  const [showPulse, setShowPulse] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { organization } = useOrganization();

  // Stop pulse after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowPulse(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

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
        content:
          data.reply || "Sorry, I couldn't process that. Please try again.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content:
            "I'm having trouble connecting. Please check your internet and try again.",
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

  return (
    <>
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-24 lg:bottom-20 right-4 lg:right-6 z-50
                       w-[calc(100vw-2rem)] sm:w-[380px] h-[500px] max-h-[70vh]
                       flex flex-col overflow-hidden
                       rounded-[var(--od-radius-lg)] shadow-2xl
                       border border-[var(--od-border-subtle)]
                       bg-[var(--od-bg-secondary)]"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ backgroundColor: '#1C2A3A' }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[var(--od-radius-md)] bg-[var(--od-accent)] bg-opacity-20 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-[var(--od-accent)]" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Odyssey AI
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    Your CRM assistant
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-[var(--od-radius-md)]
                           text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                      ${
                        msg.role === 'user'
                          ? 'rounded-[var(--od-radius-md)] rounded-br-sm bg-[var(--od-accent)] text-white'
                          : 'rounded-[var(--od-radius-md)] rounded-bl-sm bg-[var(--od-bg-tertiary)] text-[var(--od-text-primary)] border border-[var(--od-border-subtle)]'
                      }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] px-3.5 py-2.5 rounded-[var(--od-radius-md)] rounded-bl-sm bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)]">
                    <div className="flex items-center gap-2 text-[var(--od-text-muted)]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div className="shrink-0 px-3 py-3 border-t border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)]">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  rows={1}
                  disabled={isLoading}
                  className="flex-1 resize-none px-3 py-2 text-sm rounded-[var(--od-radius-md)]
                             bg-white text-gray-900 placeholder-gray-400
                             border border-[var(--od-border-subtle)]
                             focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)] focus:border-transparent
                             disabled:opacity-50 max-h-24"
                  style={{ minHeight: '38px' }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 96) + 'px';
                  }}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className="shrink-0 h-[38px] w-[38px] rounded-[var(--od-radius-md)]
                             bg-[var(--od-accent)] hover:bg-[var(--od-accent)] hover:brightness-110
                             text-white disabled:opacity-40 transition-all"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-50
                   w-14 h-14 rounded-full shadow-2xl
                   bg-[var(--od-accent)] hover:brightness-110
                   flex items-center justify-center
                   transition-all duration-200 cursor-pointer
                   group"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
      >
        {/* Pulse ring */}
        {showPulse && !isOpen && (
          <span className="absolute inset-0 rounded-full bg-[var(--od-accent)] animate-ping opacity-30" />
        )}

        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X className="w-6 h-6 text-white" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="relative"
            >
              <MessageCircle className="w-6 h-6 text-white" />
              {/* AI badge */}
              <span
                className="absolute -top-2 -right-2 px-1 py-px text-[8px] font-bold
                           bg-white text-[var(--od-accent)] rounded-full leading-none
                           shadow-sm"
              >
                AI
              </span>
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
