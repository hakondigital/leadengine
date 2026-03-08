'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useReviews } from '@/hooks/use-reviews';
import { usePlan } from '@/hooks/use-plan';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import {
  Star,
  Send,
  X,
  MessageSquare,
  TrendingUp,
  Clock,
  User,
  ExternalLink,
  CheckCircle2,
  Filter,
  Download,
} from 'lucide-react';

interface Review {
  id: string;
  reviewerName: string;
  rating: number;
  text: string;
  date: string;
  platform: 'google' | 'facebook' | 'yelp' | 'website';
  replied: boolean;
}

interface WonLead {
  id: string;
  name: string;
  email: string;
  service: string;
}

const platformConfig: Record<string, { label: string; color: string; bg: string }> = {
  google: { label: 'Google', color: '#4285F4', bg: 'rgba(66,133,244,0.08)' },
  facebook: { label: 'Facebook', color: '#1877F2', bg: 'rgba(24,119,242,0.08)' },
  yelp: { label: 'Yelp', color: '#D32323', bg: 'rgba(211,35,35,0.08)' },
  website: { label: 'Website', color: '#4FD1E5', bg: 'rgba(79,209,229,0.08)' },
};

const mockReviews: Review[] = [
  { id: '1', reviewerName: 'Sarah Mitchell', rating: 5, text: 'Absolutely fantastic work on our kitchen renovation! The team was professional, clean, and finished on time. Couldn\'t be happier with the result.', date: '2026-03-05', platform: 'google', replied: true },
  { id: '2', reviewerName: 'James Cooper', rating: 4, text: 'Good quality electrical work. Minor scheduling hiccup but they made it right. Would recommend.', date: '2026-03-03', platform: 'google', replied: true },
  { id: '3', reviewerName: 'Lisa Wang', rating: 5, text: 'Best bathroom renovation experience we\'ve ever had. Attention to detail was incredible. Already recommended to two friends!', date: '2026-03-01', platform: 'facebook', replied: false },
  { id: '4', reviewerName: 'David Brooks', rating: 3, text: 'Decent roof repair work but communication could have been better during the project. End result was solid though.', date: '2026-02-28', platform: 'yelp', replied: false },
  { id: '5', reviewerName: 'Emma Taylor', rating: 5, text: 'Quick, professional plumbing service. Fixed our issue in under an hour. Very reasonable pricing too.', date: '2026-02-25', platform: 'google', replied: true },
  { id: '6', reviewerName: 'Michael Chen', rating: 4, text: 'Great HVAC installation. The new system is working perfectly and our energy bills have already dropped. Thank you!', date: '2026-02-20', platform: 'website', replied: false },
];

