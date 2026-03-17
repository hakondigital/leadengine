import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkFeature } from '@/lib/check-plan';
import { requireCallerOwnsOrg } from '@/lib/require-org-access';

interface CSVRow {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  service_type?: string;
  location?: string;
  budget_range?: string;
  urgency?: string;
  message?: string;
  source?: string;
  postcode?: string;
  [key: string]: string | undefined;
}

function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));

  const rows: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: CSVRow = {};
    headers.forEach((header, index) => {
      if (index < values.length) {
        row[header] = values[index]?.trim() || undefined;
      }
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);

  return values;
}

function validateRow(row: CSVRow): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!row.first_name) errors.push('Missing first_name');
  if (!row.last_name) errors.push('Missing last_name');
  if (!row.email) errors.push('Missing email');

  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
    errors.push('Invalid email format');
  }

  return { valid: errors.length === 0, errors };
}

// POST: Import leads from CSV
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organization_id, csv_data, file_name, skip_duplicates } = body;

    if (!organization_id || !csv_data) {
      return NextResponse.json(
        { error: 'organization_id and csv_data required' },
        { status: 400 }
      );
    }

    const { unauthorized } = await requireCallerOwnsOrg(organization_id);
    if (unauthorized) return unauthorized;

    const importCheck = await checkFeature(organization_id, 'lead_import');
    if (!importCheck.allowed) {
      return NextResponse.json({ error: 'Lead import requires Professional or Enterprise plan.' }, { status: 403 });
    }

    const supabase = await createServiceRoleClient();
    const rows = parseCSV(csv_data);

    if (rows.length === 0) {
      return NextResponse.json({ error: 'No valid rows found in CSV' }, { status: 400 });
    }

    const results = {
      total: rows.length,
      imported: 0,
      skipped: 0,
      duplicates: 0,
      errors: [] as { row: number; errors: string[] }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const validation = validateRow(row);

      if (!validation.valid) {
        results.errors.push({ row: i + 2, errors: validation.errors });
        results.skipped++;
        continue;
      }

      // Check for duplicates
      if (skip_duplicates !== false && row.email) {
        const { data: existing } = await supabase
          .from('leads')
          .select('id')
          .eq('organization_id', organization_id)
          .eq('email', row.email)
          .limit(1)
          .single();

        if (existing) {
          results.duplicates++;
          results.skipped++;
          continue;
        }
      }

      // Insert lead
      const { error: insertError } = await supabase.from('leads').insert({
        organization_id,
        first_name: row.first_name!,
        last_name: row.last_name!,
        email: row.email!,
        phone: row.phone || null,
        company: row.company || null,
        service_type: row.service_type || null,
        location: row.location || null,
        budget_range: row.budget_range || null,
        urgency: row.urgency || null,
        message: row.message || null,
        postcode: row.postcode || null,
        source: 'csv_import',
        status: 'new',
        priority: 'medium',
      });

      if (insertError) {
        results.errors.push({ row: i + 2, errors: [insertError.message] });
        results.skipped++;
      } else {
        results.imported++;
      }
    }

    // Create import log — use correct column names from schema
    const status = results.imported === 0 ? 'failed' : results.errors.length > 0 ? 'completed' : 'completed';
    await supabase.from('import_logs').insert({
      organization_id,
      file_name: file_name || 'import.csv',
      total_rows: results.total,
      imported_count: results.imported,
      skipped_count: results.skipped,
      error_count: results.errors.length,
      errors: results.errors,
      status,
    });

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: Fetch import history
export async function GET(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('organization_id');
    if (!orgId) {
      return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
    }

    const { unauthorized } = await requireCallerOwnsOrg(orgId);
    if (unauthorized) return unauthorized;

    const supabase = await createServiceRoleClient();
    const { data, error } = await supabase
      .from('import_logs')
      .select('*')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ history: data || [] });
  } catch (error) {
    console.error('Import history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
