export const COLORS = {
  primary: {
    blue: '#0098FC',
    cyan: '#00D4FF',
  },
  neutral: {
    black: '#000000',
    white: '#FFFFFF',
    gray: {
      900: '#1d1d1f',
      700: '#6e6e73',
      600: '#86868b',
      500: '#a1a1a6',
      200: '#e5e5e7',
      100: '#f5f5f7',
    },
  },
  gradients: {
    primary: 'linear-gradient(90deg, #0098FC, #00D4FF)',
    subtle:
      'linear-gradient(135deg, rgba(0, 152, 252, 0.2), transparent, rgba(0, 212, 255, 0.1))',
    dark: 'linear-gradient(90deg, #000000, #1d1d1f)',
  },
} as const

export const TYPOGRAPHY = {
  fontFamily: "'Helvetica','Helvetica Neue', 'Arial', sans-serif",
  fontFamilyMono:
    "'Helvetica Monospaced', 'SF Mono', 'Monaco', 'Courier New', monospace",

  variants: {
    display: {
      fontSize: '80px',
      fontWeight: 700,
      letterSpacing: '-0.05em',
      lineHeight: 0.8,
    },
    h1: {
      fontSize: '64px',
      fontWeight: 700,
      letterSpacing: '-0.04em',
      lineHeight: 0.95,
    },
    h1Dashboard: {
      fontSize: '40px',
      fontWeight: 600,
      letterSpacing: '-0.03em',
      lineHeight: 1.1,
    },
    h2: {
      fontSize: '56px',
      fontWeight: 600,
      letterSpacing: '-0.03em',
      lineHeight: 1.05,
    },
    h2Dashboard: {
      fontSize: '28px',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '32px',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h3Dashboard: {
      fontSize: '20px',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '24px',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.3,
    },
    h4Dashboard: {
      fontSize: '18px',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    bodyLarge: {
      fontSize: '24px',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    bodyLargeRegular: {
      fontSize: '24px',
      fontWeight: 400,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    body: {
      fontSize: '17px',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.6,
    },
    bodyRegular: {
      fontSize: '17px',
      fontWeight: 400,
      letterSpacing: '-0.01em',
      lineHeight: 1.6,
    },
    bodyMono: {
      fontSize: '16px',
      fontWeight: 400,
      letterSpacing: '0',
      lineHeight: 1.6,
      fontFamily:
        "'Helvetica Monospaced', 'SF Mono', 'Monaco', 'Courier New', monospace",
    },
    caption: {
      fontSize: '13px',
      fontWeight: 500,
      letterSpacing: '0.08em',
      lineHeight: 1.5,
      textTransform: 'uppercase' as const,
    },
    captionMono: {
      fontSize: '12px',
      fontWeight: 400,
      letterSpacing: '0.05em',
      lineHeight: 1.5,
      textTransform: 'uppercase' as const,
      fontFamily:
        "'Helvetica Monospaced', 'SF Mono', 'Monaco', 'Courier New', monospace",
    },
  },
} as const

export type TypographyVariant = keyof typeof TYPOGRAPHY.variants

export const SPACING = {
  xxs: '4px',
  xs: '8px',
  s: '16px',
  m: '24px',
  l: '32px',
  xl: '48px',
  xxl: '64px',
  xxxl: '96px',
} as const

export const MOTION = {
  duration: {
    micro: 200,
    standard: 300,
    complex: 500,
  },

  easing: {
    default: [0.22, 1, 0.36, 1],
    easeOut: 'easeOut',
    easeInOut: 'easeInOut',
    spring: { type: 'spring', stiffness: 300, damping: 30 },
  },

  transitions: {
    micro: {
      duration: 0.2,
      ease: 'easeOut',
    },
    standard: {
      duration: 0.3,
      ease: 'easeInOut',
    },
    complex: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
} as const

// Layout Constants
export const LAYOUT = {
  columnWidth: {
    min: 15,
    max: 35,
    default: {
      left: 20,
      editor: 35,
      right: 30,
    },
  },
} as const

// Status Variant Mappings
export const STATUS_VARIANTS = {
  active: 'primary',
  pending: 'gradient',
  inactive: 'neutral',
  connected: 'primary',
  syncing: 'gradient',
  disconnected: 'outlined',
  scheduled: 'gradient',
  Scheduled: 'gradient',
  Completed: 'primary',
} as const
