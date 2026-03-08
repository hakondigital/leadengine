'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Calculator,
  Plus,
  Trash2,
  ArrowLeft,
  DollarSign,
  Eye,
  X,
  Edit3,
} from 'lucide-react';

interface ServiceType {
  id: string;
  name: string;
  unit: string;
  minPrice: number;
  maxPrice: number;
}

const mockServices: ServiceType[] = [
  { id: '1', name: 'Kitchen Renovation', unit: 'per project', minPrice: 8000, maxPrice: 25000 },
  { id: '2', name: 'Bathroom Renovation', unit: 'per project', minPrice: 5000, maxPrice: 18000 },
  { id: '3', name: 'Interior Painting', unit: 'per room', minPrice: 300, maxPrice: 800 },
  { id: '4', name: 'Electrical Rewire', unit: 'per project', minPrice: 3000, maxPrice: 12000 },
  { id: '5', name: 'Roof Repair', unit: 'per sqm', minPrice: 50, maxPrice: 150 },
  { id: '6', name: 'Deck Building', unit: 'per sqm', minPrice: 200, maxPrice: 500 },
];

export default function EstimatorPage() {
  const { organization } = useOrganization();
  const [services, setServices] = useState(mockServices);
  const [showForm, setShowForm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [newService, setNewService] = useState({ name: '', unit: '', minPrice: '', maxPrice: '' });

  const handleAdd = () => {
    if (!newService.name.trim()) return;
    setServices((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: newService.name,
        unit: newService.unit || 'per project',
        minPrice: Number(newService.minPrice) || 0,
        maxPrice: Number(newService.maxPrice) || 0,
      },
    ]);
    setNewService({ name: '', unit: '', minPrice: '', maxPrice: '' });
    setShowForm(false);
  };

  const removeService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
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
                <Calculator className="w-5 h-5 text-[var(--le-accent)]" />
                <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
                  Ballpark Estimator
                </h1>
              </div>
              <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
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
                    <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1.5 block">Service Name</label>
                    <Input
                      placeholder="e.g., Plumbing Repair"
                      value={newService.name}
                      onChange={(e) => setNewService((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1.5 block">Unit</label>
                    <Input
                      placeholder="e.g., per project, per sqm"
                      value={newService.unit}
                      onChange={(e) => setNewService((p) => ({ ...p, unit: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1.5 block">Min Price ($)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newService.minPrice}
                      onChange={(e) => setNewService((p) => ({ ...p, minPrice: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1.5 block">Max Price ($)</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newService.maxPrice}
                      onChange={(e) => setNewService((p) => ({ ...p, maxPrice: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button size="sm" onClick={handleAdd}>
                    <Plus className="w-3.5 h-3.5" />
                    Add Service
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
              <DollarSign className="w-4 h-4 text-[var(--le-accent)]" />
              <CardTitle>Service Pricing</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <EmptyState
                icon={Calculator}
                title="No services configured"
                description="Add service types with pricing ranges for your ballpark estimator."
                action={{ label: 'Add Service', onClick: () => setShowForm(true) }}
              />
            ) : (
              <div className="space-y-2">
                {services.map((service, i) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between p-3 rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)] hover:border-[var(--le-accent)]/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgba(31,155,90,0.08)]">
                        <DollarSign className="w-4 h-4 text-[#1F9B5A]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--le-text-primary)]">{service.name}</p>
                        <p className="text-xs text-[var(--le-text-muted)]">{service.unit}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--le-text-primary)]">
                          ${service.minPrice.toLocaleString()} - ${service.maxPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-sm" title="Edit">
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => removeService(service.id)} title="Remove">
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
                <div className="max-w-md mx-auto bg-[var(--le-bg-tertiary)] rounded-[var(--le-radius-lg)] p-6 border border-[var(--le-border-subtle)]">
                  <h3 className="text-lg font-bold text-[var(--le-text-primary)] text-center mb-1">
                    Get a Ballpark Estimate
                  </h3>
                  <p className="text-xs text-[var(--le-text-tertiary)] text-center mb-4">
                    Select a service to see approximate pricing
                  </p>
                  <div className="space-y-2">
                    {services.slice(0, 4).map((service) => (
                      <div
                        key={service.id}
                        className="flex items-center justify-between p-3 bg-white rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)]"
                      >
                        <span className="text-sm text-[var(--le-text-primary)]">{service.name}</span>
                        <span className="text-sm font-semibold text-[var(--le-accent)]">
                          ${service.minPrice.toLocaleString()} - ${service.maxPrice.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-3 bg-[var(--le-accent-muted)] rounded-[var(--le-radius-md)] border border-[rgba(79,209,229,0.2)]">
                    <p className="text-[10px] text-[var(--le-text-muted)] text-center">
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
