import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const minRating = searchParams.get('min_rating');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    let query = supabase
      .from('reviews')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (minRating) query = query.gte('rating', parseInt(minRating));
    if (status) query = query.eq('status', status);

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: reviews, count, error } = await query;

    if (error) {
      console.error('Reviews fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
    }

    // Calculate average rating
    const { data: avgData } = await supabase
      .from('reviews')
      .select('rating')
      .eq('organization_id', orgId)
      .eq('status', 'approved');

    const avgRating = avgData && avgData.length > 0
      ? avgData.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / avgData.length
      : 0;

    return NextResponse.json({
      reviews,
      total: count,
      average_rating: Math.round(avgRating * 10) / 10,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Reviews fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Reply to a review
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { review_id, response } = body;

    if (!review_id || !response) {
      return NextResponse.json(
        { error: 'review_id and response required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    const { data: review, error } = await supabase
      .from('reviews')
      .update({
        response,
        responded_at: new Date().toISOString(),
      })
      .eq('id', review_id)
      .select()
      .single();

    if (error) {
      console.error('Review reply error:', error);
      return NextResponse.json({ error: 'Failed to save reply' }, { status: 500 });
    }

    return NextResponse.json(review);
  } catch (error) {
    console.error('Review reply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Public endpoint for submitting a review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      lead_id,
      reviewer_name,
      reviewer_email,
      rating,
      title,
      content,
      service_type,
    } = body;

    if (!organization_id || !reviewer_name || !rating) {
      return NextResponse.json(
        { error: 'organization_id, reviewer_name, and rating required' },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    const { data: review, error } = await supabase
      .from('reviews')
      .insert({
        organization_id,
        lead_id: lead_id || null,
        reviewer_name,
        reviewer_email: reviewer_email || null,
        rating,
        title: title || null,
        content: content || null,
        service_type: service_type || null,
        status: 'pending', // Requires approval before display
      })
      .select()
      .single();

    if (error) {
      console.error('Review create error:', error);
      return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
    }

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Review create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
