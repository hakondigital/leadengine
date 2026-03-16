import { NextResponse, type NextRequest } from 'next/server';
import { checkFeature } from '@/lib/check-plan';
import { checkSuperAdmin } from '@/lib/super-admin';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

function twilioAuth(): string {
  return 'Basic ' + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
}

// Search Twilio for available phone numbers
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('organization_id');
  const countryCode = searchParams.get('country_code') || 'AU';
  const numberType = searchParams.get('type') || 'local';
  const areaCode = searchParams.get('area_code') || '';
  const limit = searchParams.get('limit') || '30';

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

  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return NextResponse.json({ error: 'Twilio not configured' }, { status: 500 });
  }

  try {
    // Map number types to Twilio endpoints
    const typeEndpoints: Record<string, string> = {
      local: 'Local',
      mobile: 'Mobile',
      toll_free: 'TollFree',
      national: 'National',
    };

    const typesToTry = numberType === 'local'
      ? ['Local', 'Mobile', 'TollFree']
      : [typeEndpoints[numberType] || 'Local'];

    let allNumbers: Record<string, unknown>[] = [];

    for (const type of typesToTry) {
      if (allNumbers.length >= parseInt(limit)) break;

      const params = new URLSearchParams();
      if (areaCode) params.set('AreaCode', areaCode);
      params.set('PageSize', String(parseInt(limit) - allNumbers.length));

      const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/${countryCode}/${type}.json?${params.toString()}`;

      const res = await fetch(url, {
        headers: { Authorization: twilioAuth() },
      });

      if (res.ok) {
        const data = await res.json();
        allNumbers = allNumbers.concat(data.available_phone_numbers || []);
      }
    }

    // If still empty and area code was set, retry without area code
    if (allNumbers.length === 0 && areaCode) {
      for (const type of typesToTry) {
        if (allNumbers.length >= parseInt(limit)) break;

        const params = new URLSearchParams();
        params.set('PageSize', String(parseInt(limit) - allNumbers.length));

        const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/${countryCode}/${type}.json?${params.toString()}`;

        const res = await fetch(url, {
          headers: { Authorization: twilioAuth() },
        });

        if (res.ok) {
          const data = await res.json();
          allNumbers = allNumbers.concat(data.available_phone_numbers || []);
        }
      }
    }

    // Map to a consistent format
    const numbers = allNumbers.slice(0, parseInt(limit)).map((n) => ({
      phone_number: n.phone_number,
      friendly_name: n.friendly_name,
      region: n.region,
      locality: n.locality,
      type: n.address_requirements,
      capabilities: n.capabilities,
    }));

    return NextResponse.json({ numbers });
  } catch (error) {
    console.error('Number search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
