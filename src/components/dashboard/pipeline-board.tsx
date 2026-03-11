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
    <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 lg:-mx-6 lg:px-6 snap-x">
      {pipelineStages.map((stage) => {
        const stageLeads = getLeadsByStatus(stage.id);
        const isOver = draggedOver === stage.id;

        return (
          <div
            key={stage.id}
            className={cn(
              'flex flex-col min-w-[280px] w-[280px] lg:flex-1 lg:min-w-0 snap-start rounded-[var(--od-radius-lg)] border transition-all duration-200',
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
  );
}

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
