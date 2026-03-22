'use client';

import type { Lead } from '@/lib/database.types';

type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

interface UrgencyResult {
  label: string;
  level: UrgencyLevel;
  score: number;
}

function parseBudgetToNumber(budget: string | null): number {
  if (!budget) return 0;
  const numbers = budget.replace(/[$,k]/gi, (m) => (m.toLowerCase() === 'k' ? '000' : ''))
    .match(/\d+/g);
  if (!numbers) return 0;
  return Math.max(...numbers.map(Number));
}

export function calculateUrgency(lead: Lead): UrgencyResult {
  let score = 0;

  // Time since last contact (0-30 points)
  if (lead.last_contacted_at) {
    const hoursSinceContact = (Date.now() - new Date(lead.last_contacted_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceContact > 72) score += 30;
    else if (hoursSinceContact > 48) score += 25;
    else if (hoursSinceContact > 24) score += 20;
    else if (hoursSinceContact > 12) score += 10;
    else score += 5;
  } else {
    const hoursSinceCreation = (Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24) score += 30;
    else if (hoursSinceCreation > 4) score += 25;
    else if (hoursSinceCreation > 1) score += 15;
    else score += 10;
  }

  // AI score (0-25 points)
  if (lead.ai_score !== null && lead.ai_score !== undefined) {
    score += Math.round((lead.ai_score / 100) * 25);
  } else {
    score += 10;
  }

  // Budget range (0-20 points)
  const budgetValue = parseBudgetToNumber(lead.budget_range);
  if (budgetValue >= 50000) score += 20;
  else if (budgetValue >= 20000) score += 15;
  else if (budgetValue >= 10000) score += 12;
  else if (budgetValue >= 5000) score += 8;
  else if (budgetValue > 0) score += 5;

  // Urgency field (0-20 points)
  const urgency = (lead.urgency || '').toLowerCase();
  if (urgency === 'emergency' || urgency === 'asap') score += 20;
  else if (urgency === 'urgent' || urgency === 'this_week') score += 15;
  else if (urgency === 'soon' || urgency === 'this_month') score += 10;
  else if (urgency === 'flexible' || urgency === 'no_rush') score += 3;
  else score += 5;

  // Status adjustments
  if (lead.status === 'new') score += 5;
  if (lead.status === 'quote_sent') score += 3;

  // Determine label and level
  let label: string;
  let level: UrgencyLevel;

  if (score >= 75) {
    label = 'Respond now';
    level = 'critical';
  } else if (score >= 50) {
    label = 'Follow up';
    level = 'high';
  } else if (score >= 30) {
    label = 'Monitor';
    level = 'medium';
  } else {
    label = 'Low priority';
    level = 'low';
  }

  return { label, level, score };
}

const levelStyles: Record<UrgencyLevel, string> = {
  critical: 'bg-red-500/10 text-red-600 border-red-500/20',
  high: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  medium: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  low: 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20',
};

interface UrgencyBadgeProps {
  lead: Lead;
  showScore?: boolean;
}

export function UrgencyBadge({ lead, showScore = false }: UrgencyBadgeProps) {
  const { label, level, score } = calculateUrgency(lead);

  if (level === 'critical') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${levelStyles.critical}`}
        title={`Urgency score: ${score}`}
      >
        <span aria-hidden="true">&#128293;</span>
        {label}
        {showScore && <span className="ml-1 opacity-60">{score}</span>}
      </span>
    );
  }

  if (level === 'high') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${levelStyles.high}`}
        title={`Urgency score: ${score}`}
      >
        <span aria-hidden="true">&#9889;</span>
        {label}
        {showScore && <span className="ml-1 opacity-60">{score}</span>}
      </span>
    );
  }

  // Medium and low — just show the score number
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${levelStyles[level]}`}
      title={`${label} — urgency score: ${score}`}
    >
      {score}
    </span>
  );
}
