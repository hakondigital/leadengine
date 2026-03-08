import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

// Public endpoint — returns count of completed jobs in a postcode area
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const postcode = searchParams.get('postcode');
    const orgId = searchParams.get('organization_id');

    if (!postcode || !orgId) {
      return NextResponse.json(
        { error: 'postcode and organization_id required' },
        { status: 400 }
      );
    }

    // Count completed portfolio projects in this postcode area
    const { count: projectCount, error: projectError } = await supabase
      .from('portfolio_projects')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('is_published', true)
      .ilike('postcode', `${postcode.substring(0, 2)}%`); // Match first 2 digits for area proximity

    if (projectError) {
      console.error('Social proof query error:', projectError);
      return NextResponse.json({ error: 'Failed to fetch social proof' }, { status: 500 });
    }

    // Count won leads in the area (as additional proof)
    const { count: jobCount, error: jobError } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('status', 'won')
      .ilike('location', `%${postcode}%`);

    if (jobError) {
      console.error('Social proof leads query error:', jobError);
    }

    // Get recent reviews for the area
    const { data: reviews, error: reviewError } = await supabase
      .from('reviews')
      .select('rating, reviewer_name, title, created_at')
      .eq('organization_id', orgId)
      .eq('status', 'approved')
      .gte('rating', 4)
      .order('created_at', { ascending: false })
      .limit(3);

    if (reviewError) {
      console.error('Social proof reviews query error:', reviewError);
    }

    const totalJobs = (projectCount || 0) + (jobCount || 0);

    return NextResponse.json({
      postcode,
      jobs_completed: totalJobs,
      portfolio_projects: projectCount || 0,
      recent_reviews: reviews || [],
      message: totalJobs > 0
        ? `We've completed ${totalJobs} job${totalJobs > 1 ? 's' : ''} in your area!`
        : 'We service your area!',
    });
  } catch (error) {
    console.error('Social proof error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
