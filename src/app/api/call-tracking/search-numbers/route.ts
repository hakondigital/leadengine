import { NextResponse, type NextRequest } from 'next/server';
import { checkFeature } from '@/lib/check-plan';
import { checkSuperAdmin } from '@/lib/super-admin';

const TELNYX_API_KEY = process.env.TELNYX_API_KEY;

// Search Telnyx for available phone numbers
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('organization_id');
  const countryCode = searchParams.get('country_code') || 'AU';
  const numberType = searchParams.get('type') || 'local';
  const areaCode = searchParams.get('area_code') || '';
  const limit = searchParams.get('limit') || '10';

  if (!orgId) {
    return NextResponse.json({ error: 'organization_id required' }, { status: 400 });
  }

  // Check plan access — super admin bypasses
  const { isSuperAdmin } = await checkSuperAdmin(request);
  if (!isSuperAdmin) {
    const featureCheck = await checkFeature(orgId, 'call_tracking');
    if (!featureCheck.allowed) {
      return NextResponse.json({ error: 'Call tracking not available on your plan' }, { status: 403 });
    }
  }

  if (!TELNYX_API_KEY) {
    return NextResponse.json({ error: 'Telnyx not configured' }, { status: 500 });
  }

  try {
    const params = new URLSearchParams({
      'filter[country_code]': countryCode,
      'filter[phone_number_type]': numberType,
      'filter[limit]': limit,
    });

    if (areaCode) {
      params.set('filter[national_destination_code]', areaCode);
    }

    const res = await fetch(
      `https://api.telnyx.com/v2/available_phone_numbers?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${TELNYX_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error('Telnyx search error:', err);
      return NextResponse.json({ error: 'Failed to search numbers' }, { status: 502 });
    }

    const data = await res.json();

    // Map to a simpler format
    const numbers = (data.data || []).map((n: Record<string, unknown>) => ({
      phone_number: n.phone_number,
      region: n.region_information,
      cost: n.cost_information,
      type: n.phone_number_type,
      features: n.features,
    }));

    return NextResponse.json({ numbers });
  } catch (error) {
    console.error('Number search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
