'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatWidgetProps {
  orgSlug?: string;
  orgId?: string;
  accentColor?: string;
  position?: 'bottom-right' | 'bottom-left';
  greeting?: string;
}

export function AIChatWidget({
  orgSlug,
  orgId,
  accentColor = '#4FD1E5',
  position = 'bottom-right',
  greeting = "Hi there! How can we help you today?",
}: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: greeting },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.filter((m) => m !== messages[0]), // exclude initial greeting
          orgSlug,
          orgId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([
          ...newMessages,
          { role: 'assistant', content: "Sorry, I'm having trouble right now. Please try again or leave your details and we'll get back to you!" },
        ]);
      }
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: "Sorry, something went wrong. Please try again!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const positionClasses = position === 'bottom-right'
    ? 'right-4 sm:right-6'
    : 'left-4 sm:left-6';

  return (
    <div className={`fixed bottom-4 sm:bottom-6 ${positionClasses} z-50`}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-[340px] sm:w-[380px] bg-white dark:bg-[#1a1a2e] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col"
            style={{ maxHeight: '500px' }}
          >
            {/* Chat header */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ backgroundColor: accentColor }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">Chat with us</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[250px] max-h-[350px]">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'text-white rounded-br-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-sm'
                    }`}
                    style={msg.role === 'user' ? { backgroundColor: accentColor } : undefined}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-2xl rounded-bl-sm">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 rounded-full text-sm bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-0 outline-none focus:ring-2 focus:ring-opacity-50 placeholder:text-gray-400"
                  style={{ '--tw-ring-color': accentColor } as React.CSSProperties}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 rounded-full text-white transition-opacity disabled:opacity-40"
                  style={{ backgroundColor: accentColor }}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white ml-auto"
        style={{ backgroundColor: accentColor }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageSquare className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
