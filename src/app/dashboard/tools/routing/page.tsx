'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useRoutingRules } from '@/hooks/use-routing-rules';
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
  Trash2,
} from 'lucide-react';

const typeConfig: Record<string, { icon: typeof Shuffle; color: string; label: string; bg: string }> = {
  round_robin: { icon: Shuffle, color: '#4070D0', label: 'Round Robin', bg: 'rgba(64,112,208,0.08)' },
  service_type: { icon: Wrench, color: '#1F9B5A', label: 'Service Type', bg: 'rgba(31,155,90,0.08)' },
  location: { icon: MapPin, color: '#C48020', label: 'Location', bg: 'rgba(196,128,32,0.08)' },
  availability: { icon: Clock, color: '#8B7CF6', label: 'Availability', bg: 'rgba(139,124,246,0.08)' },
};

export default function RoutingPage() {
  const { organization } = useOrganization();
  const { rules, loading, createRule, toggleRule, deleteRule } = useRoutingRules(organization?.id);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    conditions: '',
    type: 'round_robin' as keyof typeof typeConfig,
    assignedTo: '',
  });

  const handleCreate = async () => {
    if (!newRule.name.trim()) return;
    setSaving(true);
    await createRule({
      name: newRule.name,
      type: newRule.type,
      conditions_text: newRule.conditions,
      assigned_names: newRule.assignedTo.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setNewRule({ name: '', conditions: '', type: 'round_robin', assignedTo: '' });
    setShowForm(false);
    setSaving(false);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--od-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--od-border-subtle)]">
        <div className="px-4 lg:px-6 py-4">
          <a
            href="/dashboard/tools"
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--od-text-muted)] hover:text-[var(--od-text-secondary)] mb-2 transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Tools
          </a>
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
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Rule Name</label>
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
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Rule Type</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(typeConfig).map(([key, config]) => {
                        const TypeIcon = config.icon;
                        return (
                          <button
                            key={key}
                            onClick={() => setNewRule((p) => ({ ...p, type: key as keyof typeof typeConfig }))}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--od-radius-sm)] border text-xs font-medium transition-colors ${
                              newRule.type === key
                                ? 'border-[var(--od-accent)] bg-[var(--od-accent-muted)] text-[var(--od-accent)]'
                                : 'border-[var(--od-border-subtle)] text-[var(--od-text-secondary)] hover:border-[var(--od-accent)]/30'
                            }`}
                          >
                            <TypeIcon className="w-3 h-3" style={{ color: config.color }} />
                            {config.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Assign To (comma-separated)</label>
                    <Input
                      placeholder="e.g., David K., Sarah M."
                      value={newRule.assignedTo}
                      onChange={(e) => setNewRule((p) => ({ ...p, assignedTo: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button size="sm" onClick={handleCreate} disabled={saving}>
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
                          className="flex items-center justify-center w-10 h-10 rounded-lg"
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
                            <div className="flex items-center gap-1 mt-1">
                              {rule.assignedMembers.map((member) => (
                                <Badge key={member} variant="default" size="sm">{member}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
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
