'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Users,
  Plus,
  ArrowLeft,
  Shuffle,
  MapPin,
  Wrench,
  Clock,
  X,
  User,
  Trash2,
  BarChart3,
} from 'lucide-react';

interface RoutingRule {
  id: string;
  name: string;
  type: 'round_robin' | 'service_type' | 'location' | 'availability';
  conditions: string;
  assignedMembers: string[];
  active: boolean;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  assignedLeads: number;
  capacity: number;
  activeJobs: number;
}

const typeConfig: Record<string, { icon: typeof Shuffle; color: string; label: string; bg: string }> = {
  round_robin: { icon: Shuffle, color: '#4070D0', label: 'Round Robin', bg: 'rgba(64,112,208,0.08)' },
  service_type: { icon: Wrench, color: '#1F9B5A', label: 'Service Type', bg: 'rgba(31,155,90,0.08)' },
  location: { icon: MapPin, color: '#C48020', label: 'Location', bg: 'rgba(196,128,32,0.08)' },
  availability: { icon: Clock, color: '#8B7CF6', label: 'Availability', bg: 'rgba(139,124,246,0.08)' },
};

const mockRules: RoutingRule[] = [
  { id: '1', name: 'Default Round Robin', type: 'round_robin', conditions: 'All new leads', assignedMembers: ['David K.', 'Sarah M.', 'James C.'], active: true },
  { id: '2', name: 'Electrical Jobs', type: 'service_type', conditions: 'Service type = Electrical', assignedMembers: ['James C.'], active: true },
  { id: '3', name: 'North Shore Leads', type: 'location', conditions: 'Postcode in 2060-2069', assignedMembers: ['David K.'], active: true },
  { id: '4', name: 'After Hours', type: 'availability', conditions: 'Submitted outside 9am-5pm', assignedMembers: ['Sarah M.'], active: false },
];

const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'David K.', role: 'Senior Tradesperson', assignedLeads: 45, capacity: 60, activeJobs: 8 },
  { id: '2', name: 'Sarah M.', role: 'Project Manager', assignedLeads: 38, capacity: 50, activeJobs: 5 },
  { id: '3', name: 'James C.', role: 'Electrician', assignedLeads: 22, capacity: 40, activeJobs: 4 },
  { id: '4', name: 'Emma T.', role: 'Apprentice', assignedLeads: 12, capacity: 25, activeJobs: 2 },
];

export default function RoutingPage() {
  const { organization } = useOrganization();
  const [rules, setRules] = useState(mockRules);
  const [showForm, setShowForm] = useState(false);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  const removeRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <a
            href="/dashboard/tools"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--le-text-muted)] hover:text-[var(--le-text-secondary)] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Tools
          </a>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--le-accent)]" />
                <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
                  Team Routing
                </h1>
              </div>
              <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
                Auto-assign leads to team members based on rules
              </p>
            </div>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-3.5 h-3.5" />
              Add Rule
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* Add Rule Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Add Routing Rule</CardTitle>
                  <Button variant="ghost" size="icon-sm" onClick={() => setShowForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1.5 block">Rule Name</label>
                    <Input placeholder="e.g., Plumbing Jobs" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1.5 block">Conditions</label>
                    <Input placeholder="e.g., Service type = Plumbing" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1.5 block">Rule Type</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(typeConfig).map(([key, config]) => {
                        const TypeIcon = config.icon;
                        return (
                          <button
                            key={key}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--le-radius-sm)] border border-[var(--le-border-subtle)] hover:border-[var(--le-accent)]/30 text-xs font-medium text-[var(--le-text-secondary)] transition-colors"
                          >
                            <TypeIcon className="w-3 h-3" style={{ color: config.color }} />
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1.5 block">Assign To</label>
                    <Input placeholder="e.g., David K., Sarah M." />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button size="sm">
                    <Plus className="w-3.5 h-3.5" />
                    Add Rule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Assignment Rules</CardTitle>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <EmptyState
                icon={Shuffle}
                title="No routing rules"
                description="Create rules to automatically assign leads to team members."
                action={{ label: 'Add Rule', onClick: () => setShowForm(true) }}
              />
            ) : (
              <div className="space-y-3">
                {rules.map((rule, i) => {
                  const tc = typeConfig[rule.type];
                  const TypeIcon = tc.icon;
                  return (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between p-4 rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)]"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center w-10 h-10 rounded-lg"
                          style={{ backgroundColor: tc.bg }}
                        >
                          <TypeIcon className="w-5 h-5" style={{ color: tc.color }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--le-text-primary)]">{rule.name}</p>
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-[4px]"
                              style={{ color: tc.color, backgroundColor: tc.bg }}
                            >
                              {tc.label}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--le-text-muted)] mt-0.5">{rule.conditions}</p>
                          <div className="flex items-center gap-1 mt-1">
                            {rule.assignedMembers.map((member) => (
                              <Badge key={member} variant="default" size="sm">{member}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleRule(rule.id)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            rule.active ? 'bg-[var(--le-accent)]' : 'bg-[var(--le-bg-tertiary)]'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              rule.active ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            }`}
                          />
                        </button>
                        <Button variant="ghost" size="icon-sm" onClick={() => removeRule(rule.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-[#C44E56]" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Member Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--le-accent)]" />
              <CardTitle>Assignment Stats</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {mockTeamMembers.map((member, i) => {
                const utilization = Math.round((member.assignedLeads / member.capacity) * 100);
                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="p-4 rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)]"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--le-bg-tertiary)]">
                        <User className="w-4 h-4 text-[var(--le-text-muted)]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--le-text-primary)]">{member.name}</p>
                        <p className="text-xs text-[var(--le-text-muted)]">{member.role}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--le-text-tertiary)]">Capacity</span>
                        <span className="font-medium text-[var(--le-text-secondary)]">{member.assignedLeads}/{member.capacity} leads</span>
                      </div>
                      <div className="h-1.5 bg-[var(--le-bg-tertiary)] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${utilization}%` }}
                          transition={{ duration: 0.6, delay: 0.1 + i * 0.1 }}
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: utilization > 80 ? '#E8636C' : utilization > 60 ? '#F0A030' : '#4FD1E5',
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--le-text-muted)]">{member.activeJobs} active jobs</span>
                        <span className="font-medium" style={{
                          color: utilization > 80 ? '#C44E56' : utilization > 60 ? '#C48020' : '#2DA8BC',
                        }}>
                          {utilization}%
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
