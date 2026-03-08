'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useOrganization } from '@/hooks/use-organization';
import { usePortfolio } from '@/hooks/use-portfolio';
import { usePlan } from '@/hooks/use-plan';
import { UpgradeBanner } from '@/components/upgrade-banner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/components/ui/toast';
import {
  Image,
  Plus,
  MapPin,
  Calendar,
  Star,
  Eye,
  EyeOff,
  ArrowLeftRight,
  X,
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  location: string;
  date: string;
  category: string;
  featured: boolean;
  published: boolean;
  beforeLabel: string;
  afterLabel: string;
}

const mockProjects: Project[] = [
  { id: '1', title: 'Modern Kitchen Transformation', location: 'Neutral Bay, NSW', date: '2026-02-15', category: 'Kitchen', featured: true, published: true, beforeLabel: 'Dated 90s kitchen with laminate benchtops', afterLabel: 'Sleek modern kitchen with stone island bench' },
  { id: '2', title: 'Luxury Bathroom Renovation', location: 'Mosman, NSW', date: '2026-01-20', category: 'Bathroom', featured: false, published: true, beforeLabel: 'Small cramped bathroom with old tiles', afterLabel: 'Spacious spa-like bathroom with frameless shower' },
  { id: '3', title: 'Complete Home Repaint', location: 'Manly, NSW', date: '2026-02-28', category: 'Painting', featured: true, published: true, beforeLabel: 'Faded exterior with peeling paint', afterLabel: 'Fresh modern colour scheme throughout' },
  { id: '4', title: 'Deck & Pergola Build', location: 'Cremorne, NSW', date: '2026-01-05', category: 'Outdoor', featured: false, published: false, beforeLabel: 'Bare backyard with patchy grass', afterLabel: 'Beautiful timber deck with covered pergola' },
  { id: '5', title: 'Electrical Upgrade', location: 'Lane Cove, NSW', date: '2025-12-10', category: 'Electrical', featured: false, published: true, beforeLabel: 'Old fuse box and outdated wiring', afterLabel: 'Modern switchboard with safety switches' },
  { id: '6', title: 'Roof Restoration', location: 'Chatswood, NSW', date: '2026-03-01', category: 'Roofing', featured: false, published: false, beforeLabel: 'Damaged tiles and rusted gutters', afterLabel: 'Restored tiles and new Colorbond gutters' },
];

const categories = ['Kitchen', 'Bathroom', 'Painting', 'Outdoor', 'Electrical', 'Roofing', 'Plumbing', 'HVAC', 'General'];

