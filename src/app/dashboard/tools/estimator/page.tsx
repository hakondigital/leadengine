'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { useEstimator } from '@/hooks/use-estimator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Calculator,
  Plus,
  Trash2,

  DollarSign,
  Eye,
  X,
  Edit3,
} from 'lucide-react';

export default function EstimatorPage() {
  const { organization } = useOrganization();
  const { configs, loading, createConfig, deleteConfig } = useEstimator(organization?.id);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newService, setNewService] = useState({ name: '', unit: '', minPrice: '', maxPrice: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newService.name.trim()) return;
    setSaving(true);
    await createConfig({
      service_type: newService.name,
      unit: newService.unit || 'per project',
      min_price: Number(newService.minPrice) || 0,
      max_price: Number(newService.maxPrice) || 0,
    });
    setNewService({ name: '', unit: '', minPrice: '', maxPrice: '' });
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
                <Calculator className="w-5 h-5 text-[var(--od-accent)]" />
                <h1 className="text-xl font-bold text-[var(--od-text-primary)] tracking-tight">
                  Ballpark Estimator
                </h1>
              </div>
              <p className="text-sm text-[var(--od-text-tertiary)] mt-0.5">
                Configure pricing ranges for instant customer estimates
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                <Eye className="w-3.5 h-3.5" />
                Preview
              </Button>
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-3.5 h-3.5" />
                Add Service
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6 space-y-6">
        {/* Add Service Form */}
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Add Service Type</CardTitle>
                  <Button variant="ghost" size="icon-sm" onClick={() => setShowForm(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Service Name</label>
                    <Input
                      placeholder="e.g., Plumbing Repair"
                      value={newService.name}
                      onChange={(e) => setNewService((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Unit</label>
                    <Input
                      placeholder="e.g., per project, per sqm"
                      value={newService.unit}
                      onChange={(e) => setNewService((p) => ({ ...p, unit: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Min Price ($)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newService.minPrice}
                      onChange={(e) => setNewService((p) => ({ ...p, minPrice: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--od-text-secondary)] mb-1.5 block">Max Price ($)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newService.maxPrice}
                      onChange={(e) => setNewService((p) => ({ ...p, maxPrice: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button size="sm" onClick={handleAdd} disabled={saving}>
                    <Plus className="w-3.5 h-3.5" />
                    {saving ? 'Saving...' : 'Add Service'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Service List */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-[var(--od-accent)]" />
              <CardTitle>Service Pricing</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-[var(--od-text-muted)] py-4">
                <div className="w-3 h-3 border-2 border-[var(--od-accent)] border-t-transparent rounded-full animate-spin" />
                Loading services...
              </div>
            ) : configs.length === 0 ? (
              <EmptyState
                icon={Calculator}
                title="No services configured"
                description="Add service types with pricing ranges for your ballpark estimator."
                action={{ label: 'Add Service', onClick: () => setShowForm(true) }}
              />
            ) : (
              <div className="space-y-2">
                {configs.map((config, i) => (
                  <motion.div
                    key={config.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-3 rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] hover:border-[var(--od-accent)]/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(31,155,90,0.08)]">
                        <DollarSign className="w-4 h-4 text-[#1F9B5A]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--od-text-primary)]">{config.service_type}</p>
                        <p className="text-xs text-[var(--od-text-muted)]">{config.unit}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--od-text-primary)]">
                          ${config.min_price.toLocaleString()} - ${config.max_price.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" title="Edit">
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => deleteConfig(config.id)} title="Remove">
                          <Trash2 className="w-3.5 h-3.5 text-[#C44E56]" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {showPreview && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Customer Preview</CardTitle>
                  <Button variant="ghost" size="icon-sm" onClick={() => setShowPreview(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-w-md mx-auto bg-[var(--od-bg-tertiary)] rounded-[var(--od-radius-lg)] p-6 border border-[var(--od-border-subtle)]">
                  <h3 className="text-lg font-bold text-[var(--od-text-primary)] text-center mb-1">
                    Get a Ballpark Estimate
                  </h3>
                  <p className="text-xs text-[var(--od-text-tertiary)] text-center mb-4">
                    Select a service to see approximate pricing
                  </p>
                  <div className="space-y-2">
                    {configs.slice(0, 4).map((config) => (
                      <div
                        key={config.id}
                        className="flex items-center justify-between p-3 bg-white rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)]"
                      >
                        <span className="text-sm text-[var(--od-text-primary)]">{config.service_type}</span>
                        <span className="text-sm font-semibold text-[var(--od-accent)]">
                          ${config.min_price.toLocaleString()} - ${config.max_price.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-[var(--od-accent-muted)] rounded-[var(--od-radius-md)] border border-[rgba(79,209,229,0.2)]">
                    <p className="text-[10px] text-[var(--od-text-muted)] text-center">
                      These are approximate ranges. Contact us for an accurate quote tailored to your project.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
