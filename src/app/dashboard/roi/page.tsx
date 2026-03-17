'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useROI } from '@/hooks/use-roi';
import { AddonGate } from '@/components/marketplace/addon-gate';
import { usePlan } from '@/hooks/use-plan';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DollarSign,
  TrendingUp,
  Target,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
} from 'lucide-react';

interface ChannelROI {
  channel: string;
  spend: number;
  leads: number;
  conversions: number;
  revenue: number;
  roi: number;
  costPerLead: number;
  costPerConversion: number;
  trend: 'up' | 'down' | 'flat';
}

const mockChannels: ChannelROI[] = [
  { channel: 'Google Ads', spend: 2400, leads: 48, conversions: 12, revenue: 18600, roi: 675, costPerLead: 50, costPerConversion: 200, trend: 'up' },
  { channel: 'Facebook Ads', spend: 1200, leads: 28, conversions: 6, revenue: 8400, roi: 600, costPerLead: 43, costPerConversion: 200, trend: 'up' },
  { channel: 'Organic Search', spend: 0, leads: 35, conversions: 9, revenue: 12800, roi: 0, costPerLead: 0, costPerConversion: 0, trend: 'up' },
  { channel: 'Referrals', spend: 0, leads: 15, conversions: 7, revenue: 14200, roi: 0, costPerLead: 0, costPerConversion: 0, trend: 'flat' },
  { channel: 'Website Direct', spend: 800, leads: 22, conversions: 5, revenue: 6500, roi: 713, costPerLead: 36, costPerConversion: 160, trend: 'down' },
];

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);

export default function ROIPage() {
  return <AddonGate addonId="roi-tracker"><ROIPageContent /></AddonGate>;
}

