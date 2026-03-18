'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
  Phone,
  Mail,
  Sparkles,
  GripVertical,
  MapPin,
  LayoutGrid,
  List,
  ChevronRight,
} from 'lucide-react';
import type { Lead, LeadStatus } from '@/lib/database.types';
import { pipelineStages } from '@/lib/design-tokens';

interface PipelineBoardProps {
  leads: Lead[];
  onLeadClick: (lead: Lead) => void;
  onStatusChange: (leadId: string, newStatus: LeadStatus) => void;
}

export function PipelineBoard({ leads, onLeadClick, onStatusChange }: PipelineBoardProps) {
  const [draggedOver, setDraggedOver] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'board' | 'list'>('list');
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const getLeadsByStatus = (status: string) =>
    leads.filter((l) => l.status === status);

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDraggedOver(null);
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      onStatusChange(leadId, targetStatus as LeadStatus);
    }
  };

  const handleDragOver = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDraggedOver(status);
  };

  return (
    <div>
      {/* Mobile view toggle */}
      <div className="flex items-center gap-2 mb-4 lg:hidden">
        <button
          onClick={() => setMobileView('list')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[44px]',
            mobileView === 'list'
              ? 'bg-[var(--od-accent)]/10 text-[var(--od-accent)]'
              : 'text-[var(--od-text-muted)] hover:bg-white/[0.06]'
          )}
        >
          <List className="w-4 h-4" />
          List
        </button>
        <button
          onClick={() => setMobileView('board')}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-h-[44px]',
            mobileView === 'board'
              ? 'bg-[var(--od-accent)]/10 text-[var(--od-accent)]'
              : 'text-[var(--od-text-muted)] hover:bg-white/[0.06]'
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          Board
        </button>
      </div>

      {/* Mobile list view */}
      {mobileView === 'list' && (
        <div className="lg:hidden space-y-2">
          {pipelineStages.map((stage) => {
            const stageLeads = getLeadsByStatus(stage.id);
            const isExpanded = expandedStage === stage.id;

            return (
              <div
                key={stage.id}
                className="rounded-[var(--od-radius-lg)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)]/50 overflow-hidden"
              >
                {/* Stage header — tappable */}
                <button
                  onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                  className="w-full flex items-center justify-between p-3.5 min-h-[48px]"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    <span className="text-sm font-semibold text-[var(--od-text-secondary)]">
                      {stage.label}
                    </span>
                    <span className="text-xs font-medium text-[var(--od-text-muted)] bg-[var(--od-bg-tertiary)] px-2 py-0.5 rounded-full">
                      {stageLeads.length}
                    </span>
                  </div>
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 text-[var(--od-text-muted)] transition-transform duration-200',
                      isExpanded && 'rotate-90'
                    )}
                  />
                </button>

                {/* Expanded lead list */}
                {isExpanded && (
                  <div className="border-t border-[var(--od-border-subtle)]">
                    {stageLeads.length === 0 ? (
                      <div className="flex items-center justify-center py-6 text-xs text-[var(--od-text-muted)]">
                        No leads in this stage
                      </div>
                    ) : (
                      <div className="divide-y divide-[var(--od-border-subtle)]">
                        {stageLeads.map((lead) => (
                          <button
                            key={lead.id}
                            onClick={() => onLeadClick(lead)}
                            className="w-full flex items-center gap-3 p-3.5 hover:bg-white/[0.03] transition-colors text-left min-h-[56px]"
                          >
                            {/* AI score indicator */}
                            <div className="shrink-0">
                              {lead.ai_score !== null && lead.ai_score !== undefined ? (
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border"
                                  style={{
                                    borderColor:
                                      lead.ai_score >= 70 ? '#4ADE80' : lead.ai_score >= 40 ? '#F59E0B' : '#EF6C6C',
                                    color:
                                      lead.ai_score >= 70 ? '#4ADE80' : lead.ai_score >= 40 ? '#F59E0B' : '#EF6C6C',
                                  }}
                                >
                                  {lead.ai_score}
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-xs text-[var(--od-text-muted)]">
                                  ?
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[var(--od-text-primary)] truncate">
                                {lead.first_name} {lead.last_name}
                              </p>
                              <p className="text-xs text-[var(--od-text-muted)] truncate">
                                {lead.service_type || lead.email}
                              </p>
                            </div>
                            <span className="text-[10px] text-[var(--od-text-muted)] shrink-0">
                              {formatRelativeTime(lead.created_at)}
                            </span>
                            <ChevronRight className="w-4 h-4 text-[var(--od-text-muted)] shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile board view (horizontal scroll) — shown when toggled */}
      {mobileView === 'board' && (
        <div className="lg:hidden flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 snap-x">
          {pipelineStages.map((stage) => {
            const stageLeads = getLeadsByStatus(stage.id);

            return (
              <div
                key={stage.id}
                className="flex flex-col min-w-[240px] w-[240px] snap-start rounded-[var(--od-radius-lg)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)]/50"
              >
                <div className="flex items-center justify-between p-3 border-b border-[var(--od-border-subtle)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
                    <span className="text-xs font-semibold text-[var(--od-text-secondary)]">{stage.label}</span>
                  </div>
                  <span className="text-xs font-medium text-[var(--od-text-muted)] bg-[var(--od-bg-tertiary)] px-2 py-0.5 rounded-full">
                    {stageLeads.length}
                  </span>
                </div>
                <div className="flex-1 p-2 space-y-2 min-h-[120px] max-h-[50vh] overflow-y-auto">
                  {stageLeads.length === 0 ? (
                    <div className="flex items-center justify-center h-20 text-xs text-[var(--od-text-muted)]">
                      No leads
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <MobilePipelineCard key={lead.id} lead={lead} onClick={() => onLeadClick(lead)} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Desktop board view (drag & drop) */}
      <div className="hidden lg:flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 snap-x">
        {pipelineStages.map((stage) => {
          const stageLeads = getLeadsByStatus(stage.id);
          const isOver = draggedOver === stage.id;

          return (
            <div
              key={stage.id}
              className={cn(
                'flex flex-col flex-1 min-w-0 snap-start rounded-[var(--od-radius-lg)] border transition-all duration-200',
                isOver
                  ? 'border-[var(--od-accent)]/30 bg-[var(--od-accent-muted)]'
                  : 'border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)]/50'
              )}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={() => setDraggedOver(null)}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between p-3 border-b border-[var(--od-border-subtle)]">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span className="text-xs font-semibold text-[var(--od-text-secondary)]">
                    {stage.label}
                  </span>
                </div>
                <span className="text-xs font-medium text-[var(--od-text-muted)] bg-[var(--od-bg-tertiary)] px-2 py-0.5 rounded-full">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-280px)] overflow-y-auto">
                {stageLeads.length === 0 ? (
                  <div className="flex items-center justify-center h-24 text-xs text-[var(--od-text-muted)]">
                    No leads
                  </div>
                ) : (
                  stageLeads.map((lead, index) => (
                    <PipelineCard
                      key={lead.id}
                      lead={lead}
                      onClick={() => onLeadClick(lead)}
                      index={index}
                      stageColor={stage.color}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Desktop draggable card
function PipelineCard({
  lead,
  onClick,
  index,
  stageColor,
}: {
  lead: Lead;
  onClick: () => void;
  index: number;
  stageColor: string;
}) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', lead.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] p-3 hover:border-[var(--od-border-default)] transition-all duration-200 cursor-pointer group active:scale-[0.98]"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-sm font-semibold text-[var(--od-text-primary)] truncate leading-tight">
          {lead.first_name} {lead.last_name}
        </h4>
        <GripVertical className="w-3.5 h-3.5 text-[var(--od-text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-grab" />
      </div>

      {lead.service_type && (
        <p className="text-xs text-[var(--od-text-tertiary)] mb-2 truncate">
          {lead.service_type}
        </p>
      )}

      <div className="flex items-center gap-2 text-[10px] text-[var(--od-text-muted)] mb-2">
        {lead.location && (
          <span className="flex items-center gap-0.5 truncate">
            <MapPin className="w-2.5 h-2.5" />
            {lead.location}
          </span>
        )}
      </div>

      {/* AI score bar */}
      {lead.ai_score !== null && lead.ai_score !== undefined && (
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-2.5 h-2.5 text-[var(--od-accent)]" />
          <div className="flex-1 h-1 rounded-full bg-[var(--od-bg-elevated)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${lead.ai_score}%`,
                backgroundColor:
                  lead.ai_score >= 70 ? '#4ADE80' : lead.ai_score >= 40 ? '#F59E0B' : '#EF6C6C',
              }}
            />
          </div>
          <span className="text-[10px] text-[var(--od-text-muted)] w-5 text-right">{lead.ai_score}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {lead.phone && <Phone className="w-3 h-3 text-[var(--od-text-muted)]" />}
          <Mail className="w-3 h-3 text-[var(--od-text-muted)]" />
        </div>
        <span className="text-[10px] text-[var(--od-text-muted)]">
          {formatRelativeTime(lead.created_at)}
        </span>
      </div>
    </div>
  );
}

// Mobile simplified card (no drag)
function MobilePipelineCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-[var(--od-radius-md)] border border-[var(--od-border-subtle)] bg-[var(--od-bg-secondary)] p-3 text-left transition-all active:scale-[0.98] min-h-[44px]"
    >
      <h4 className="text-sm font-semibold text-[var(--od-text-primary)] truncate">
        {lead.first_name} {lead.last_name}
      </h4>
      {lead.service_type && (
        <p className="text-xs text-[var(--od-text-tertiary)] truncate mt-0.5">
          {lead.service_type}
        </p>
      )}
      <div className="flex items-center justify-between mt-2">
        {lead.ai_score !== null && lead.ai_score !== undefined ? (
          <span
            className="text-[10px] font-bold"
            style={{
              color: lead.ai_score >= 70 ? '#4ADE80' : lead.ai_score >= 40 ? '#F59E0B' : '#EF6C6C',
            }}
          >
            Score: {lead.ai_score}
          </span>
        ) : (
          <span />
        )}
        <span className="text-[10px] text-[var(--od-text-muted)]">
          {formatRelativeTime(lead.created_at)}
        </span>
      </div>
    </button>
  );
}
