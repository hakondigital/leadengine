import { NextResponse, type NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendFollowUpEmail } from '@/lib/email';
import { sendFollowUpSMS } from '@/lib/sms';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

interface WeatherData {
  main: {
    temp: number;
    humidity: number;
  };
  weather: { id: number; main: string; description: string }[];
  wind: { speed: number };
  name: string;
}

async function fetchWeather(location: string): Promise<WeatherData | null> {
  if (!OPENWEATHER_API_KEY) {
    console.warn('OpenWeatherMap API key not configured');
    return null;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${OPENWEATHER_API_KEY}&units=metric`;

  const response = await fetch(url);
  if (!response.ok) {
    console.error('Weather API error:', await response.text());
    return null;
  }

  return response.json();
}

function matchesConditions(
  weather: WeatherData,
  conditions: Record<string, unknown>
): boolean {
  const weatherType = conditions.weather_type as string;
  const minTemp = conditions.min_temp as number | null;
  const maxTemp = conditions.max_temp as number | null;
  const windSpeedMin = conditions.wind_speed_min as number | null;

  const mainWeather = weather.weather[0]?.main?.toLowerCase() || '';
  const temp = weather.main.temp;
  const windSpeed = weather.wind.speed;

  // Check weather type
  if (weatherType) {
    const typeMap: Record<string, string[]> = {
      rain: ['rain', 'drizzle'],
      storm: ['thunderstorm'],
      snow: ['snow'],
      heat: ['clear'],
      cold: ['clear', 'clouds'],
      wind: ['squall', 'tornado'],
      clouds: ['clouds'],
    };

    const validTypes = typeMap[weatherType] || [weatherType];
    if (!validTypes.some((t) => mainWeather.includes(t))) {
      // For heat/cold, check temp instead
      if (weatherType === 'heat' && minTemp !== null && temp < minTemp) return false;
      if (weatherType === 'cold' && maxTemp !== null && temp > maxTemp) return false;
      if (weatherType !== 'heat' && weatherType !== 'cold') return false;
    }
  }

  // Check temperature thresholds
  if (minTemp !== null && minTemp !== undefined && temp < minTemp) return false;
  if (maxTemp !== null && maxTemp !== undefined && temp > maxTemp) return false;

  // Check wind speed
  if (windSpeedMin !== null && windSpeedMin !== undefined && windSpeed < windSpeedMin) return false;

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { success } = rateLimit(`weather:${ip}`, 10);
    if (!success) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { organization_id, location } = body;

    if (!organization_id || !location) {
      return NextResponse.json(
        { error: 'organization_id and location required' },
        { status: 400 }
      );
    }

    // Fetch current weather
    const weather = await fetchWeather(location);
    if (!weather) {
      return NextResponse.json(
        { error: 'Could not fetch weather data' },
        { status: 503 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Get active weather campaigns for this org
    const { data: campaigns, error: campaignsError } = await supabase
      .from('weather_campaigns')
      .select('*')
      .eq('organization_id', organization_id)
      .eq('is_active', true);

    if (campaignsError) {
      console.error('Weather campaigns fetch error:', campaignsError);
      return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 });
    }

    const triggered: string[] = [];

    for (const campaign of campaigns || []) {
      // Skip if triggered within last 24 hours
      if (campaign.last_triggered_at) {
        const lastTriggered = new Date(campaign.last_triggered_at).getTime();
        if (Date.now() - lastTriggered < 24 * 3600000) continue;
      }

      if (matchesConditions(weather, campaign.trigger_conditions)) {
        triggered.push(campaign.name);

        // Update last_triggered_at
        await supabase
          .from('weather_campaigns')
          .update({ last_triggered_at: new Date().toISOString() })
          .eq('id', campaign.id);

        // Get leads in target area to notify
        const targetPostcodes: string[] = campaign.target_postcodes || [];

        let leadsQuery = supabase
          .from('leads')
          .select('*, organization:organizations(*)')
          .eq('organization_id', organization_id)
          .in('status', ['won', 'contacted', 'qualified']);

        // If target postcodes specified, filter leads
        // (Note: This requires leads to have location/postcode data)

        const { data: leads } = await leadsQuery.limit(100);

        // Send campaign messages to matching leads
        for (const lead of leads || []) {
          const org = lead.organization;
          const messageBody = (campaign.message_template || '')
            .replace('{{first_name}}', lead.first_name)
            .replace('{{weather}}', weather.weather[0]?.description || '')
            .replace('{{temp}}', String(Math.round(weather.main.temp)))
            .replace('{{location}}', weather.name);

          if (campaign.message_template && lead.email && org) {
            sendFollowUpEmail(lead, org, messageBody).catch(console.error);
          }

          if (campaign.sms_template && lead.phone) {
            const smsBody = (campaign.sms_template || '')
              .replace('{{first_name}}', lead.first_name)
              .replace('{{weather}}', weather.weather[0]?.description || '')
              .replace('{{temp}}', String(Math.round(weather.main.temp)));
            sendFollowUpSMS(lead.phone, smsBody).catch(console.error);
          }
        }

        // Log the trigger
        await supabase.from('weather_campaign_logs').insert({
          campaign_id: campaign.id,
          organization_id,
          weather_data: weather,
          leads_notified: (leads || []).length,
          triggered_at: new Date().toISOString(),
        });
      }
    }

    return NextResponse.json({
      weather: {
        location: weather.name,
        temp: weather.main.temp,
        humidity: weather.main.humidity,
        conditions: weather.weather[0]?.description,
        wind_speed: weather.wind.speed,
      },
      campaigns_triggered: triggered,
      total_campaigns_checked: (campaigns || []).length,
    });
  } catch (error) {
    console.error('Weather check error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