function ROIPageContent() {
  const { organization } = useOrganization();
  const { channels: fetchedChannels, totalRevenue: hookTotalRevenue, totalSpend: hookTotalSpend, loading } = useROI(organization?.id);
  const { canUseAdvancedAnalytics, planName, loading: planLoading } = usePlan();
  const [period, setPeriod] = useState('30d');

  if (planLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[var(--od-accent)] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!canUseAdvancedAnalytics) {
    return <UpgradeBanner feature="Advanced Analytics" requiredPlan="Professional" currentPlan={planName} />;
  }

  const channels: ChannelROI[] = fetchedChannels.length > 0
    ? fetchedChannels.map((c) => ({
        channel: c.channel,
        spend: c.spend,
        leads: c.leads,
        conversions: c.conversions,
        revenue: c.revenue,
        roi: c.roi,
        costPerLead: c.cpl,
        costPerConversion: c.conversions > 0 && c.spend > 0 ? Math.round(c.spend / c.conversions) : 0,
        trend: c.roi > 0 ? 'up' as const : c.roi < 0 ? 'down' as const : 'flat' as const,
      }))
    : mockChannels;

  const totalSpend = channels.reduce((a, c) => a + c.spend, 0);
  const totalRevenue = channels.reduce((a, c) => a + c.revenue, 0);
  const totalLeads = channels.reduce((a, c) => a + c.leads, 0);
  const totalConversions = channels.reduce((a, c) => a + c.conversions, 0);
  const overallROI = totalSpend > 0 ? Math.round(((totalRevenue - totalSpend) / totalSpend) * 100) : 0;
  const conversionRate = totalLeads > 0 ? Math.round((totalConversions / totalLeads) * 100) : 0;

  const topStats = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: '#34C77B', change: '+18%', up: true },
    { label: 'Ad Spend', value: formatCurrency(totalSpend), icon: Target, color: '#5B8DEF', change: '-5%', up: true },
    { label: 'Overall ROI', value: `${overallROI}%`, icon: TrendingUp, color: '#F0A030', change: '+12%', up: true },
    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: Percent, color: '#4FD1E5', change: '+3%', up: true },
  ];

  const periods = [
    { value: '7d', label: '7 days' },
    { value: '30d', label: '30 days' },
    { value: '90d', label: '90 days' },
    { value: '12m', label: '12 months' },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">ROI Dashboard</h1>
            <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">Track return on investment across all channels</p>
          </div>
          <div className="flex items-center gap-1 bg-[var(--od-bg-tertiary)] rounded-lg p-0.5">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  period === p.value
                    ? 'bg-[var(--od-bg-elevated)] text-[var(--od-text-primary)]'
                    : 'text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--od-text-muted)]">
            <div className="w-3 h-3 border-2 border-[var(--od-accent)] border-t-transparent rounded-full animate-spin" />
            Loading ROI data...
          </div>
        )}
        {/* Top Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {topStats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">{stat.label}</p>
                      <p className="text-2xl font-bold text-[var(--od-text-primary)] mt-1">{stat.value}</p>
                      <div className="flex items-center gap-1 mt-1">
                        {stat.up ? (
                          <ArrowUpRight className="w-3 h-3 text-[#34C77B]" />
                        ) : (
                          <ArrowDownRight className="w-3 h-3 text-[#E8636C]" />
                        )}
                        <span className={`text-[10px] font-medium ${stat.up ? 'text-[#34C77B]' : 'text-[#E8636C]'}`}>
                          {stat.change}
                        </span>
                        <span className="text-[10px] text-[var(--od-text-muted)]">vs prev</span>
                      </div>
                    </div>
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-lg"
                      style={{ backgroundColor: `${stat.color}12` }}
                    >
                      <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Revenue Chart Placeholder */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--od-accent)]" />
              <CardTitle>Revenue vs Spend Over Time</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48 flex items-center justify-center text-[var(--od-text-muted)] text-sm">
              <div className="text-center">
                <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Chart visualization</p>
                <p className="text-xs mt-1">Connect analytics to see real-time data</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Channel Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[var(--od-accent)]" />
              <CardTitle>Channel Performance</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--od-border-subtle)]">
                    <th className="text-left py-2 pr-4 text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">Channel</th>
                    <th className="text-right py-2 px-4 text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">Spend</th>
                    <th className="text-right py-2 px-4 text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">Leads</th>
                    <th className="text-right py-2 px-4 text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">Won</th>
                    <th className="text-right py-2 px-4 text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">Revenue</th>
                    <th className="text-right py-2 px-4 text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">CPL</th>
                    <th className="text-right py-2 pl-4 text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {channels.map((ch, i) => (
                    <motion.tr
                      key={ch.channel}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-[var(--od-border-subtle)] last:border-0"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--od-text-primary)]">{ch.channel}</span>
                          {ch.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-[#34C77B]" />}
                          {ch.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-[#E8636C]" />}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right text-sm text-[var(--od-text-secondary)]">
                        {ch.spend > 0 ? formatCurrency(ch.spend) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-medium text-[var(--od-text-primary)]">{ch.leads}</td>
                      <td className="py-3 px-4 text-right text-sm text-[#34C77B] font-medium">{ch.conversions}</td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-[var(--od-text-primary)]">{formatCurrency(ch.revenue)}</td>
                      <td className="py-3 px-4 text-right text-sm text-[var(--od-text-secondary)]">
                        {ch.costPerLead > 0 ? formatCurrency(ch.costPerLead) : '—'}
                      </td>
                      <td className="py-3 pl-4 text-right">
                        {ch.roi > 0 ? (
                          <span className="text-sm font-bold text-[#34C77B]">{ch.roi}%</span>
                        ) : (
                          <span className="text-xs text-[var(--od-text-muted)]">Organic</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--od-border-subtle)]">
                    <td className="py-3 pr-4 text-sm font-bold text-[var(--od-text-primary)]">Total</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-[var(--od-text-primary)]">{formatCurrency(totalSpend)}</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-[var(--od-text-primary)]">{totalLeads}</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-[#34C77B]">{totalConversions}</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-[var(--od-text-primary)]">{formatCurrency(totalRevenue)}</td>
                    <td className="py-3 px-4 text-right text-sm font-bold text-[var(--od-text-primary)]">
                      {totalLeads > 0 ? formatCurrency(Math.round(totalSpend / totalLeads)) : '—'}
                    </td>
                    <td className="py-3 pl-4 text-right text-sm font-bold text-[#34C77B]">{overallROI}%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
