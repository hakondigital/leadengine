import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);

    const orgId = searchParams.get('organization_id');
    const status = searchParams.get('status') || 'pending';

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { data: duplicates, error } = await supabase
      .from('duplicate_flags')
      .select('*, lead_a:leads!duplicate_flags_lead_a_id_fkey(*), lead_b:leads!duplicate_flags_lead_b_id_fkey(*)')
      .eq('organization_id', orgId)
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Duplicates fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch duplicates' }, { status: 500 });
    }

    return NextResponse.json({ duplicates });
  } catch (error) {
    console.error('Duplicates fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Check a lead for duplicates
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead_id, organization_id, email, phone, first_name, last_name, location } = body;

    if (!organization_id) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    const duplicates: Record<string, unknown>[] = [];

    // Match by email (exact)
    if (email) {
      const { data: emailMatches } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone, location, created_at')
        .eq('organization_id', organization_id)
        .eq('email', email)
        .neq('id', lead_id || '');

      if (emailMatches && emailMatches.length > 0) {
        emailMatches.forEach((match: Record<string, unknown>) => {
          duplicates.push({ ...match, match_type: 'email', confidence: 'high' });
        });
      }
    }

    // Match by phone (normalized)
    if (phone) {
      const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
      const { data: phoneMatches } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone, location, created_at')
        .eq('organization_id', organization_id)
        .neq('id', lead_id || '')
        .not('phone', 'is', null);

      if (phoneMatches) {
        const phoneHits = phoneMatches.filter((l: Record<string, unknown>) => {
          const lPhone = (l.phone as string || '').replace(/\D/g, '').slice(-10);
          return lPhone === normalizedPhone && lPhone.length > 0;
        });

        phoneHits.forEach((match: Record<string, unknown>) => {
          // Avoid adding if already found via email
          if (!duplicates.some((d) => d.id === match.id)) {
            duplicates.push({ ...match, match_type: 'phone', confidence: 'high' });
          }
        });
      }
    }

    // Match by name + location (fuzzy)
    if (first_name && last_name) {
      const { data: nameMatches } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone, location, created_at')
        .eq('organization_id', organization_id)
        .ilike('first_name', first_name)
        .ilike('last_name', last_name)
        .neq('id', lead_id || '');

      if (nameMatches && nameMatches.length > 0) {
        nameMatches.forEach((match: Record<string, unknown>) => {
          if (!duplicates.some((d) => d.id === match.id)) {
            const locationMatch = location && match.location &&
              (match.location as string).toLowerCase().includes(location.toLowerCase());
            duplicates.push({
              ...match,
              match_type: 'name' + (locationMatch ? '+location' : ''),
              confidence: locationMatch ? 'high' : 'medium',
            });
          }
        });
      }
    }

    // Auto-flag duplicates if found and lead_id provided
    if (duplicates.length > 0 && lead_id) {
      for (const dup of duplicates) {
        // Check if flag already exists
        const { data: existing } = await supabase
          .from('duplicate_flags')
          .select('id')
          .or(`and(lead_a_id.eq.${lead_id},lead_b_id.eq.${dup.id}),and(lead_a_id.eq.${dup.id},lead_b_id.eq.${lead_id})`)
          .single();

        if (!existing) {
          await supabase.from('duplicate_flags').insert({
            organization_id,
            lead_a_id: lead_id,
            lead_b_id: dup.id,
            match_type: dup.match_type,
            confidence: dup.confidence,
            status: 'pending',
          });
        }
      }
    }

    return NextResponse.json({
      has_duplicates: duplicates.length > 0,
      duplicates,
      count: duplicates.length,
    });
  } catch (error) {
    console.error('Duplicate check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
