import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const isPublic = searchParams.get('public') === 'true';
    const serviceType = searchParams.get('service_type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    let query = supabase
      .from('portfolio_projects')
      .select('*', { count: 'exact' })
      .eq('organization_id', orgId)
      .order('completed_at', { ascending: false });

    // Public requests only see published projects
    if (isPublic) {
      query = query.eq('is_published', true);
    }

    if (serviceType) query = query.eq('service_type', serviceType);

    query = query.range((page - 1) * limit, page * limit - 1);

    const { data: projects, count, error } = await query;

    if (error) {
      console.error('Portfolio fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
    }

    return NextResponse.json({
      projects,
      total: count,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error) {
    console.error('Portfolio fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      organization_id,
      title,
      description,
      service_type,
      location,
      postcode,
      images,
      before_images,
      after_images,
      client_name,
      client_testimonial,
      completed_at,
      project_value,
      is_published,
    } = body;

    if (!organization_id || !title) {
      return NextResponse.json(
        { error: 'organization_id and title required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    const { data: project, error } = await supabase
      .from('portfolio_projects')
      .insert({
        organization_id,
        title,
        description: description || null,
        service_type: service_type || null,
        location: location || null,
        postcode: postcode || null,
        images: images || [],
        before_images: before_images || [],
        after_images: after_images || [],
        client_name: client_name || null,
        client_testimonial: client_testimonial || null,
        completed_at: completed_at || new Date().toISOString(),
        project_value: project_value || null,
        is_published: is_published ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error('Portfolio project create error:', error);
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Portfolio project create error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
