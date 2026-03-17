'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useRoutingRules } from '@/hooks/use-routing-rules';
import { useTeam } from '@/hooks/use-team';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Users,
  Plus,
  Shuffle,
  MapPin,
  Wrench,
  Clock,
  X,
  Trash2,
  Check,
} from 'lucide-react';

const typeConfig: Record<string, { icon: typeof Shuffle; color: string; label: string; bg: string; description: string }> = {
  round_robin: {
    icon: Shuffle,
    color: '#4070D0',
    label: 'Round Robin',
    bg: 'rgba(64,112,208,0.08)',
    description: 'Distribute leads evenly across selected team members in rotation',
  },
  service_type: {
    icon: Wrench,
    color: '#1F9B5A',
    label: 'Service Type',
    bg: 'rgba(31,155,90,0.08)',
    description: 'Route leads to specific members based on the service requested',
  },
  location: {
    icon: MapPin,
    color: '#C48020',
    label: 'Location',
    bg: 'rgba(196,128,32,0.08)',
    description: 'Assign leads based on the customer\'s area or postcode',
  },
  availability: {
    icon: Clock,
    color: '#8B7CF6',
    label: 'Availability',
    bg: 'rgba(139,124,246,0.08)',
    description: 'Route to whoever is currently marked as available',
  },
};

export default function RoutingPage() {
  const { organization } = useOrganization();
  const { rules, loading, createRule, toggleRule, deleteRule } = useRoutingRules(organization?.id);
  const { members, loading: membersLoading } = useTeam();
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    conditions: '',
    type: 'round_robin' as keyof typeof typeConfig,
    selectedMembers: [] as string[],
  });

  const activeMembers = members.filter((m) => m.is_active);

  const toggleMember = (name: string) => {
    setNewRule((p) => ({
      ...p,
      selectedMembers: p.selectedMembers.includes(name)
        ? p.selectedMembers.filter((n) => n !== name)
        : [...p.selectedMembers, name],
    }));
  };

  const handleCreate = async () => {
    if (!newRule.name.trim() || newRule.selectedMembers.length === 0) return;
    setSaving(true);
    await createRule({
      name: newRule.name,
      type: newRule.type,
      conditions_text: newRule.conditions,
      assigned_names: newRule.selectedMembers,
    });
    setNewRule({ name: '', conditions: '', type: 'round_robin', selectedMembers: [] });
    setShowForm(false);
    setSaving(false);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--od-accent)]" />
                <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
                  Team Routing
                </h1>
              </div>
              <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
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

      <div className="px-4 lg:px-6 py-6 space-y-6 max-w-4xl">
        {/* No team members warning */}
        {!membersLoading && activeMembers.length === 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              <p className="text-sm text-amber-400 font-medium">
                No team members found. Add team members first before creating routing rules.
              </p>
              <a
                href="/dashboard/team"
                className="text-xs text-[var(--od-accent)] hover:underline mt-1 inline-block"
              >
                Go to Team Management →
              </a>
            </CardContent>
          </Card>
        )}

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
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Rule Name *</label>
                    <Input
                      placeholder="e.g., Plumbing Jobs"
                      value={newRule.name}
                      onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Conditions</label>
                    <Input
                      placeholder="e.g., Service type = Plumbing"
                      value={newRule.conditions}
                      onChange={(e) => setNewRule((p) => ({ ...p, conditions: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Rule Type</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries(typeConfig).map(([key, config]) => {
                        const TypeIcon = config.icon;
                        const isSelected = newRule.type === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setNewRule((p) => ({ ...p, type: key as keyof typeof typeConfig }))}
                            className={`flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-colors ${
                              isSelected
                                ? 'border-[var(--od-accent)] bg-[var(--od-accent-muted)]'
                                : 'border-[var(--od-border-subtle)] hover:border-[var(--od-accent)]/30'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <TypeIcon className="w-3.5 h-3.5" style={{ color: config.color }} />
                              <span className={`text-xs font-medium ${isSelected ? 'text-[var(--od-accent)]' : 'text-[var(--od-text-secondary)]'}`}>
                                {config.label}
                              </span>
                            </div>
                            <span className="text-[10px] text-[var(--od-text-muted)] leading-tight">
                              {config.description}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">
                      Assign To *
                      {newRule.selectedMembers.length > 0 && (
                        <span className="text-[var(--od-text-muted)] font-normal ml-1">
                          ({newRule.selectedMembers.length} selected)
                        </span>
                      )}
                    </label>
                    {membersLoading ? (
                      <div className="flex items-center gap-2 text-xs text-[var(--od-text-muted)] py-2">
                        <div className="w-3 h-3 border-2 border-[var(--od-accent)] border-t-transparent rounded-full animate-spin" />
                        Loading team members...
                      </div>
                    ) : activeMembers.length === 0 ? (
                      <p className="text-xs text-[var(--od-text-muted)] py-2">
                        No active team members.{' '}
                        <a href="/dashboard/team" className="text-[var(--od-accent)] hover:underline">
                          Add members
                        </a>
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {activeMembers.map((member) => {
                          const isSelected = newRule.selectedMembers.includes(member.full_name);
                          return (
                            <button
                              key={member.id}
                              onClick={() => toggleMember(member.full_name)}
                              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                                isSelected
                                  ? 'border-[var(--od-accent)] bg-[var(--od-accent-muted)] text-[var(--od-accent)]'
                                  : 'border-[var(--od-border-subtle)] text-[var(--od-text-secondary)] hover:border-[var(--od-accent)]/30'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                              <span>{member.full_name}</span>
                              {member.job_title && (
                                <span className="text-[10px] text-[var(--od-text-muted)] font-normal">
                                  · {member.job_title}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button
                    size="sm"
                    onClick={handleCreate}
                    disabled={saving || !newRule.name.trim() || newRule.selectedMembers.length === 0}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Add Rule'}
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
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-[var(--od-text-muted)] py-4">
                <div className="w-3 h-3 border-2 border-[var(--od-accent)] border-t-transparent rounded-full animate-spin" />
                Loading rules...
              </div>
            ) : rules.length === 0 ? (
              <EmptyState
                icon={Shuffle}
                title="No routing rules"
                description="Create rules to automatically assign leads to team members."
                action={{ label: 'Add Rule', onClick: () => setShowForm(true) }}
              />
            ) : (
              <div className="space-y-3">
                {rules.map((rule, i) => {
                  const tc = typeConfig[rule.type] || typeConfig.round_robin;
                  const TypeIcon = tc.icon;
                  return (
                    <motion.div
                      key={rule.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center justify-between p-4 rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)]"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                          style={{ backgroundColor: tc.bg }}
                        >
                          <TypeIcon className="w-5 h-5" style={{ color: tc.color }} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--od-text-primary)]">{rule.name}</p>
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-[4px]"
                              style={{ color: tc.color, backgroundColor: tc.bg }}
                            >
                              {tc.label}
                            </span>
                          </div>
                          {rule.conditions && (
                            <p className="text-xs text-[var(--od-text-muted)] mt-0.5">{rule.conditions}</p>
                          )}
                          {rule.assignedMembers.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              {rule.assignedMembers.map((member) => (
                                <Badge key={member} variant="default" size="sm">{member}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleRule(rule.id, !rule.active)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            rule.active ? 'bg-[var(--od-accent)]' : 'bg-[var(--od-bg-tertiary)]'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              rule.active ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            }`}
                          />
                        </button>
                        <Button variant="ghost" size="icon-sm" onClick={() => deleteRule(rule.id)}>
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
      </div>
    </div>
  );
}
