'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useCallTracking } from '@/hooks/use-call-tracking';
import { usePlan } from '@/hooks/use-plan';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Clock,
  Hash,
  Settings,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  Search,
  Loader2,
  X,
  CheckCircle,
  Globe,
  Tag,
  PhoneForwarded,
} from 'lucide-react';

interface TrackingNumber {
  id: string;
  number: string;
  label: string;
  source: string;
  totalCalls: number;
  active: boolean;
}

interface CallLog {
  id: string;
  callerName: string;
  callerNumber: string;
  trackingNumber: string;
  trackingLabel: string;
  duration: string;
  durationSeconds: number;
  status: 'answered' | 'missed' | 'voicemail';
  timestamp: string;
  linkedLead?: string;
  transcript?: string;
  aiSummary?: string;
}

interface SearchNumber {
  phone_number: string;
  region: { region_name?: string; region_type?: string }[] | null;
  cost: { monthly_cost?: string; upfront_cost?: string } | null;
  type: string;
}

const mockTrackingNumbers: TrackingNumber[] = [
  { id: '1', number: '+61 2 8000 1001', label: 'Google Ads', source: 'google_ads', totalCalls: 142, active: true },
  { id: '2', number: '+61 2 8000 1002', label: 'Website Header', source: 'website', totalCalls: 98, active: true },
  { id: '3', number: '+61 2 8000 1003', label: 'Facebook Ads', source: 'facebook', totalCalls: 56, active: true },
  { id: '4', number: '+61 2 8000 1004', label: 'Business Cards', source: 'offline', totalCalls: 23, active: false },
];

const mockCallLog: CallLog[] = [
  { id: '1', callerName: 'Sarah Mitchell', callerNumber: '+61 412 345 678', trackingNumber: '+61 2 8000 1001', trackingLabel: 'Google Ads', duration: '4:32', durationSeconds: 272, status: 'answered', timestamp: '12 min ago', linkedLead: 'Sarah Mitchell' },
  { id: '2', callerName: 'Unknown', callerNumber: '+61 498 111 222', trackingNumber: '+61 2 8000 1002', trackingLabel: 'Website Header', duration: '0:00', durationSeconds: 0, status: 'missed', timestamp: '45 min ago' },
  { id: '3', callerName: 'James Cooper', callerNumber: '+61 455 333 444', trackingNumber: '+61 2 8000 1001', trackingLabel: 'Google Ads', duration: '2:15', durationSeconds: 135, status: 'answered', timestamp: '1 hour ago', linkedLead: 'James Cooper' },
  { id: '4', callerName: 'Unknown', callerNumber: '+61 411 555 666', trackingNumber: '+61 2 8000 1003', trackingLabel: 'Facebook Ads', duration: '1:08', durationSeconds: 68, status: 'voicemail', timestamp: '2 hours ago' },
  { id: '5', callerName: 'Lisa Wang', callerNumber: '+61 422 777 888', trackingNumber: '+61 2 8000 1002', trackingLabel: 'Website Header', duration: '6:45', durationSeconds: 405, status: 'answered', timestamp: '3 hours ago', linkedLead: 'Lisa Wang' },
  { id: '6', callerName: 'Unknown', callerNumber: '+61 433 999 000', trackingNumber: '+61 2 8000 1003', trackingLabel: 'Facebook Ads', duration: '0:00', durationSeconds: 0, status: 'missed', timestamp: '4 hours ago' },
  { id: '7', callerName: 'David Brooks', callerNumber: '+61 444 111 333', trackingNumber: '+61 2 8000 1001', trackingLabel: 'Google Ads', duration: '3:22', durationSeconds: 202, status: 'answered', timestamp: 'Yesterday', linkedLead: 'David Brooks' },
];

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Phone }> = {
  answered: { label: 'Answered', color: '#1F9B5A', bg: 'rgba(52,199,123,0.08)', icon: PhoneIncoming },
  missed: { label: 'Missed', color: '#C44E56', bg: 'rgba(232,99,108,0.08)', icon: PhoneMissed },
  voicemail: { label: 'Voicemail', color: '#C48020', bg: 'rgba(240,160,48,0.08)', icon: Phone },
};

