import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature } from '@/lib/check-plan';

export async function GET() {
  try {
    const authClient = await createServerSupabaseClient();
    const { data: { user: authUser } } = await authClient.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();
    const { data: userProfile } = await supabase
      .from('users')
      .select('organization_id')
      .eq('auth_id', authUser.id)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const exportCheck = await checkFeature(userProfile.organization_id, 'lead_export');
    if (!exportCheck.allowed) {
      return NextResponse.json({ error: 'Lead export is not available on your plan. Upgrade to Professional or Enterprise.' }, { status: 403 });
    }

    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: false });

    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'No leads to export' }, { status: 404 });
    }

    // Build CSV
    const headers = [
      'First Name', 'Last Name', 'Email', 'Phone', 'Company',
      'Service Type', 'Project Type', 'Location', 'Budget Range',
      'Urgency', 'Status', 'Priority', 'AI Score', 'AI Summary',
      'Source', 'Won Value', 'Created At',
    ];

    const escapeCSV = (val: unknown) => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = leads.map((lead) => [
      lead.first_name, lead.last_name, lead.email, lead.phone, lead.company,
      lead.service_type, lead.project_type, lead.location, lead.budget_range,
      lead.urgency, lead.status, lead.priority, lead.ai_score, lead.ai_summary,
      lead.source, lead.won_value, lead.created_at,
    ].map(escapeCSV).join(','));

    const csv = [headers.join(','), ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
