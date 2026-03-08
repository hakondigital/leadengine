'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Review {
  id: string;
  organization_id: string;
  lead_id?: string;
  lead_name?: string;
  reviewer_name: string;
  reviewer_email?: string;
  platform: 'google' | 'yelp' | 'facebook' | 'internal' | 'other';
  rating: number;
  title?: string;
  body?: string;
  status: 'pending' | 'approved' | 'rejected' | 'published';
  response?: string;
  responded_at?: string;
  review_date: string;
  created_at: string;
}

interface ReviewsState {
  reviews: Review[];
  averageRating: number;
  loading: boolean;
  error: string | null;
}

export function useReviews(organizationId: string | undefined) {
  const [state, setState] = useState<ReviewsState>({
    reviews: [],
    averageRating: 0,
    loading: true,
    error: null,
  });

  const fetchReviews = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    try {
      const res = await fetch(`/api/reviews?organization_id=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      const data = await res.json();
      const reviews: Review[] = data.reviews || [];
      const averageRating =
        reviews.length > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
          : 0;
      setState({ reviews, averageRating: Math.round(averageRating * 10) / 10, loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const requestReview = useCallback(async (request: {
    lead_id: string;
    lead_email: string;
    lead_name: string;
    message?: string;
    channels?: string[];
    custom_subject?: string;
    custom_email_body?: string;
    custom_sms_body?: string;
  }) => {
    if (!organizationId) return null;

    const res = await fetch('/api/reviews/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, organization_id: organizationId }),
    });

    if (res.ok) {
      return await res.json();
    }
    return null;
  }, [organizationId]);

  const approveReview = useCallback(async (reviewId: string) => {
    const res = await fetch(`/api/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    });

    if (res.ok) {
      const updated = await res.json();
      setState((s) => ({
        ...s,
        reviews: s.reviews.map((r) =>
          r.id === reviewId ? { ...r, status: 'approved' as const, ...updated } : r
        ),
      }));
      return updated;
    }
    return null;
  }, []);

  return {
    ...state,
    refetch: fetchReviews,
    requestReview,
    approveReview,
  };
}
