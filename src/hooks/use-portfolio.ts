'use client';

import { useState, useEffect, useCallback } from 'react';

export interface PortfolioImage {
  url: string;
  caption?: string;
  is_cover?: boolean;
}

export interface PortfolioProject {
  id: string;
  organization_id: string;
  title: string;
  description?: string;
  category?: string;
  client_name?: string;
  location?: string;
  completed_date?: string;
  images: PortfolioImage[];
  tags: string[];
  is_featured: boolean;
  is_published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface PortfolioState {
  projects: PortfolioProject[];
  loading: boolean;
  error: string | null;
}

export function usePortfolio(organizationId: string | undefined) {
  const [state, setState] = useState<PortfolioState>({
    projects: [],
    loading: true,
    error: null,
  });

  const fetchProjects = useCallback(async () => {
    if (!organizationId) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    try {
      const res = await fetch(`/api/portfolio?organization_id=${organizationId}`);
      if (!res.ok) throw new Error('Failed to fetch portfolio projects');
      const data = await res.json();
      setState({ projects: data.projects || [], loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
    }
  }, [organizationId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const createProject = useCallback(async (project: {
    title: string;
    description?: string;
    category?: string;
    client_name?: string;
    location?: string;
    completed_date?: string;
    images?: PortfolioImage[];
    tags?: string[];
    is_featured?: boolean;
    is_published?: boolean;
  }) => {
    if (!organizationId) return null;

    const res = await fetch('/api/portfolio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...project, organization_id: organizationId }),
    });

    if (res.ok) {
      const created = await res.json();
      setState((s) => ({
        ...s,
        projects: [created, ...s.projects],
      }));
      return created;
    }
    return null;
  }, [organizationId]);

  const updateProject = useCallback(async (
    projectId: string,
    updates: Partial<Pick<PortfolioProject, 'title' | 'description' | 'category' | 'client_name' | 'location' | 'completed_date' | 'images' | 'tags' | 'is_featured' | 'is_published' | 'sort_order'>>
  ) => {
    const res = await fetch(`/api/portfolio/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      const updated = await res.json();
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) => (p.id === projectId ? { ...p, ...updated } : p)),
      }));
      return updated;
    }
    return null;
  }, []);

  const deleteProject = useCallback(async (projectId: string) => {
    const res = await fetch(`/api/portfolio/${projectId}`, {
      method: 'DELETE',
    });

    if (res.ok) {
      setState((s) => ({
        ...s,
        projects: s.projects.filter((p) => p.id !== projectId),
      }));
      return true;
    }
    return false;
  }, []);

  return {
    ...state,
    refetch: fetchProjects,
    createProject,
    updateProject,
    deleteProject,
  };
}
