import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';

// Jobs are derived from won leads — they track post-sale project stages.
// We use the leads table filtered by status='won' and store job-specific
// data in a lightweight jobs table.

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('organization_id');
    const stage = searchParams.get('stage');

    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { unauthorized } = await requireCallerOwnsOrg(orgId);
    if (unauthorized) return unauthorized;

    // Get won leads with their job data
    let query = supabase
      .from('leads')
      .select('*')
      .eq('organization_id', orgId)
      .eq('status', 'won')
      .order('won_date', { ascending: false });

    // Filter by job stage stored in custom_fields.job_stage
    // We use custom_fields to avoid a schema migration
    if (stage && stage !== 'all') {
      query = query.contains('custom_fields', { job_stage: stage });
    }

    const { data: leads, error } = await query;

    if (error) {
      console.error('Jobs fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Map leads to job format
    const jobs = (leads || []).map((lead: Record<string, unknown>) => {
      const custom = (lead.custom_fields as Record<string, unknown>) || {};
      return {
        id: lead.id,
        lead_id: lead.id,
        client_name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
        email: lead.email,
        phone: lead.phone,
        service_type: lead.service_type,
        won_value: lead.won_value,
        won_date: lead.won_date,
        stage: (custom.job_stage as string) || 'planning',
        checklist: (custom.job_checklist as Record<string, boolean>[]) || [],
        notes: (custom.job_notes as string) || '',
        target_completion: (custom.job_target_date as string) || null,
        assigned_to: lead.assigned_to,
      };
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Jobs fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead_id, organization_id, stage, checklist, notes, target_completion } = body;

    if (!lead_id || !organization_id) {
      return NextResponse.json({ error: 'lead_id and organization_id required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Get current custom_fields and verify org ownership
    const { data: lead } = await supabase
      .from('leads')
      .select('custom_fields, organization_id')
      .eq('id', lead_id)
      .single();

    if (!lead) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (lead.organization_id !== organization_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingCustom = (lead?.custom_fields as Record<string, unknown>) || {};

    // Merge job data into custom_fields
    const updatedCustom = {
      ...existingCustom,
      ...(stage !== undefined && { job_stage: stage }),
      ...(checklist !== undefined && { job_checklist: checklist }),
      ...(notes !== undefined && { job_notes: notes }),
      ...(target_completion !== undefined && { job_target_date: target_completion }),
    };

    const { data: updated, error } = await supabase
      .from('leads')
      .update({ custom_fields: updatedCustom })
      .eq('id', lead_id)
      .select()
      .single();

    if (error) {
      console.error('Job update error:', error);
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }

    // Log stage change
    if (stage) {
      await supabase.from('lead_notes').insert({
        lead_id,
        content: `Job stage updated to: ${stage.replace(/_/g, ' ')}`,
        is_system: true,
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Job update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
