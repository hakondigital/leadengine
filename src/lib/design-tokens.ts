// Design Token System — Odyssey
// Premium enterprise aesthetic — cool slate/blue, Palantir/Linear/Vercel inspired

export const tokens = {
  colors: {
    // Surfaces — clean and airy
    bg: {
      primary: '#F7F8FA',
      secondary: '#FFFFFF',
      tertiary: '#F0F2F5',
      elevated: '#E8EBF0',
      hover: '#E1E5EB',
      muted: '#D0D5DD',
    },
    // Text — high contrast hierarchy
    text: {
      primary: '#111827',
      secondary: '#374151',
      tertiary: '#6B7280',
      muted: '#9CA3AF',
      inverse: '#FFFFFF',
    },
    // Accent — blue (professional, trustworthy)
    accent: {
      primary: '#3B82F6',
      hover: '#2563EB',
      muted: 'rgba(59, 130, 246, 0.08)',
      text: '#2563EB',
    },
    // Status
    status: {
      new: '#3B82F6',
      reviewed: '#8B5CF6',
      contacted: '#06B6D4',
      quoted: '#F59E0B',
      won: '#10B981',
      lost: '#EF4444',
    },
    // Priority
    priority: {
      critical: '#DC2626',
      high: '#F59E0B',
      medium: '#3B82F6',
      low: '#9CA3AF',
    },
    // Borders
    border: {
      subtle: '#F0F2F5',
      default: '#E5E7EB',
      strong: '#D1D5DB',
      accent: 'rgba(59, 130, 246, 0.25)',
    },
    // Semantic
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    '2xl': '32px',
    '3xl': '48px',
    '4xl': '64px',
    '5xl': '96px',
  },

  radii: {
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    '2xl': '20px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 2px rgba(28, 42, 58, 0.06)',
    md: '0 4px 12px rgba(28, 42, 58, 0.08)',
    lg: '0 8px 24px rgba(28, 42, 58, 0.10)',
    xl: '0 16px 48px rgba(28, 42, 58, 0.12)',
    glow: '0 0 20px rgba(79, 209, 229, 0.12)',
    card: '0 1px 3px rgba(28, 42, 58, 0.06), 0 0 0 1px rgba(28, 42, 58, 0.04)',
  },

  typography: {
    fontFamily: {
      display: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      body: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      mono: '"JetBrains Mono", "Fira Code", monospace',
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
      sm: ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '0.005em' }],
      base: ['0.875rem', { lineHeight: '1.5rem', letterSpacing: '0' }],
      lg: ['1rem', { lineHeight: '1.5rem', letterSpacing: '-0.005em' }],
      xl: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
      '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
      '5xl': ['3rem', { lineHeight: '3rem', letterSpacing: '-0.035em' }],
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },

  motion: {
    duration: {
      fast: '120ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      default: 'cubic-bezier(0.16, 1, 0.3, 1)',
      in: 'cubic-bezier(0.55, 0, 1, 0.45)',
      out: 'cubic-bezier(0, 0.55, 0.45, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  },
} as const;

// Framer Motion variants for reuse
export const motionVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  slideUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
  slideIn: {
    initial: { opacity: 0, x: -12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -8 },
    transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.97 },
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
  stagger: {
    animate: { transition: { staggerChildren: 0.05 } },
  },
};

// Lead pipeline stage config
export const pipelineStages = [
  { id: 'new', label: 'New', color: '#3B82F6' },
  { id: 'reviewed', label: 'Reviewed', color: '#8B5CF6' },
  { id: 'contacted', label: 'Contacted', color: '#06B6D4' },
  { id: 'quote_sent', label: 'Quote Sent', color: '#F59E0B' },
  { id: 'won', label: 'Won', color: '#10B981' },
  { id: 'lost', label: 'Lost', color: '#EF4444' },
] as const;

export type PipelineStage = typeof pipelineStages[number]['id'];
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
