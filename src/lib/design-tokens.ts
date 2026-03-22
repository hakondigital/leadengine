// Design Token System — Odyssey
// Premium enterprise aesthetic — cool slate/blue, Palantir/Linear/Vercel inspired

export const tokens = {
  colors: {
    // Surfaces
    bg: {
      primary: '#FAFAFA',
      secondary: '#FFFFFF',
      tertiary: '#F5F5F5',
      elevated: '#EBEBEB',
      hover: '#E5E5E5',
      muted: '#D4D4D4',
    },
    // Text
    text: {
      primary: '#0A0A0A',
      secondary: '#404040',
      tertiary: '#737373',
      muted: '#A3A3A3',
      inverse: '#FFFFFF',
    },
    // Accent — indigo
    accent: {
      primary: '#6366F1',
      hover: '#4F46E5',
      muted: 'rgba(99, 102, 241, 0.08)',
      text: '#4F46E5',
    },
    // Status
    status: {
      new: '#6366F1',
      reviewed: '#8B5CF6',
      contacted: '#0EA5E9',
      quoted: '#EAB308',
      won: '#22C55E',
      lost: '#EF4444',
    },
    // Priority
    priority: {
      critical: '#DC2626',
      high: '#F59E0B',
      medium: '#6366F1',
      low: '#A3A3A3',
    },
    // Borders — opacity-based
    border: {
      subtle: 'rgba(0, 0, 0, 0.04)',
      default: 'rgba(0, 0, 0, 0.08)',
      strong: 'rgba(0, 0, 0, 0.15)',
      accent: 'rgba(99, 102, 241, 0.25)',
    },
    // Semantic
    success: '#22C55E',
    warning: '#EAB308',
    error: '#EF4444',
    info: '#6366F1',
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
  { id: 'new', label: 'New', color: '#6366F1' },
  { id: 'reviewed', label: 'Reviewed', color: '#8B5CF6' },
  { id: 'contacted', label: 'Contacted', color: '#0EA5E9' },
  { id: 'quote_sent', label: 'Quote Sent', color: '#EAB308' },
  { id: 'won', label: 'Won', color: '#22C55E' },
  { id: 'lost', label: 'Lost', color: '#EF4444' },
] as const;

export type PipelineStage = typeof pipelineStages[number]['id'];
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
