import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead_id, organization_id } = body;

    if (!lead_id || !organization_id) {
      return NextResponse.json({ error: 'lead_id and organization_id required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Get the lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Verify lead belongs to the requested org
    if (lead.organization_id !== organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get active assignment rules for this org, ordered by priority
    const { data: rules, error: rulesError } = await supabase
      .from('assignment_rules')
      .select('*')
      .eq('organization_id', lead.organization_id)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (rulesError || !rules || rules.length === 0) {
      return NextResponse.json({
        assigned: false,
        message: 'No assignment rules configured',
      });
    }

    let assignedTo: string | null = null;
    let matchedRule: string | null = null;

    for (const rule of rules) {
      const criteria = rule.criteria || {};

      if (rule.type === 'service_type') {
        // Match by service type
        const serviceTypes: string[] = criteria.service_types || [];
        if (lead.service_type && serviceTypes.some((st: string) =>
          st.toLowerCase() === lead.service_type?.toLowerCase()
        )) {
          assignedTo = rule.assigned_to;
          matchedRule = rule.name;
          break;
        }
      } else if (rule.type === 'location') {
        // Match by location/postcode
        const postcodes: string[] = criteria.postcodes || [];
        const locations: string[] = criteria.locations || [];

        if (lead.location) {
          const locationMatch = locations.some((loc: string) =>
            lead.location?.toLowerCase().includes(loc.toLowerCase())
          );
          if (locationMatch) {
            assignedTo = rule.assigned_to;
            matchedRule = rule.name;
            break;
          }
        }

        // Check postcode in location string
        if (postcodes.length > 0 && lead.location) {
          const postcodeMatch = postcodes.some((pc: string) =>
            lead.location?.includes(pc)
          );
          if (postcodeMatch) {
            assignedTo = rule.assigned_to;
            matchedRule = rule.name;
            break;
          }
        }
      } else if (rule.type === 'round_robin') {
        // Round-robin: get team members and find who has fewest active leads
        const teamMembers: string[] = criteria.team_members || [rule.assigned_to];

        // Count active leads per team member
        const counts: { member: string; count: number }[] = [];
        for (const member of teamMembers) {
          const { count } = await supabase
            .from('leads')
            .select('*', { count: 'exact', head: true })
            .eq('organization_id', lead.organization_id)
            .eq('assigned_to', member)
            .in('status', ['new', 'contacted', 'qualified', 'proposal']);

          counts.push({ member, count: count || 0 });
        }

        // Assign to person with fewest leads
        counts.sort((a, b) => a.count - b.count);
        assignedTo = counts[0]?.member || null;
        matchedRule = rule.name;
        break;
      }
    }

    if (assignedTo) {
      // Update lead with assignment
      await supabase
        .from('leads')
        .update({ assigned_to: assignedTo })
        .eq('id', lead_id);

      // Add system note
      await supabase.from('lead_notes').insert({
        lead_id,
        content: `Auto-assigned to ${assignedTo} via rule: ${matchedRule}`,
        is_system: true,
      });

      return NextResponse.json({
        assigned: true,
        assigned_to: assignedTo,
        rule: matchedRule,
      });
    }

    return NextResponse.json({
      assigned: false,
      message: 'No matching assignment rules for this lead',
    });
  } catch (error) {
    console.error('Auto-assign error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