const COUNTRY_OPTIONS = [
  { code: 'AU', label: 'Australia (+61)' },
  { code: 'US', label: 'United States (+1)' },
  { code: 'GB', label: 'United Kingdom (+44)' },
  { code: 'NZ', label: 'New Zealand (+64)' },
  { code: 'CA', label: 'Canada (+1)' },
];

const STATE_OPTIONS: Record<string, { value: string; label: string; areaCode: string }[]> = {
  AU: [
    { value: '', label: 'Any state', areaCode: '' },
    { value: 'NSW', label: 'New South Wales', areaCode: '02' },
    { value: 'VIC', label: 'Victoria', areaCode: '03' },
    { value: 'QLD', label: 'Queensland', areaCode: '07' },
    { value: 'WA', label: 'Western Australia', areaCode: '08' },
    { value: 'SA', label: 'South Australia', areaCode: '08' },
    { value: 'TAS', label: 'Tasmania', areaCode: '03' },
    { value: 'ACT', label: 'ACT', areaCode: '02' },
    { value: 'NT', label: 'Northern Territory', areaCode: '08' },
  ],
  US: [
    { value: '', label: 'Any state', areaCode: '' },
    { value: 'CA', label: 'California', areaCode: '213' },
    { value: 'NY', label: 'New York', areaCode: '212' },
    { value: 'TX', label: 'Texas', areaCode: '214' },
    { value: 'FL', label: 'Florida', areaCode: '305' },
    { value: 'IL', label: 'Illinois', areaCode: '312' },
    { value: 'WA', label: 'Washington', areaCode: '206' },
    { value: 'GA', label: 'Georgia', areaCode: '404' },
    { value: 'MA', label: 'Massachusetts', areaCode: '617' },
    { value: 'CO', label: 'Colorado', areaCode: '303' },
    { value: 'AZ', label: 'Arizona', areaCode: '480' },
  ],
  GB: [
    { value: '', label: 'Any region', areaCode: '' },
    { value: 'LON', label: 'London', areaCode: '20' },
    { value: 'MAN', label: 'Manchester', areaCode: '161' },
    { value: 'BHM', label: 'Birmingham', areaCode: '121' },
    { value: 'EDI', label: 'Edinburgh', areaCode: '131' },
    { value: 'GLA', label: 'Glasgow', areaCode: '141' },
    { value: 'LDS', label: 'Leeds', areaCode: '113' },
    { value: 'BRS', label: 'Bristol', areaCode: '117' },
  ],
  NZ: [
    { value: '', label: 'Any region', areaCode: '' },
    { value: 'AKL', label: 'Auckland', areaCode: '09' },
    { value: 'WLG', label: 'Wellington', areaCode: '04' },
    { value: 'CHC', label: 'Christchurch', areaCode: '03' },
    { value: 'HAM', label: 'Hamilton', areaCode: '07' },
  ],
  CA: [
    { value: '', label: 'Any province', areaCode: '' },
    { value: 'ON', label: 'Ontario', areaCode: '416' },
    { value: 'BC', label: 'British Columbia', areaCode: '604' },
    { value: 'QC', label: 'Quebec', areaCode: '514' },
    { value: 'AB', label: 'Alberta', areaCode: '403' },
    { value: 'MB', label: 'Manitoba', areaCode: '204' },
    { value: 'NS', label: 'Nova Scotia', areaCode: '902' },
  ],
};

