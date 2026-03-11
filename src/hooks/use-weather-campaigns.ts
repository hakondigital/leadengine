'use client';

import { useState, useEffect, useCallback } from 'react';

// Map UI trigger types to DB values
const UI_TO_DB: Record<string, string> = {
  rain: 'heavy_rain',
  storm: 'storm',
  heatwave: 'heatwave',
  cold_snap: 'cold_snap',
  wind: 'high_wind',
};

const DB_TO_UI: Record<string, string> = {
  heavy_rain: 'rain',
  storm: 'storm',
  heatwave: 'heatwave',
  cold_snap: 'cold_snap',
  high_wind: 'wind',
  hail: 'storm',
};

export interface WeatherCampaignRecord {
  id: string;
  name: string;
  triggerType: 'rain' | 'heatwave' | 'storm' | 'cold_snap' | 'wind';
  targetArea: string;
  message: string;
  active: boolean;
}

interface WeatherCampaignsState {
  campaigns: WeatherCampaignRecord[];
  loading: boolean;
  error: string | null;
}

function mapFromDB(raw: Record<string, unknown>): WeatherCampaignRecord {
  return {
    id: raw.id as string,
    name: raw.name as string,
    triggerType: (DB_TO_UI[raw.weather_trigger as string] || 'storm') as WeatherCampaignRecord['triggerType'],
    targetArea: ((raw.target_postcodes as string[]) || [])[0] || '',
    message: (raw.sms_body as string) || (raw.email_body as string) || '',
    active: raw.is_active as boolean,
  };
}

export function useWeatherCampaigns(organizationId: string | undefined) {
  const [state, setState] = useState<WeatherCampaignsState>({
    campaigns: [],
    loading: true,
    error: null,
  });

  const fetchCampaigns = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));
    try {
      const res = await fetch(`/api/weather/campaigns?organization_id=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch weather campaigns');
      const data = await res.json();
      setState({
        campaigns: (data.campaigns || []).map(mapFromDB),
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const createCampaign = useCallback(
    async (campaign: {
      name: string;
      triggerType: string;
      targetArea: string;
      message: string;
    }) => {
      if (!organizationId) return null;
      const res = await fetch('/api/weather/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organizationId,
          name: campaign.name,
          weather_trigger: UI_TO_DB[campaign.triggerType] || 'storm',
          target_postcodes: campaign.targetArea ? [campaign.targetArea] : [],
          sms_body: campaign.message || null,
          email_body: campaign.message || null,
          is_active: true,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setState((s) => ({ ...s, campaigns: [mapFromDB(created), ...s.campaigns] }));
        return created;
      }
      return null;
    },
    [organizationId]
  );

  const toggleCampaign = useCallback(async (id: string, active: boolean) => {
    const res = await fetch(`/api/weather/campaigns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: active }),
    });
    if (res.ok) {
      setState((s) => ({
        ...s,
        campaigns: s.campaigns.map((c) => (c.id === id ? { ...c, active } : c)),
      }));
      return true;
    }
    return false;
  }, []);

  const deleteCampaign = useCallback(async (id: string) => {
    const res = await fetch(`/api/weather/campaigns/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setState((s) => ({ ...s, campaigns: s.campaigns.filter((c) => c.id !== id) }));
      return true;
    }
    return false;
  }, []);

  return { ...state, refetch: fetchCampaigns, createCampaign, toggleCampaign, deleteCampaign };
}
