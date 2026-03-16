import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { success } = rateLimit(`sa-check:${ip}`, 30);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { organization_id, postcode, location } = body;

    if (!organization_id || (!postcode && !location)) {
      return NextResponse.json(
        { error: 'organization_id and postcode or location required' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Get all active service areas for this org
    const { data: serviceAreas, error } = await supabase
      .from('service_areas')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('is_active', true);

    if (error) {
      console.error('Service areas check error:', error);
      return NextResponse.json({ error: 'Failed to check service areas' }, { status: 500 });
    }

    if (!serviceAreas || serviceAreas.length === 0) {
      // No service areas defined — assume all areas covered
      return NextResponse.json({
        in_area: true,
        area_name: 'All areas',
        assigned_to: null,
        message: 'No service area restrictions configured',
      });
    }

    const normalizedPostcode = postcode?.toString().trim().toUpperCase();
    const normalizedLocation = location?.toString().trim().toLowerCase();

    // Check postcode match
    for (const area of serviceAreas) {
      const areaPostcodes: string[] = area.postcodes || [];
      const areaSuburbs: string[] = area.suburbs || [];

      // Exact postcode match
      if (normalizedPostcode && areaPostcodes.length > 0) {
        const match = areaPostcodes.some((p: string) => {
          const normalizedP = p.toString().trim().toUpperCase();
          // Support wildcard matching (e.g., "2000" matches "2000", "20*" matches "2000"-"2099")
          if (normalizedP.includes('*')) {
            const prefix = normalizedP.replace('*', '');
            return normalizedPostcode.startsWith(prefix);
          }
          return normalizedP === normalizedPostcode;
        });

        if (match) {
          return NextResponse.json({
            in_area: true,
            area_name: area.name,
            assigned_to: area.assigned_to,
          });
        }
      }

      // Suburb/location name match
      if (normalizedLocation && areaSuburbs.length > 0) {
        const match = areaSuburbs.some((s: string) =>
          normalizedLocation.includes(s.toLowerCase()) ||
          s.toLowerCase().includes(normalizedLocation)
        );

        if (match) {
          return NextResponse.json({
            in_area: true,
            area_name: area.name,
            assigned_to: area.assigned_to,
          });
        }
      }
    }

    return NextResponse.json({
      in_area: false,
      area_name: null,
      assigned_to: null,
      message: 'Location is outside service areas',
    });
  } catch (error) {
    console.error('Service area check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
