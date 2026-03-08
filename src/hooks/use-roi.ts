'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ChannelROI {
  channel: string;
  leads: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  spend: number;
  cpl: number;
  roi: number;
}

export interface ChannelBudget {
  channel: string;
  spend: number;
}

interface ROIState {
  channels: ChannelROI[];
  totalRevenue: number;
  totalSpend: number;
  loading: boolean;
  error: string | null;
}

export function useROI(
  organizationId: string | undefined,
  channelBudgets?: ChannelBudget[]
) {
  const [state, setState] = useState<ROIState>({
    channels: [],
    totalRevenue: 0,
    totalSpend: 0,
    loading: true,
    error: null,
  });

  const fetchAndCompute = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    try {
      const res = await fetch(`/api/leads?organization_id=${organizationId}&limit=500`);
      if (!res.ok) throw new Error('Failed to fetch leads for ROI');
      const data = await res.json();

      interface LeadRecord {
        utm_source?: string;
        source?: string;
        status?: string;
        won_value?: number;
      }

      const leads: LeadRecord[] = data.leads || [];

      // Group leads by channel (utm_source or source fallback)
      const channelMap = new Map<string, { leads: number; conversions: number; revenue: number }>();

      for (const lead of leads) {
        const channel = lead.utm_source || lead.source || 'direct';
        const existing = channelMap.get(channel) || { leads: 0, conversions: 0, revenue: 0 };
        existing.leads += 1;
        if (lead.status === 'won') {
          existing.conversions += 1;
          existing.revenue += lead.won_value || 0;
        }
        channelMap.set(channel, existing);
      }

      // Build budget lookup from channelBudgets param
      const budgetLookup = new Map<string, number>();
      if (channelBudgets) {
        for (const b of channelBudgets) {
          budgetLookup.set(b.channel.toLowerCase(), b.spend);
        }
      }

      // Compute ROI per channel
      const channels: ChannelROI[] = [];
      let totalRevenue = 0;
      let totalSpend = 0;

      channelMap.forEach((stats, channel) => {
        const spend = budgetLookup.get(channel.toLowerCase()) || 0;
        const cpl = stats.leads > 0 && spend > 0 ? spend / stats.leads : 0;
        const conversionRate = stats.leads > 0 ? (stats.conversions / stats.leads) * 100 : 0;
        const roi = spend > 0 ? ((stats.revenue - spend) / spend) * 100 : 0;

        totalRevenue += stats.revenue;
        totalSpend += spend;

        channels.push({
          channel,
          leads: stats.leads,
          conversions: stats.conversions,
          conversionRate: Math.round(conversionRate * 10) / 10,
          revenue: stats.revenue,
          spend,
          cpl: Math.round(cpl * 100) / 100,
          roi: Math.round(roi * 10) / 10,
        });
      });

      // Sort by leads descending
      channels.sort((a, b) => b.leads - a.leads);

      setState({
        channels,
        totalRevenue,
        totalSpend,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId, channelBudgets]);

  useEffect(() => {
    fetchAndCompute();
  }, [fetchAndCompute]);

  return {
    ...state,
    refetch: fetchAndCompute,
  };
}