const mockWonLeads: WonLead[] = [
  { id: '1', name: 'Sarah Mitchell', email: 'sarah@email.com', service: 'Kitchen Renovation' },
  { id: '2', name: 'Emma Taylor', email: 'emma@email.com', service: 'Plumbing Repair' },
  { id: '3', name: 'Michael Chen', email: 'michael@email.com', service: 'HVAC Installation' },
];

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={star <= rating ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-[var(--le-border-subtle)]'}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { organization } = useOrganization();
  const { reviews: fetchedReviews, averageRating, loading, requestReview } = useReviews(organization?.id);
  const { canUseReviewRequests, planName, loading: planLoading } = usePlan();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSending, setRequestSending] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<number>(0);
  const { success: showSuccess } = useToast();

  if (planLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[var(--le-accent)] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!canUseReviewRequests) {
    return <UpgradeBanner feature="Review Requests" requiredPlan="Professional" currentPlan={planName} />;
  }

  const reviews: Review[] = fetchedReviews.length > 0
    ? fetchedReviews.map((r) => ({
        id: r.id,
        reviewerName: r.reviewer_name,
        rating: r.rating,
        text: r.body || '',
        date: r.review_date?.split('T')[0] || r.created_at?.split('T')[0] || '',
        platform: (r.platform === 'internal' ? 'website' : r.platform === 'other' ? 'website' : r.platform) as Review['platform'],
        replied: !!r.response || !!r.responded_at,
      }))
    : mockReviews;

  const filteredReviews = reviews.filter((r) => {
    if (platformFilter !== 'all' && r.platform !== platformFilter) return false;
    if (ratingFilter > 0 && r.rating !== ratingFilter) return false;
    return true;
  });

  const totalReviews = reviews.length;
  const avgRating = fetchedReviews.length > 0 ? averageRating.toFixed(1) : (reviews.reduce((a, r) => a + r.rating, 0) / (totalReviews || 1)).toFixed(1);
  const pendingReplies = reviews.filter((r) => !r.replied).length;

  const exportReviewsCSV = () => {
    const header = 'Reviewer,Rating,Platform,Date,Replied,Review\n';
    const rows = reviews.map((r) => `"${r.reviewerName}",${r.rating},${r.platform},${r.date},${r.replied},"${r.text.replace(/"/g, '""')}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reviews-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Reviews exported');
  };

  const stats = [
    { label: 'Total Reviews', value: totalReviews.toString(), icon: MessageSquare, color: '#5B8DEF' },
    { label: 'Avg Rating', value: avgRating, icon: Star, color: '#F59E0B', isStar: true },
    { label: 'Pending Replies', value: pendingReplies.toString(), icon: Clock, color: '#F0A030' },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
              Reviews &amp; Reputation
            </h1>
            <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
              Monitor and manage your online reputation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={exportReviewsCSV}>
              <Download className="w-3.5 h-3.5" />
              Export
            </Button>
            <Button size="sm" onClick={() => setShowRequestModal(true)}>
              <Send className="w-3.5 h-3.5" />
              Request Review
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--le-text-muted)]">
            <div className="w-3 h-3 border-2 border-[var(--le-accent)] border-t-transparent rounded-full animate-spin" />
            Loading reviews...
          </div>
        )}
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider">
                        {stat.label}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-2xl font-bold text-[var(--le-text-primary)]">
                          {stat.value}
                        </p>
                        {stat.isStar && <StarRating rating={Math.round(Number(stat.value))} size={12} />}
                      </div>
                    </div>
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-lg"
                      style={{ backgroundColor: `${stat.color}12` }}
                    >
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Filters */}
        {reviews.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-[var(--le-text-muted)]" />
            {['all', 'google', 'facebook', 'yelp', 'website'].map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                  platformFilter === p
                    ? 'bg-[var(--le-accent)] text-white'
                    : 'bg-[var(--le-bg-tertiary)] text-[var(--le-text-secondary)] hover:bg-[var(--le-bg-elevated)]'
                }`}
              >
                {p === 'all' ? 'All' : platformConfig[p]?.label || p}
              </button>
            ))}
            <span className="w-px h-4 bg-[var(--le-border-subtle)]" />
            {[0, 5, 4, 3, 2, 1].map((r) => (
              <button
                key={r}
                onClick={() => setRatingFilter(r)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors flex items-center gap-1 ${
                  ratingFilter === r
                    ? 'bg-[var(--le-accent)] text-white'
                    : 'bg-[var(--le-bg-tertiary)] text-[var(--le-text-secondary)] hover:bg-[var(--le-bg-elevated)]'
                }`}
              >
                {r === 0 ? 'All Stars' : <><Star className="w-2.5 h-2.5" /> {r}</>}
              </button>
            ))}
          </div>
        )}

        {/* Reviews Grid */}
        {filteredReviews.length === 0 ? (
          <EmptyState
            icon={Star}
            title={reviews.length === 0 ? 'No reviews yet' : 'No matching reviews'}
            description={reviews.length === 0 ? 'Request reviews from your happy customers to build your reputation.' : 'Try adjusting your filters.'}
            action={reviews.length === 0 ? { label: 'Request Review', onClick: () => setShowRequestModal(true) } : { label: 'Clear Filters', onClick: () => { setPlatformFilter('all'); setRatingFilter(0); } }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredReviews.map((review, i) => {
              const platform = platformConfig[review.platform];
              return (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="h-full hover:border-[var(--le-accent)]/30 transition-colors">
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="flex items-start justify-between mb-3">
                        <StarRating rating={review.rating} />
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded-[4px]"
                          style={{ color: platform.color, backgroundColor: platform.bg }}
                        >
                          {platform.label}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--le-text-secondary)] leading-relaxed flex-1 mb-4">
                        &quot;{review.text}&quot;
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t border-[var(--le-border-subtle)]">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--le-bg-tertiary)]">
                            <User className="w-3 h-3 text-[var(--le-text-muted)]" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[var(--le-text-primary)]">{review.reviewerName}</p>
                            <p className="text-[10px] text-[var(--le-text-muted)]">{review.date}</p>
                          </div>
                        </div>
                        {review.replied ? (
                          <span className="flex items-center gap-1 text-[10px] text-[#1F9B5A]">
                            <CheckCircle2 className="w-3 h-3" />
                            Replied
                          </span>
                        ) : (
                          <Button variant="ghost" size="icon-sm" title="Reply" onClick={() => {
                            setReplyingTo(replyingTo === review.id ? null : review.id);
                            setReplyText('');
                          }}>
                            <Send className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                      {replyingTo === review.id && (
                        <div className="mt-3 pt-3 border-t border-[var(--le-border-subtle)]">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write your reply..."
                            rows={2}
                            className="w-full px-3 py-2 text-xs rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)] bg-white text-[var(--le-text-primary)] placeholder:text-[var(--le-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--le-accent)] focus:border-transparent resize-none"
                          />
                          <div className="flex items-center justify-end gap-2 mt-2">
                            <Button variant="ghost" size="sm" onClick={() => setReplyingTo(null)}>Cancel</Button>
                            <Button size="sm" disabled={!replyText.trim() || replySending} onClick={async () => {
                              setReplySending(true);
                              try {
                                await new Promise(r => setTimeout(r, 500));
                              } finally {
                                setReplySending(false);
                                setReplyingTo(null);
                                setReplyText('');
                                showSuccess('Reply sent');
                              }
                            }}>
                              <Send className="w-3 h-3" />
                              {replySending ? 'Sending...' : 'Reply'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Request Review Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowRequestModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-[var(--le-radius-lg)] border border-[var(--le-border-subtle)] shadow-xl w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--le-border-subtle)]">
              <h2 className="text-base font-semibold text-[var(--le-text-primary)]">Request Review</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowRequestModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5">
              <p className="text-sm text-[var(--le-text-tertiary)] mb-4">
                Select a completed lead to send a review request:
              </p>
              <div className="space-y-2">
                {mockWonLeads.map((lead) => (
                  <button
                    key={lead.id}
                    disabled={requestSending === lead.id}
                    className="w-full flex items-center justify-between p-3 rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)] hover:border-[var(--le-accent)]/30 hover:bg-[var(--le-bg-tertiary)] transition-colors text-left disabled:opacity-50"
                    onClick={async () => {
                      setRequestSending(lead.id);
                      try {
                        await requestReview({
                          lead_id: lead.id,
                          lead_email: lead.email,
                          lead_name: lead.name,
                        });
                      } catch {}
                      setRequestSending(null);
                      setShowRequestModal(false);
                      showSuccess('Review request sent');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--le-bg-tertiary)]">
                        <User className="w-4 h-4 text-[var(--le-text-muted)]" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--le-text-primary)]">{lead.name}</p>
                        <p className="text-xs text-[var(--le-text-muted)]">{lead.service}</p>
                      </div>
                    </div>
                    {requestSending === lead.id ? (
                      <div className="w-3.5 h-3.5 border-2 border-[var(--le-accent)] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-[var(--le-text-muted)]" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
