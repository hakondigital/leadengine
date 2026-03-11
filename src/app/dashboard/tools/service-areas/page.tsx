'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useServiceAreas } from '@/hooks/use-service-areas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Map,
  Plus,
  Trash2,
  User,
  ArrowLeft,
  MapPin,
  ShieldCheck,
  X,
} from 'lucide-react';

export default function ServiceAreasPage() {
  const { organization } = useOrganization();
  const { areas, loading, createArea, deleteArea } = useServiceAreas(organization?.id);
  const [showForm, setShowForm] = useState(false);
  const [autoReject, setAutoReject] = useState(false);
  const [newArea, setNewArea] = useState({ name: '', postcodes: '', suburbs: '', assignedTo: '' });
  const [saving, setSaving] = useState(false);

  const handleAddArea = async () => {
    if (!newArea.name.trim()) return;
    setSaving(true);
    await createArea({
      name: newArea.name,
      postcodes: newArea.postcodes.split(',').map((p) => p.trim()).filter(Boolean),
      suburbs: newArea.suburbs.split(',').map((s) => s.trim()).filter(Boolean),
      assigned_to: newArea.assignedTo || null,
    });
    setNewArea({ name: '', postcodes: '', suburbs: '', assignedTo: '' });
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
                <Map className="w-5 h-5 text-[var(--od-accent)]" />
                <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
                  Service Areas
                </h1>
              </div>
              <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
                Define where you operate and auto-filter leads by location
              </p>
            </div>
            <Button size="sm" onClick={() => setShowForm(true)}>
              <Plus className="w-3.5 h-3.5" />
              Add Area
            </Button>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* Auto-reject toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(232,99,108,0.08)]">
                  <ShieldCheck className="w-4 h-4 text-[#E8636C]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--od-text-primary)]">Auto-reject outside service area</p>
                  <p className="text-xs text-[var(--od-text-tertiary)]">Automatically decline leads from postcodes outside your defined areas</p>
                </div>
              </div>
              <button
                onClick={() => setAutoReject(!autoReject)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  autoReject ? 'bg-[var(--od-accent)]' : 'bg-[var(--od-bg-tertiary)]'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                    autoReject ? 'translate-x-[18px]' : 'translate-x-[3px]'
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Add Area Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Add Service Area</CardTitle>
                  <Button variant="ghost" size="icon-sm" onClick={() => setShowForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Area Name</label>
                    <Input
                      placeholder="e.g., Eastern Suburbs"
                      value={newArea.name}
                      onChange={(e) => setNewArea((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Assigned Team Member</label>
                    <Input
                      placeholder="e.g., John D."
                      value={newArea.assignedTo}
                      onChange={(e) => setNewArea((prev) => ({ ...prev, assignedTo: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Postcodes (comma-separated)</label>
                    <Input
                      placeholder="e.g., 2000, 2010, 2011"
                      value={newArea.postcodes}
                      onChange={(e) => setNewArea((prev) => ({ ...prev, postcodes: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Suburbs (comma-separated)</label>
                    <Input
                      placeholder="e.g., Bondi, Bronte, Coogee"
                      value={newArea.suburbs}
                      onChange={(e) => setNewArea((prev) => ({ ...prev, suburbs: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button size="sm" onClick={handleAddArea} disabled={saving}>
                    <Plus className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Add Area'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Areas List */}
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-[var(--od-text-muted)] py-4">
            <div className="w-3 h-3 border-2 border-[var(--od-accent)] border-t-transparent rounded-full animate-spin" />
            Loading service areas...
          </div>
        ) : areas.length === 0 ? (
          <EmptyState
            icon={Map}
            title="No service areas defined"
            description="Define your service areas to automatically filter leads by location."
            action={{ label: 'Add Area', onClick: () => setShowForm(true) }}
          />
        ) : (
          <div className="space-y-3">
            {areas.map((area, i) => (
              <motion.div
                key={area.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[rgba(64,112,208,0.08)]">
                          <MapPin className="w-5 h-5 text-[#4070D0]" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-[var(--od-text-primary)]">{area.name}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {area.assigned_to && (
                              <span className="flex items-center gap-1 text-xs text-[var(--od-text-muted)]">
                                <User className="w-3 h-3" />
                                {area.assigned_to}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => deleteArea(area.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-[#C44E56]" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {area.postcodes.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider mb-1">Postcodes</p>
                          <div className="flex flex-wrap gap-1">
                            {area.postcodes.map((pc) => (
                              <Badge key={pc} variant="default" size="sm">{pc}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {area.suburbs.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold text-[var(--od-text-muted)] uppercase tracking-wider mb-1">Suburbs</p>
                          <div className="flex flex-wrap gap-1">
                            {area.suburbs.map((sub) => (
                              <Badge key={sub} variant="accent" size="sm">{sub}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