export default function CallsPage() {
  const { organization } = useOrganization();
  const { canUseCallTracking, planName, loading: planLoading } = usePlan();
  const { trackingNumbers: fetchedTN, callLogs: fetchedCL, loading, refetch } = useCallTracking(organization?.id);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);

  // Provision modal state
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [searchCountry, setSearchCountry] = useState('AU');
  const [searchState, setSearchState] = useState('');
  const [searchResults, setSearchResults] = useState<SearchNumber[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [provisionLabel, setProvisionLabel] = useState('');
  const [provisionSource, setProvisionSource] = useState('');
  const [provisionForwarding, setProvisionForwarding] = useState('');
  const [provisioning, setProvisioning] = useState(false);
  const [provisionSuccess, setProvisionSuccess] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);

  if (planLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-[var(--od-text-muted)]" /></div>;
  }

  if (!canUseCallTracking) {
    return <UpgradeBanner feature="Call Tracking" requiredPlan="Professional" currentPlan={planName} />;
  }

  const calls: CallLog[] = fetchedCL.length > 0
    ? fetchedCL.map((c) => {
        const mins = Math.floor(c.duration_seconds / 60);
        const secs = c.duration_seconds % 60;
        return {
          id: c.id,
          callerName: c.caller_name || 'Unknown',
          callerNumber: c.caller_number,
          trackingNumber: '',
          trackingLabel: c.tracking_label || '',
          duration: `${mins}:${secs.toString().padStart(2, '0')}`,
          durationSeconds: c.duration_seconds,
          status: c.status === 'busy' ? 'missed' as const : c.status,
          timestamp: new Date(c.created_at).toLocaleString(),
          linkedLead: c.lead_name,
          transcript: c.transcript,
          aiSummary: c.ai_summary,
        };
      })
    : mockCallLog;

  const trackingNumbers: TrackingNumber[] = fetchedTN.length > 0
    ? fetchedTN.map((t) => ({
        id: t.id,
        number: t.phone_number,
        label: t.label,
        source: t.source,
        totalCalls: t.total_calls,
        active: t.is_active,
      }))
    : mockTrackingNumbers;

  const totalCalls = calls.length;
  const answered = calls.filter((c) => c.status === 'answered').length;
  const missed = calls.filter((c) => c.status === 'missed').length;
  const avgDuration = Math.round(
    calls.filter((c) => c.durationSeconds > 0).reduce((a, c) => a + c.durationSeconds, 0) /
    (calls.filter((c) => c.durationSeconds > 0).length || 1)
  );
  const avgMin = Math.floor(avgDuration / 60);
  const avgSec = avgDuration % 60;

  const stats = [
    { label: 'Total Calls', value: totalCalls.toString(), icon: Phone, color: '#5B8DEF' },
    { label: 'Answered', value: answered.toString(), icon: PhoneIncoming, color: '#34C77B' },
    { label: 'Missed', value: missed.toString(), icon: PhoneMissed, color: '#E8636C' },
    { label: 'Avg Duration', value: `${avgMin}:${avgSec.toString().padStart(2, '0')}`, icon: Clock, color: '#4FD1E5' },
  ];

  const handleSearchNumbers = async () => {
    if (!organization?.id) return;
    setSearching(true);
    setSearchResults([]);
    setProvisionError(null);
    try {
      const stateOpts = STATE_OPTIONS[searchCountry] || [];
      const selectedState = stateOpts.find((s) => s.value === searchState);
      const areaCode = selectedState?.areaCode || '';

      const params = new URLSearchParams({
        organization_id: organization.id,
        country_code: searchCountry,
        type: 'local',
        limit: '10',
      });
      if (areaCode) params.set('area_code', areaCode);

      const res = await fetch(`/api/call-tracking/search-numbers?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        setProvisionError(data.error || 'Search failed');
      } else {
        const data = await res.json();
        setSearchResults(data.numbers || []);
        if ((data.numbers || []).length === 0) {
          setProvisionError('No numbers available for this region. Try a different area code or country.');
        }
      }
    } catch {
      setProvisionError('Failed to search numbers');
    }
    setSearching(false);
  };

  const handleProvision = async () => {
    if (!organization?.id || !selectedNumber || !provisionForwarding) return;
    setProvisioning(true);
    setProvisionError(null);
    try {
      const res = await fetch('/api/call-tracking/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: organization.id,
          phone_number: selectedNumber,
          label: provisionLabel || 'New Number',
          source: provisionSource || 'provisioned',
          forwarding_number: provisionForwarding,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setProvisionError(data.error || 'Failed to provision number');
      } else {
        setProvisionSuccess(true);
        if (refetch) refetch();
        setTimeout(() => {
          setShowProvisionModal(false);
          resetProvisionModal();
        }, 2000);
      }
    } catch {
      setProvisionError('Failed to provision number');
    }
    setProvisioning(false);
  };

  const resetProvisionModal = () => {
    setSearchResults([]);
    setSelectedNumber(null);
    setProvisionLabel('');
    setProvisionSource('');
    setProvisionForwarding('');
    setProvisionSuccess(false);
    setProvisionError(null);
    setSearchState('');
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
            Call Tracking
          </h1>
          <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
            Track calls across all your marketing channels
          </p>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--od-text-muted)]">
            <div className="w-3 h-3 border-2 border-[var(--od-accent)] border-t-transparent rounded-full animate-spin" />
            Loading call data...
          </div>
        )}
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat, i) => (
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
                      <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold text-[var(--od-text-primary)] mt-1">
                        {stat.value}
                      </p>
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

        {/* Tracking Numbers */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-[var(--od-accent)]" />
                <CardTitle>Tracking Numbers</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  data-tour="add-number-btn"
                  variant="default"
                  size="sm"
                  onClick={() => { resetProvisionModal(); setShowProvisionModal(true); }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Number
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="w-3.5 h-3.5" />
                  Manage
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {trackingNumbers.length === 0 ? (
              <EmptyState
                icon={Phone}
                title="No tracking numbers"
                description="Add a tracking number to start tracking calls from your marketing channels."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {trackingNumbers.map((tn, i) => (
                  <motion.div
                    key={tn.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between p-3 rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--od-bg-tertiary)]">
                        <Phone className="w-3.5 h-3.5 text-[var(--od-text-muted)]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--od-text-primary)]">{tn.number}</p>
                        <p className="text-xs text-[var(--od-text-tertiary)]">{tn.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[var(--od-text-secondary)]">{tn.totalCalls} calls</span>
                      <Badge variant={tn.active ? 'success' : 'default'} size="sm" dot>
                        {tn.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Log */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-[var(--od-accent)]" />
              <CardTitle>Recent Calls</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {calls.length === 0 ? (
              <EmptyState
                icon={Phone}
                title="No calls recorded"
                description="Set up tracking numbers to start recording calls from your marketing channels."
              />
            ) : (
              <div className="space-y-2">
                {calls.map((call, i) => {
                  const sc = statusConfig[call.status];
                  const StatusIcon = sc.icon;
                  const isExpanded = expandedCall === call.id;
                  const hasTranscript = !!call.transcript || !!call.aiSummary;
                  return (
                    <motion.div
                      key={call.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-[var(--od-border-subtle)] last:border-0"
                    >
                      <div
                        className={`flex items-center justify-between py-3 ${hasTranscript ? 'cursor-pointer hover:bg-[var(--od-bg-tertiary)]/50 transition-colors rounded-md px-2 -mx-2' : ''}`}
                        onClick={() => hasTranscript && setExpandedCall(isExpanded ? null : call.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center justify-center w-8 h-8 rounded-full"
                            style={{ backgroundColor: sc.bg }}
                          >
                            <StatusIcon className="w-3.5 h-3.5" style={{ color: sc.color }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-[var(--od-text-primary)]">{call.callerName}</p>
                              {call.linkedLead && (
                                <span className="flex items-center gap-0.5 text-[10px] text-[var(--od-accent)] cursor-pointer hover:underline">
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  Lead
                                </span>
                              )}
                              {hasTranscript && (
                                <span className="flex items-center gap-0.5 text-[10px] text-[var(--od-accent)]">
                                  <FileText className="w-2.5 h-2.5" />
                                  Transcript
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-[var(--od-text-muted)]">{call.callerNumber}</span>
                              <span className="text-[10px] text-[var(--od-text-muted)]">via {call.trackingLabel}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <span
                              className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-[4px]"
                              style={{ color: sc.color, backgroundColor: sc.bg }}
                            >
                              {sc.label}
                            </span>
                            <p className="text-xs text-[var(--od-text-muted)] mt-0.5">{call.duration}</p>
                          </div>
                          <span className="text-[10px] text-[var(--od-text-muted)] w-16 text-right">{call.timestamp}</span>
                          {hasTranscript && (
                            isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--od-text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--od-text-muted)]" />
                          )}
                        </div>
                      </div>
                      {/* Expandable Transcript & AI Summary */}
                      {isExpanded && hasTranscript && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pb-4 pl-11 pr-2 space-y-3"
                        >
                          {call.aiSummary && (
                            <div className="p-3 rounded-[var(--od-radius-md)] bg-[rgba(91,141,239,0.06)] border border-[rgba(91,141,239,0.12)]">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Sparkles className="w-3.5 h-3.5 text-[var(--od-accent)]" />
                                <p className="text-[10px] font-semibold text-[var(--od-accent)] uppercase tracking-wider">AI Summary</p>
                              </div>
                              <div className="text-xs text-[var(--od-text-secondary)] leading-relaxed whitespace-pre-wrap">
                                {call.aiSummary}
                              </div>
                            </div>
                          )}
                          {call.transcript && (
                            <div className="p-3 rounded-[var(--od-radius-md)] bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)]">
                              <div className="flex items-center gap-1.5 mb-2">
                                <FileText className="w-3.5 h-3.5 text-[var(--od-text-muted)]" />
                                <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">Full Transcript</p>
                              </div>
                              <p className="text-xs text-[var(--od-text-tertiary)] leading-relaxed whitespace-pre-wrap">
                                {call.transcript}
                              </p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Provision Number Modal */}
      <AnimatePresence>
        {showProvisionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowProvisionModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-[var(--od-bg-secondary)] rounded-xl border border-[var(--od-border-subtle)] shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-[var(--od-border-subtle)]">
                <div>
                  <h2 className="text-lg font-bold text-[var(--od-text-primary)]">Add Tracking Number</h2>
                  <p className="text-xs text-[var(--od-text-muted)] mt-0.5">Search and provision a phone number for call tracking</p>
                </div>
                <button
                  onClick={() => setShowProvisionModal(false)}
                  className="p-1.5 rounded-md hover:bg-[var(--od-bg-tertiary)] text-[var(--od-text-muted)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {provisionSuccess ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-[var(--od-text-primary)]">Number Provisioned!</h3>
                  <p className="text-sm text-[var(--od-text-secondary)] mt-1">
                    Your new tracking number is ready. Calls will be forwarded to your business line.
                  </p>
                </div>
              ) : (
                <div className="p-5 space-y-5">
                  {/* Step 1: Search */}
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                      Step 1: Search for a number
                    </p>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-[var(--od-text-secondary)] mb-1 block">Country</label>
                        <select
                          value={searchCountry}
                          onChange={(e) => { setSearchCountry(e.target.value); setSearchState(''); }}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] text-sm text-[var(--od-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                        >
                          {COUNTRY_OPTIONS.map((c) => (
                            <option key={c.code} value={c.code}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-[var(--od-text-secondary)] mb-1 block">State / Region</label>
                        <select
                          value={searchState}
                          onChange={(e) => setSearchState(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] text-sm text-[var(--od-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                        >
                          {(STATE_OPTIONS[searchCountry] || [{ value: '', label: 'Any region', areaCode: '' }]).map((s) => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <Button onClick={handleSearchNumbers} disabled={searching} size="sm">
                          {searching ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Search className="w-3.5 h-3.5" />
                          )}
                          Search
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                        Available Numbers ({searchResults.length})
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-lg border border-[var(--od-border-subtle)] p-2">
                        {searchResults.map((num) => {
                          const isSelected = selectedNumber === num.phone_number;
                          const region = Array.isArray(num.region) && num.region[0]?.region_name;
                          const rawCost = num.cost && typeof num.cost === 'object' && 'monthly_cost' in num.cost
                            ? num.cost.monthly_cost
                            : null;
                          const monthlyCost = rawCost ? parseFloat(String(rawCost)).toFixed(2) : null;
                          return (
                            <button
                              key={num.phone_number}
                              onClick={() => setSelectedNumber(num.phone_number)}
                              className={`w-full flex items-center justify-between p-2.5 rounded-lg text-left transition-all ${
                                isSelected
                                  ? 'bg-[var(--od-accent-muted)] border border-[var(--od-accent)] ring-1 ring-[var(--od-accent)]'
                                  : 'hover:bg-[var(--od-bg-tertiary)] border border-transparent'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <Phone className={`w-4 h-4 ${isSelected ? 'text-[var(--od-accent)]' : 'text-[var(--od-text-muted)]'}`} />
                                <div>
                                  <p className={`text-sm font-medium ${isSelected ? 'text-[var(--od-accent)]' : 'text-[var(--od-text-primary)]'}`}>
                                    {num.phone_number}
                                  </p>
                                  {region && (
                                    <p className="text-[10px] text-[var(--od-text-muted)]">
                                      <Globe className="w-2.5 h-2.5 inline mr-0.5" />{region}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                {monthlyCost && (
                                  <span className="text-xs text-[var(--od-text-secondary)]">${monthlyCost}/mo</span>
                                )}
                                {isSelected && <CheckCircle className="w-4 h-4 text-[var(--od-accent)] mt-0.5" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Configure (shown after selecting a number) */}
                  {selectedNumber && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      <p className="text-xs font-semibold text-[var(--od-text-muted)] uppercase tracking-wider">
                        Step 2: Configure
                      </p>
                      <div className="p-3 rounded-lg bg-[var(--od-accent-muted)] border border-[var(--od-accent)]/20">
                        <p className="text-xs text-[var(--od-text-secondary)]">Selected number</p>
                        <p className="text-sm font-semibold text-[var(--od-accent)]">{selectedNumber}</p>
                      </div>
                      <div>
                        <label className="text-xs text-[var(--od-text-secondary)] mb-1 flex items-center gap-1">
                          <PhoneForwarded className="w-3 h-3" /> Forward calls to (your business number) *
                        </label>
                        <input
                          type="tel"
                          value={provisionForwarding}
                          onChange={(e) => setProvisionForwarding(e.target.value)}
                          placeholder="+61 400 123 456"
                          className="w-full px-3 py-2 rounded-lg bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-[var(--od-text-secondary)] mb-1 flex items-center gap-1">
                            <Tag className="w-3 h-3" /> Label
                          </label>
                          <input
                            type="text"
                            value={provisionLabel}
                            onChange={(e) => setProvisionLabel(e.target.value)}
                            placeholder="e.g. Google Ads"
                            className="w-full px-3 py-2 rounded-lg bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] text-sm text-[var(--od-text-primary)] placeholder:text-[var(--od-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--od-text-secondary)] mb-1 flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Source
                          </label>
                          <select
                            value={provisionSource}
                            onChange={(e) => setProvisionSource(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-[var(--od-bg-tertiary)] border border-[var(--od-border-subtle)] text-sm text-[var(--od-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--od-accent)]"
                          >
                            <option value="">Select source</option>
                            <option value="google_ads">Google Ads</option>
                            <option value="facebook">Facebook Ads</option>
                            <option value="website">Website</option>
                            <option value="print">Print / Flyer</option>
                            <option value="signage">Signage / Vehicle</option>
                            <option value="directory">Directory</option>
                            <option value="offline">Other Offline</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Error */}
                  {provisionError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-400">
                      {provisionError}
                    </div>
                  )}

                  {/* Action */}
                  {selectedNumber && (
                    <div className="flex justify-end gap-2 pt-2 border-t border-[var(--od-border-subtle)]">
                      <Button variant="secondary" size="sm" onClick={() => setShowProvisionModal(false)}>
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleProvision}
                        disabled={provisioning || !provisionForwarding}
                      >
                        {provisioning ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Plus className="w-3.5 h-3.5" />
                        )}
                        Provision Number
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
