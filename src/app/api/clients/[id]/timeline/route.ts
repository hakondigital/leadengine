import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';

interface TimelineEntry {
  id: string;
  type: 'activity' | 'inbox_message' | 'email' | 'sms';
  date: string;
  summary: string;
  data: Record<string, unknown>;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createServiceRoleClient();

    // Verify client exists and check ownership
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('organization_id')
      .eq('id', id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const { unauthorized } = await requireCallerOwnsOrg(client.organization_id);
    if (unauthorized) return unauthorized;

    // Get all lead IDs for this client
    const { data: leads } = await supabase
      .from('leads')
      .select('id')
      .eq('client_id', id);

    const leadIds = (leads || []).map((l: { id: string }) => l.id);

    // Fetch client activities
    const { data: activities } = await supabase
      .from('client_activities')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(100);

    // Build timeline from activities
    const timeline: TimelineEntry[] = (activities || []).map((a: Record<string, unknown>) => ({
      id: a.id as string,
      type: 'activity' as const,
      date: a.created_at as string,
      summary: (a.description as string) || (a.activity_type as string) || 'Activity',
      data: a,
    }));

    // Only fetch lead-linked data if there are leads
    if (leadIds.length > 0) {
      const [inboxResult, emailLogsResult, smsLogsResult] = await Promise.all([
        supabase
          .from('inbox_messages')
          .select('*')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('email_logs')
          .select('*')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false }),
        supabase
          .from('sms_logs')
          .select('*')
          .in('lead_id', leadIds)
          .order('created_at', { ascending: false }),
      ]);

      // Merge inbox messages
      for (const msg of (inboxResult.data || [])) {
        timeline.push({
          id: msg.id,
          type: 'inbox_message',
          date: msg.created_at,
          summary: msg.subject || `${msg.direction} ${msg.channel} message`,
          data: msg,
        });
      }

      // Merge email logs
      for (const email of (emailLogsResult.data || [])) {
        timeline.push({
          id: email.id,
          type: 'email',
          date: email.created_at,
          summary: email.subject || `Email to ${email.recipient_email || 'unknown'}`,
          data: email,
        });
      }

      // Merge SMS logs
      for (const sms of (smsLogsResult.data || [])) {
        timeline.push({
          id: sms.id,
          type: 'sms',
          date: sms.created_at,
          summary: sms.message || `SMS to ${sms.recipient_phone || 'unknown'}`,
          data: sms,
        });
      }
    }

    // Sort unified timeline by date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ timeline });
  } catch (error) {
    console.error('Client timeline fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
