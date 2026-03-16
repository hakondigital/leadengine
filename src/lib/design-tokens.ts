// Design Token System — Odyssey
// Premium agent operating aesthetic — dark mineral surfaces with cyan system accents

export const tokens = {
  colors: {
    bg: {
      primary: '#07111B',
      secondary: '#0D1723',
      tertiary: '#132131',
      elevated: '#18293C',
      hover: '#20354D',
      muted: '#30465F',
    },
    text: {
      primary: '#EDF3FB',
      secondary: '#C7D3E2',
      tertiary: '#97A7BC',
      muted: '#708299',
      inverse: '#07111B',
    },
    accent: {
      primary: '#4FD1E5',
      hover: '#73DFF0',
      muted: 'rgba(79, 209, 229, 0.12)',
      text: '#9EEFFF',
    },
    status: {
      new: '#70A0FF',
      reviewed: '#A78BFA',
      contacted: '#4FD1E5',
      quoted: '#F0B04F',
      won: '#42D48B',
      lost: '#F07F86',
    },
    priority: {
      critical: '#F07F86',
      high: '#E8A652',
      medium: '#70A0FF',
      low: '#8A9EB6',
    },
    border: {
      subtle: 'rgba(141, 166, 198, 0.10)',
      default: 'rgba(151, 176, 209, 0.18)',
      strong: 'rgba(174, 198, 230, 0.28)',
      accent: 'rgba(79, 209, 229, 0.30)',
    },
    success: '#42D48B',
    warning: '#E8A652',
    error: '#F07F86',
    info: '#70A0FF',
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
    sm: '8px',
    md: '12px',
    lg: '18px',
    xl: '24px',
    '2xl': '28px',
    full: '9999px',
  },

  shadows: {
    sm: '0 8px 20px rgba(0, 0, 0, 0.18)',
    md: '0 18px 40px rgba(0, 0, 0, 0.28)',
    lg: '0 30px 80px rgba(0, 0, 0, 0.42)',
    xl: '0 36px 100px rgba(0, 0, 0, 0.48)',
    glow: '0 0 20px rgba(79, 209, 229, 0.18)',
    card: '0 16px 36px rgba(0, 0, 0, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.04)',
  },

  typography: {
    fontFamily: {
      display: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      body: '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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

export const pipelineStages = [
  { id: 'new', label: 'New', color: tokens.colors.status.new },
  { id: 'reviewed', label: 'Reviewed', color: tokens.colors.status.reviewed },
  { id: 'contacted', label: 'Contacted', color: tokens.colors.status.contacted },
  { id: 'quote_sent', label: 'Quote Sent', color: tokens.colors.status.quoted },
  { id: 'won', label: 'Won', color: tokens.colors.status.won },
  { id: 'lost', label: 'Lost', color: tokens.colors.status.lost },
] as const;

export type PipelineStage = typeof pipelineStages[number]['id'];
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