export default function PortfolioPage() {
  const { organization } = useOrganization();
  const { projects: fetchedProjects, loading, createProject, updateProject, deleteProject } = usePortfolio(organization?.id);
  const [localProjects, setLocalProjects] = useState(mockProjects);
  const { canUsePortfolio, planName, loading: planLoading } = usePlan();
  const [showAddModal, setShowAddModal] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [projectForm, setProjectForm] = useState({ title: '', category: '', location: '', description: '' });
  const { success: showSuccess } = useToast();

  if (planLoading) {
    return <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-[var(--le-accent)] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!canUsePortfolio) {
    return <UpgradeBanner feature="Portfolio" requiredPlan="Professional" currentPlan={planName} />;
  }

  const projects: Project[] = fetchedProjects.length > 0
    ? fetchedProjects.map((p) => ({
        id: p.id,
        title: p.title,
        location: p.location || '',
        date: p.completed_date || p.created_at?.split('T')[0] || '',
        category: p.category || '',
        featured: p.is_featured ?? false,
        published: p.is_published ?? false,
        beforeLabel: '',
        afterLabel: '',
      }))
    : localProjects;

  const togglePublish = (id: string) => {
    if (fetchedProjects.length > 0) {
      const proj = projects.find((p) => p.id === id) as Project | undefined;
      updateProject(id, { is_published: !proj?.published });
    } else {
      setLocalProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, published: !p.published } : p))
      );
    }
  };

  const toggleFeatured = (id: string) => {
    if (fetchedProjects.length > 0) {
      const proj = projects.find((p) => p.id === id) as Project | undefined;
      updateProject(id, { is_featured: !proj?.featured });
    } else {
      setLocalProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, featured: !p.featured } : p))
      );
    }
  };

  const openAddProject = () => {
    setProjectForm({ title: '', category: '', location: '', description: '' });
    setShowAddModal(true);
  };

  const handleCreateProject = async () => {
    if (!projectForm.title) return;
    setProjectSaving(true);
    try {
      if (fetchedProjects.length > 0) {
        await createProject({
          title: projectForm.title,
          category: projectForm.category || undefined,
          location: projectForm.location || undefined,
          description: projectForm.description || undefined,
        });
      } else {
        const newProject: Project = {
          id: `mock-${Date.now()}`,
          title: projectForm.title,
          location: projectForm.location,
          date: new Date().toISOString().split('T')[0],
          category: projectForm.category,
          featured: false,
          published: false,
          beforeLabel: '',
          afterLabel: '',
        };
        setLocalProjects((prev) => [newProject, ...prev]);
      }
      setShowAddModal(false);
      setProjectForm({ title: '', category: '', location: '', description: '' });
      showSuccess('Project added');
    } finally {
      setProjectSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 bg-[var(--le-bg-primary)]/80 backdrop-blur-xl border-b border-[var(--le-border-subtle)]">
        <div className="px-4 lg:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--le-text-primary)] tracking-tight">
              Project Portfolio
            </h1>
            <p className="text-sm text-[var(--le-text-tertiary)] mt-0.5">
              Showcase your best work with before &amp; after photos
            </p>
          </div>
          <Button size="sm" onClick={openAddProject}>
            <Plus className="w-3.5 h-3.5" />
            Add Project
          </Button>
        </div>
      </header>

      <div className="px-4 lg:px-6 py-6">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-[var(--le-text-muted)] mb-4">
            <div className="w-3 h-3 border-2 border-[var(--le-accent)] border-t-transparent rounded-full animate-spin" />
            Loading projects...
          </div>
        )}
        {projects.length === 0 ? (
          <EmptyState
            icon={Image}
            title="No projects yet"
            description="Add your first project with before and after photos to showcase your work."
            action={{ label: 'Add Project', onClick: openAddProject }}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden hover:border-[var(--le-accent)]/30 transition-colors">
                  {/* Before/After Image Placeholders */}
                  <div className="relative">
                    <div className="grid grid-cols-2 h-40">
                      <div className="bg-[var(--le-bg-tertiary)] flex flex-col items-center justify-center border-r border-[var(--le-border-subtle)] relative">
                        <Image className="w-8 h-8 text-[var(--le-text-muted)] opacity-30 mb-1" />
                        <span className="text-[10px] font-semibold text-[var(--le-text-muted)] uppercase tracking-wider">Before</span>
                      </div>
                      <div className="bg-[var(--le-bg-secondary)] flex flex-col items-center justify-center relative">
                        <Image className="w-8 h-8 text-[var(--le-accent)] opacity-30 mb-1" />
                        <span className="text-[10px] font-semibold text-[var(--le-accent)] uppercase tracking-wider">After</span>
                      </div>
                    </div>
                    {/* Center divider icon */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-[var(--le-border-subtle)] flex items-center justify-center shadow-sm">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-[var(--le-text-muted)]" />
                    </div>
                    {/* Featured badge */}
                    {project.featured && (
                      <div className="absolute top-2 left-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] bg-[#F59E0B]/15 text-[#D97706] border border-[#F59E0B]/20">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          Featured
                        </span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-[var(--le-text-primary)] mb-1">
                      {project.title}
                    </h3>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="flex items-center gap-1 text-xs text-[var(--le-text-muted)]">
                        <MapPin className="w-3 h-3" />
                        {project.location}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-[var(--le-text-muted)]">
                        <Calendar className="w-3 h-3" />
                        {project.date}
                      </span>
                    </div>
                    <Badge variant="default" size="sm">{project.category}</Badge>

                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--le-border-subtle)]">
                      <button
                        onClick={() => toggleFeatured(project.id)}
                        className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                          project.featured ? 'text-[#D97706]' : 'text-[var(--le-text-muted)] hover:text-[#D97706]'
                        }`}
                      >
                        <Star className={`w-3 h-3 ${project.featured ? 'fill-current' : ''}`} />
                        {project.featured ? 'Featured' : 'Feature'}
                      </button>
                      <button
                        onClick={() => togglePublish(project.id)}
                        className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-[var(--le-radius-sm)] transition-colors ${
                          project.published
                            ? 'text-[#1F9B5A] bg-[rgba(52,199,123,0.08)]'
                            : 'text-[var(--le-text-muted)] bg-[var(--le-bg-tertiary)]'
                        }`}
                      >
                        {project.published ? (
                          <>
                            <Eye className="w-3 h-3" />
                            Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Draft
                          </>
                        )}
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative bg-white rounded-[var(--le-radius-lg)] border border-[var(--le-border-subtle)] shadow-xl w-full max-w-md mx-4 overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--le-border-subtle)]">
              <h2 className="text-base font-semibold text-[var(--le-text-primary)]">Add Project</h2>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowAddModal(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1 block">Project Title</label>
                <input
                  value={projectForm.title}
                  onChange={(e) => setProjectForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 text-sm rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)] bg-white text-[var(--le-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--le-accent)]"
                  placeholder="e.g. Modern Kitchen Transformation"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1 block">Category</label>
                  <select
                    value={projectForm.category}
                    onChange={(e) => setProjectForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)] bg-white text-[var(--le-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--le-accent)]"
                  >
                    <option value="">Select...</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1 block">Location</label>
                  <input
                    value={projectForm.location}
                    onChange={(e) => setProjectForm((f) => ({ ...f, location: e.target.value }))}
                    className="w-full px-3 py-2 text-sm rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)] bg-white text-[var(--le-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--le-accent)]"
                    placeholder="e.g. Sydney, NSW"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--le-text-secondary)] mb-1 block">Description</label>
                <textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-[var(--le-radius-md)] border border-[var(--le-border-subtle)] bg-white text-[var(--le-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--le-accent)] resize-none"
                  placeholder="Describe the project..."
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--le-border-subtle)]">
              <Button variant="ghost" size="sm" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button size="sm" disabled={!projectForm.title || projectSaving} onClick={handleCreateProject}>
                {projectSaving ? 'Adding...' : 'Add Project'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
