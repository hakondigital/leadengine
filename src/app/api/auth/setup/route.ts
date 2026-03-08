import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { auth_id, email, full_name, business_name, industry, notification_email } = body;

    if (!auth_id || !email || !full_name || !business_name || !industry) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Generate slug from business name
    const slug = business_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    const finalSlug = existing ? `${slug}-${Date.now().toString(36)}` : slug;

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: business_name,
        slug: finalSlug,
        industry,
        notification_email: notification_email || email,
      })
      .select()
      .single();

    if (orgError) {
      console.error('Org creation error:', orgError);
      return NextResponse.json({ error: 'Failed to create workspace' }, { status: 500 });
    }

    // Create user profile linked to auth user
    const { error: userError } = await supabase
      .from('users')
      .insert({
        auth_id,
        organization_id: org.id,
        email,
        full_name,
        role: 'owner',
      });

    if (userError) {
      console.error('User creation error:', userError);
      // Clean up the org if user creation fails
      await supabase.from('organizations').delete().eq('id', org.id);
      return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
    }

    // Create a default form config for their industry
    await supabase.from('form_configs').insert({
      organization_id: org.id,
      name: `${business_name} Lead Form`,
      industry_template: industry,
      fields: [],
      steps: [],
      settings: {},
      is_active: true,
    });

    return NextResponse.json({
      success: true,
      organization: { id: org.id, slug: finalSlug },
    }, { status: 201 });
  } catch (error) {
    console.error('Auth setup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
