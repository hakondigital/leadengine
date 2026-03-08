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

const mockMessages: Message[] = [
  {
    id: '1', channel: 'email', senderName: 'Sarah Mitchell', senderEmail: 'sarah@email.com',
    subject: 'Re: Kitchen Renovation Quote',
    preview: 'Thanks for the quote! I had a few questions about the timeline...',
    fullMessage: 'Thanks for the quote! I had a few questions about the timeline and materials. When would you be able to start the project? Also, could you clarify the warranty terms for the countertops? Looking forward to hearing from you.',
    timestamp: '10 min ago', read: false,
  },
  {
    id: '2', channel: 'sms', senderName: 'James Cooper', senderPhone: '+61 412 345 678',
    preview: 'Hey, can we reschedule to Thursday instead?',
    fullMessage: 'Hey, can we reschedule to Thursday instead? Something came up with work on Wednesday. Let me know if 2pm works.',
    timestamp: '25 min ago', read: false,
  },
  {
    id: '3', channel: 'chat', senderName: 'Lisa Wang',
    preview: 'I saw your website and I\'m interested in getting a bathroom remodel...',
    fullMessage: 'I saw your website and I\'m interested in getting a bathroom remodel done. Our bathroom is about 8sqm and we\'re looking for a complete renovation including new tiles, vanity, and shower screen. Could you give me a rough estimate? When would you be available to come take a look?',
    timestamp: '1 hour ago', read: false,
  },
  {
    id: '4', channel: 'email', senderName: 'David Brooks', senderEmail: 'david.b@email.com',
    subject: 'Roof Inspection Follow-up',
    preview: 'Just wanted to follow up on the roof inspection we discussed...',
    fullMessage: 'Just wanted to follow up on the roof inspection we discussed last week. I noticed a few more tiles that seem loose after the recent storm. Would you be able to come take another look? Happy to adjust the quote if needed.',
    timestamp: '2 hours ago', read: true,
  },
  {
    id: '5', channel: 'phone', senderName: 'Emma Taylor', senderPhone: '+61 498 765 432',
    preview: 'Missed call - Voicemail: "Hi, calling about the plumbing estimate..."',
    fullMessage: 'Missed call with voicemail: "Hi, this is Emma Taylor calling about the plumbing estimate you sent through. The price looks great, I just wanted to confirm the start date. Can you give me a call back when you get a chance? Thanks!"',
    timestamp: '3 hours ago', read: true,
  },
  {
    id: '6', channel: 'sms', senderName: 'Michael Chen', senderPhone: '+61 455 123 789',
    preview: 'Sounds good, see you Monday at 9:30.',
    fullMessage: 'Sounds good, see you Monday at 9:30. I\'ll make sure the garage is cleared so you can access the electrical panel.',
    timestamp: '5 hours ago', read: true,
  },
  {
    id: '7', channel: 'email', senderName: 'Anna Kowalski', senderEmail: 'anna.k@email.com',
    subject: 'New enquiry from website',
    preview: 'Hi, I\'m looking for someone to do a full house paint...',
    fullMessage: 'Hi, I\'m looking for someone to do a full house paint - interior and exterior. The house is a 4-bedroom, double storey in Neutral Bay. We\'re hoping to get it done before Easter. Could you provide a quote? Happy to send through some photos if that helps.',
    timestamp: 'Yesterday', read: true,
  },
];

