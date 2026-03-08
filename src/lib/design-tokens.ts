// Design Token System — LeadEngine
// Premium enterprise aesthetic — cool slate/blue, Palantir/Linear/Vercel inspired

export const tokens = {
  colors: {
    // Core neutrals — cool light surfaces
    bg: {
      primary: '#F7F9FB',         // Main background
      secondary: '#FFFFFF',        // Card / elevated surface
      tertiary: '#EEF1F5',        // Muted panels
      elevated: '#E4E9EF',        // Hover / raised
      hover: '#DDE3EA',           // Interactive hover
      muted: '#CBD3DC',           // Muted backgrounds
    },
    // Text hierarchy
    text: {
      primary: '#1A2332',         // Primary text — deep slate
      secondary: '#4A5568',       // Secondary text
      tertiary: '#7B8794',        // Tertiary / placeholders
      muted: '#A0ADB8',          // Very muted
      inverse: '#F7F9FB',        // On dark surfaces
    },
    // Accent — cyan/electric blue from logo
    accent: {
      primary: '#4FD1E5',        // Primary accent
      hover: '#38BCD0',          // Accent hover
      muted: 'rgba(79, 209, 229, 0.10)', // Accent background
      text: '#2DA8BC',           // Accent as text
    },
    // Status colors
    status: {
      new: '#5B8DEF',
      reviewed: '#8B7CF6',
      contacted: '#4FD1E5',
      quoted: '#F0A030',
      won: '#34C77B',
      lost: '#E8636C',
    },
    // Priority
    priority: {
      critical: '#DC3545',
      high: '#E8963C',
      medium: '#5B8DEF',
      low: '#A0ADB8',
    },
    // Borders
    border: {
      subtle: '#EEF1F5',
      default: '#DDE3EA',
      strong: '#CBD3DC',
      accent: 'rgba(79, 209, 229, 0.30)',
    },
    // Semantic
    success: '#34C77B',
    warning: '#E8963C',
    error: '#E8636C',
    info: '#5B8DEF',
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
  { id: 'new', label: 'New', color: tokens.colors.status.new },
  { id: 'reviewed', label: 'Reviewed', color: tokens.colors.status.reviewed },
  { id: 'contacted', label: 'Contacted', color: tokens.colors.status.contacted },
  { id: 'quote_sent', label: 'Quote Sent', color: tokens.colors.status.quoted },
  { id: 'won', label: 'Won', color: tokens.colors.status.won },
  { id: 'lost', label: 'Lost', color: tokens.colors.status.lost },
] as const;

export type PipelineStage = typeof pipelineStages[number]['id'];
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';
