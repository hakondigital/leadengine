'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useInbox } from '@/hooks/use-inbox';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { getEffectivePlanLimits } from '@/lib/client-plan';
import {
  Inbox,
  Mail,
  MessageSquare,
  Phone,
  MessageCircle,
  Send,
  Search,
  ArrowLeft,
  User,
  Clock,
  Zap,
  Lock,
  ArrowUpRight,
} from 'lucide-react';

type Channel = 'all' | 'email' | 'sms' | 'chat' | 'phone';

interface Message {
  id: string;
  channel: 'email' | 'sms' | 'chat' | 'phone';
  senderName: string;
  senderEmail?: string;
  senderPhone?: string;
  subject?: string;
  preview: string;
  fullMessage: string;
  timestamp: string;
  read: boolean;
  leadId?: string;
}

const channelConfig: Record<string, { icon: typeof Mail; color: string; label: string }> = {
  email: { icon: Mail, color: '#4070D0', label: 'Email' },
  sms: { icon: MessageSquare, color: '#1F9B5A', label: 'SMS' },
  chat: { icon: MessageCircle, color: '#8B7CF6', label: 'Chat' },
  phone: { icon: Phone, color: '#C48020', label: 'Phone' },
};


export default function InboxPage() {
  const { organization, user, authEmail } = useOrganization();
  const { messages: fetchedMessages, unreadCount: hookUnreadCount, loading, markAsRead, sendReply } = useInbox(organization?.id);

  // Plan gate: inbox compose is Pro + Enterprise only (super admin override)
  const orgSettings = (organization?.settings as Record<string, unknown>) || {};
  const orgPlan = (orgSettings.plan as string) || null;
  const canCompose = getEffectivePlanLimits(orgPlan, authEmail ?? user?.email).inbox_compose;
  const messages: Message[] = fetchedMessages.map((m) => ({
    id: m.id,
    channel: m.channel === 'form' ? 'email' as const : m.channel,
    senderName: m.lead_name || m.lead_email || 'Unknown',
    senderEmail: m.lead_email,
    subject: m.subject,
    preview: m.body.slice(0, 100),
    fullMessage: m.body,
    timestamp: new Date(m.created_at).toLocaleString(),
    read: m.is_read,
    leadId: m.lead_id,
  }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel>('all');
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replySending, setReplySending] = useState(false);
  const { success: showSuccess } = useToast();

  const replyTemplates = [
    { label: 'Thank you', text: 'Thank you for reaching out! I\'ll get back to you shortly with more details.' },
    { label: 'Schedule call', text: 'I\'d love to discuss this further. Would you be available for a quick call this week?' },
    { label: 'Quote follow-up', text: 'Just following up on the quote I sent. Please let me know if you have any questions.' },
    { label: 'Availability', text: 'Thanks for your inquiry! We have availability next week. What day works best for you?' },
  ];

  const filtered = messages.filter((m) => {
    const channelMatch = activeChannel === 'all' || m.channel === activeChannel;
    const searchMatch = searchQuery === '' ||
      m.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.preview.toLowerCase().includes(searchQuery.toLowerCase());
    return channelMatch && searchMatch;
  });

  const selectedMessage = messages.find((m) => m.id === selectedId);
  const unreadCount = hookUnreadCount;
  const channelCounts = {
    all: messages.filter((m) => !m.read).length,
    email: messages.filter((m) => m.channel === 'email' && !m.read).length,
    sms: messages.filter((m) => m.channel === 'sms' && !m.read).length,
    chat: messages.filter((m) => m.channel === 'chat' && !m.read).length,
    phone: messages.filter((m) => m.channel === 'phone' && !m.read).length,
  };

  const selectMessage = (id: string) => {
    setSelectedId(id);
    markAsRead(id);
  };

  const channels: { key: Channel; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'email', label: 'Email' },
    { key: 'sms', label: 'SMS' },
    { key: 'chat', label: 'Chat' },
    { key: 'phone', label: 'Phone' },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
              Inbox
            </h1>
            {unreadCount > 0 && (
              <Badge variant="accent" size="sm">{unreadCount} new</Badge>
            )}
          </div>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
            All your conversations in one place
          </p>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[var(--od-text-muted)] mt-1">
              <div className="w-3 h-3 border-2 border-[var(--od-accent)] border-t-transparent rounded-full animate-spin" />
              Loading messages...
            </div>
          )}
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6">
        <Card className="overflow-hidden">
          <div className="flex h-[calc(100vh-180px)] min-h-[500px]">
            {/* Left panel - Message list */}
            <div className={`w-full md:w-[380px] border-r border-[var(--od-border-subtle)] flex flex-col ${selectedId ? 'hidden md:flex' : 'flex'}`}>
              {/* Channel tabs */}
              <div data-tour="inbox-tabs" className="flex items-center gap-1 px-3 py-2 border-b border-[var(--od-border-subtle)] overflow-x-auto">
                {channels.map((ch) => (
                  <button
                    key={ch.key}
                    onClick={() => setActiveChannel(ch.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--od-radius-sm)] text-xs font-medium whitespace-nowrap transition-colors ${
                      activeChannel === ch.key
                        ? 'bg-[var(--od-accent-muted)] text-[var(--od-accent-text)]'
                        : 'text-[var(--od-text-tertiary)] hover:text-[var(--od-text-secondary)] hover:bg-[var(--od-bg-tertiary)]'
                    }`}
                  >
                    {ch.label}
                    {channelCounts[ch.key] > 0 && (
                      <span className="flex items-center justify-center min-w-[16px] h-4 rounded-full bg-[var(--od-accent)] text-white text-[10px] font-semibold px-1">
                        {channelCounts[ch.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="p-3 border-b border-[var(--od-border-subtle)]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--od-text-muted)]" />
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>

              {/* Message list */}
              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Inbox className="w-8 h-8 text-[var(--od-text-muted)] mb-3 opacity-40" />
                    <p className="text-sm text-[var(--od-text-muted)]">No messages found</p>
                  </div>
                ) : (
                  filtered.map((msg, i) => {
                    const chConfig = channelConfig[msg.channel];
                    const ChannelIcon = chConfig.icon;
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => selectMessage(msg.id)}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-[var(--od-border-subtle)] transition-colors ${
                          selectedId === msg.id
                            ? 'bg-[var(--od-accent-muted)]'
                            : 'hover:bg-[var(--od-bg-tertiary)]'
                        }`}
                      >
                        {/* Unread dot */}
                        <div className="pt-1.5">
                          <div className={`w-2 h-2 rounded-full ${msg.read ? 'bg-transparent' : 'bg-[var(--od-accent)]'}`} />
                        </div>

                        {/* Channel icon */}
                        <div
                          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                          style={{ backgroundColor: `${chConfig.color}12` }}
                        >
                          <ChannelIcon className="w-3.5 h-3.5" style={{ color: chConfig.color }} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm truncate ${msg.read ? 'text-[var(--od-text-secondary)]' : 'font-semibold text-[var(--od-text-primary)]'}`}>
                              {msg.senderName}
                            </p>
                            <span className="text-[10px] text-[var(--od-text-muted)] whitespace-nowrap ml-2">
                              {msg.timestamp}
                            </span>
                          </div>
                          {msg.subject && (
                            <p className="text-xs text-[var(--od-text-secondary)] truncate">{msg.subject}</p>
                          )}
                          <p className="text-xs text-[var(--od-text-muted)] truncate mt-0.5">{msg.preview}</p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right panel - Message detail */}
            <div className={`flex-1 flex flex-col ${selectedId ? 'flex' : 'hidden md:flex'}`}>
              {selectedMessage ? (
                <>
                  {/* Mobile back button */}
                  <div className="md:hidden px-4 py-2 border-b border-[var(--od-border-subtle)]">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back
                    </Button>
                  </div>

                  {/* Message header */}
                  <div className="px-5 py-4 border-b border-[var(--od-border-subtle)]">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--od-bg-tertiary)]">
                        <User className="w-5 h-5 text-[var(--od-text-muted)]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--od-text-primary)]">
                            {selectedMessage.senderName}
                          </p>
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded-[4px]"
                            style={{
                              backgroundColor: `${channelConfig[selectedMessage.channel].color}12`,
                              color: channelConfig[selectedMessage.channel].color,
                            }}
                          >
                            {channelConfig[selectedMessage.channel].label}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--od-text-muted)]">
                          {selectedMessage.senderEmail || selectedMessage.senderPhone || 'Website chat'}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--od-text-muted)] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {selectedMessage.timestamp}
                      </span>
                    </div>
                    {selectedMessage.subject && (
                      <p className="text-base font-semibold text-[var(--od-text-primary)] mt-3">
                        {selectedMessage.subject}
                      </p>
                    )}
                  </div>

                  {/* Message body */}
                  <div className="flex-1 overflow-y-auto p-5">
                    <div className="bg-[var(--od-bg-tertiary)] rounded-[var(--od-radius-md)] p-4 max-w-lg">
                      <p className="text-sm text-[var(--od-text-secondary)] leading-relaxed whitespace-pre-wrap">
                        {selectedMessage.fullMessage}
                      </p>
                    </div>
                  </div>

                  {/* Reply area — plan-gated */}
                  <div className="border-t border-[var(--od-border-subtle)] p-4 space-y-2">
                    {canCompose ? (
                      <>
                        {/* Quick reply templates */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                          <Zap className="w-3 h-3 text-[var(--od-text-muted)] shrink-0" />
                          {replyTemplates.map((t) => (
                            <button
                              key={t.label}
                              onClick={() => setReplyText(t.text)}
                              className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium bg-[var(--od-bg-tertiary)] text-[var(--od-text-secondary)] hover:bg-[var(--od-accent-muted)] hover:text-[var(--od-accent)] transition-colors"
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type your reply..."
                              rows={2}
                              className="w-full px-3 py-2 text-sm rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-white text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--od-accent)] focus:border-transparent resize-none"
                            />
                          </div>
                          <Button size="sm" disabled={!replyText.trim() || replySending} onClick={async () => {
                            if (!selectedId || !replyText.trim()) return;
                            setReplySending(true);
                            try {
                              await sendReply(selectedId, replyText);
                              setReplyText('');
                              showSuccess('Reply sent');
                            } finally {
                              setReplySending(false);
                            }
                          }}>
                            <Send className="w-3.5 h-3.5" />
                            {replySending ? 'Sending...' : 'Send'}
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 py-2 px-3 rounded-[var(--od-radius-md)] bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)]">
                        <Lock className="w-4 h-4 text-[var(--od-text-muted)] shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-[var(--od-text-secondary)]">
                            Reply from dashboard
                          </p>
                          <p className="text-[10px] text-[var(--od-text-muted)]">
                            Compose and send replies directly from your inbox on the Professional plan.
                          </p>
                        </div>
                        <a
                          href="/dashboard/settings?tab=billing"
                          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-[var(--od-radius-sm)] text-[10px] font-semibold bg-[var(--od-accent)] text-white hover:brightness-110 transition-all"
                        >
                          Upgrade
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Inbox className="w-12 h-12 text-[var(--od-text-muted)] mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-[var(--od-text-muted)]">Select a message to view</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