export default function InboxPage() {
  const { organization } = useOrganization();
  const { messages: fetchedMessages, unreadCount: hookUnreadCount, loading, markAsRead, sendReply } = useInbox(organization?.id);
  const [localMessages, setLocalMessages] = useState(mockMessages);
  const messages: Message[] = fetchedMessages.length > 0
    ? fetchedMessages.map((m) => ({
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
      }))
    : localMessages;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel>('all');
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replySending, setReplySending] = useState(false);

  const filtered = messages.filter((m) => {
    const channelMatch = activeChannel === 'all' || m.channel === activeChannel;
    const searchMatch = searchQuery === '' ||
      m.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.preview.toLowerCase().includes(searchQuery.toLowerCase());
    return channelMatch && searchMatch;
  });

  const selectedMessage = messages.find((m) => m.id === selectedId);
  const unreadCount = fetchedMessages.length > 0 ? hookUnreadCount : messages.filter((m) => !m.read).length;
  const channelCounts = {
    all: messages.filter((m) => !m.read).length,
    email: messages.filter((m) => m.channel === 'email' && !m.read).length,
    sms: messages.filter((m) => m.channel === 'sms' && !m.read).length,
    chat: messages.filter((m) => m.channel === 'chat' && !m.read).length,
    phone: messages.filter((m) => m.channel === 'phone' && !m.read).length,
  };

  const selectMessage = (id: string) => {
    setSelectedId(id);
    if (fetchedMessages.length > 0) {
      markAsRead(id);
    } else {
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, read: true } : m))
      );
    }
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
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
              Inbox
            </h1>
            {unreadCount > 0 && (
              <Badge variant="accent" size="sm">{unreadCount} new</Badge>
            )}
          </div>
          <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
            All your conversations in one place
          </p>
          {loading && (
            <div className="flex items-center gap-2 text-xs text-[var(--le-text-muted)] mt-1">
              <div className="w-3 h-3 border-2 border-[var(--le-accent)] border-t-transparent rounded-full animate-spin" />
              Loading messages...
            </div>
          )}
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6">
        <Card className="overflow-hidden">
          <div className="flex h-[calc(100vh-180px)] min-h-[500px]">
            {/* Left panel - Message list */}
            <div className={`w-full md:w-[380px] border-r border-[var(--le-border-subtle)] flex flex-col ${selectedId ? 'hidden md:flex' : 'flex'}`}>
              {/* Channel tabs */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--le-border-subtle)] overflow-x-auto">
                {channels.map((ch) => (
                  <button
                    key={ch.key}
                    onClick={() => setActiveChannel(ch.key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--le-radius-sm)] text-xs font-medium whitespace-nowrap transition-colors ${
                      activeChannel === ch.key
                        ? 'bg-[var(--le-accent-muted)] text-[var(--le-accent-text)]'
                        : 'text-[var(--le-text-tertiary)] hover:text-[var(--le-text-secondary)] hover:bg-[var(--le-bg-tertiary)]'
                    }`}
                  >
                    {ch.label}
                    {channelCounts[ch.key] > 0 && (
                      <span className="flex items-center justify-center min-w-[16px] h-4 rounded-full bg-[var(--le-accent)] text-white text-[10px] font-semibold px-1">
                        {channelCounts[ch.key]}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="p-3 border-b border-[var(--le-border-subtle)]">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--le-text-muted)]" />
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
                    <Inbox className="w-8 h-8 text-[var(--le-text-muted)] mb-3 opacity-40" />
                    <p className="text-sm text-[var(--le-text-muted)]">No messages found</p>
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
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-[var(--le-border-subtle)] transition-colors ${
                          selectedId === msg.id
                            ? 'bg-[var(--le-accent-muted)]'
                            : 'hover:bg-[var(--le-bg-tertiary)]'
                        }`}
                      >
                        {/* Unread dot */}
                        <div className="pt-1.5">
                          <div className={`w-2 h-2 rounded-full ${msg.read ? 'bg-transparent' : 'bg-[var(--le-accent)]'}`} />
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
                            <p className={`text-sm truncate ${msg.read ? 'text-[var(--le-text-secondary)]' : 'font-semibold text-[var(--le-text-primary)]'}`}>
                              {msg.senderName}
                            </p>
                            <span className="text-[10px] text-[var(--le-text-muted)] whitespace-nowrap ml-2">
                              {msg.timestamp}
                            </span>
                          </div>
                          {msg.subject && (
                            <p className="text-xs text-[var(--le-text-secondary)] truncate">{msg.subject}</p>
                          )}
                          <p className="text-xs text-[var(--le-text-muted)] truncate mt-0.5">{msg.preview}</p>
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
                  <div className="md:hidden px-4 py-2 border-b border-[var(--le-border-subtle)]">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back
                    </Button>
                  </div>

                  {/* Message header */}
                  <div className="px-5 py-4 border-b border-[var(--le-border-subtle)]">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--le-bg-tertiary)]">
                        <User className="w-5 h-5 text-[var(--le-text-muted)]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-[var(--le-text-primary)]">
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
                        <p className="text-xs text-[var(--le-text-muted)]">
                          {selectedMessage.senderEmail || selectedMessage.senderPhone || 'Website chat'}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--le-text-muted)] flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {selectedMessage.timestamp}
                      </span>
                    </div>
                    {selectedMessage.subject && (
                      <p className="text-base font-semibold text-[var(--le-text-primary)] mt-3">
                        {selectedMessage.subject}
                      </p>
                    )}
                  </div>

                  {/* Message body */}
                  <div className="flex-1 overflow-y-auto p-5">
                    <div className="bg-[var(--le-bg-tertiary)] rounded-[var(--le-radius-md)] p-4 max-w-lg">
                      <p className="text-sm text-[var(--le-text-secondary)] leading-relaxed whitespace-pre-wrap">
                        {selectedMessage.fullMessage}
                      </p>
                    </div>
                  </div>

                  {/* Reply area */}
                  <div className="border-t border-[var(--le-border-subtle)] p-4">
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Type your reply..."
                          rows={2}
                          className="w-full px-3 py-2 text-sm rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)] bg-white text-[var(--le-text-primary)] placeholder:text-[var(--le-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--le-accent)] focus:border-transparent resize-none"
                        />
                      </div>
                      <Button size="sm" disabled={!replyText.trim() || replySending} onClick={async () => {
                        if (!selectedId || !replyText.trim()) return;
                        setReplySending(true);
                        try {
                          if (fetchedMessages.length > 0) {
                            await sendReply(selectedId, replyText);
                          }
                          setReplyText('');
                        } finally {
                          setReplySending(false);
                        }
                      }}>
                        <Send className="w-3.5 h-3.5" />
                        {replySending ? 'Sending...' : 'Send'}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Inbox className="w-12 h-12 text-[var(--le-text-muted)] mx-auto mb-3 opacity-30" />
                    <p className="text-sm text-[var(--le-text-muted)]">Select a message to view</p>
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
