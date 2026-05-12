// Color palette constants matching the SATS icon design system
export const SATS_COLORS = {
  // Primary Colors - Icon inspired
  cyan: '#00D9FF',
  cyanDark: '#00A8CC',
  cyanAccent: '#00E5FF',
  
  blue: '#0066FF',
  blueLight: '#3399FF',
  blueDark: '#0052CC',
  
  darkBg: '#001A4D',
  darkerBg: '#000D26',
  
  // Semantic Colors
  success: '#00D97D',
  warning: '#FFB84D',
  error: '#FF4D7D',
  info: '#00D9FF',
  
  // Neutral Colors
  white: '#FFFFFF',
  lightGray: '#F5F7FB',
  lightGrayAlt: '#F0F2F7',
  mediumGray: '#999999',
  darkGray: '#555555',
  veryDarkGray: '#333333',
  darkText: '#001A4D',
  
  // Transparent variants
  cyanTransparent: 'rgba(0, 217, 255, 0.1)',
  blueTransparent: 'rgba(0, 102, 255, 0.1)',
  blueTransparentLight: 'rgba(0, 102, 255, 0.05)',
} as const;

// Gradient definitions
export const SATS_GRADIENTS = {
  primary: 'linear-gradient(135deg, #0066FF 0%, #0099FF 100%)',
  primaryDark: 'linear-gradient(135deg, #0052CC 0%, #0080FF 100%)',
  
  background: 'linear-gradient(135deg, #001A4D 0%, #000D26 100%)',
  backgroundAlt: 'linear-gradient(135deg, #001A4D 0%, #000D26 50%, #001A4D 100%)',
  
  card: 'linear-gradient(135deg, rgba(255, 255, 255, 1) 0%, rgba(245, 247, 251, 0.5) 100%)',
  
  cyan: 'linear-gradient(135deg, #00D9FF 0%, #00A8CC 100%)',
  blueCyan: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
  
  text: 'linear-gradient(135deg, #0066FF 0%, #00D9FF 100%)',
  
  // Radial gradients for effects
  glowCyan: 'radial-gradient(circle, rgba(0, 217, 255, 0.1) 0%, transparent 70%)',
  glowBlue: 'radial-gradient(circle, rgba(0, 102, 255, 0.1) 0%, transparent 70%)',
} as const;

// Shadow definitions
export const SATS_SHADOWS = {
  sm: '0 2px 8px rgba(0, 0, 0, 0.08)',
  md: '0 4px 15px rgba(0, 102, 255, 0.15)',
  lg: '0 8px 24px rgba(0, 102, 255, 0.12)',
  xl: '0 12px 32px rgba(0, 102, 255, 0.1)',
  
  glow: '0 0 20px rgba(0, 217, 255, 0.3)',
  glowSm: '0 0 10px rgba(0, 102, 255, 0.2)',
  glowLg: '0 0 30px rgba(0, 102, 255, 0.25)',
  
  button: '0 4px 15px rgba(0, 102, 255, 0.3)',
  buttonHover: '0 6px 25px rgba(0, 102, 255, 0.4)',
  
  card: '0 2px 8px rgba(0, 0, 0, 0.08)',
  cardHover: '0 8px 24px rgba(0, 102, 255, 0.12)',
  
  appBar: '0 2px 8px rgba(0, 102, 255, 0.15)',
  
  inset: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
} as const;

// Border radius definitions
export const SATS_BORDER_RADIUS = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
} as const;

// Spacing scale (in pixels)
export const SATS_SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  '2xl': '32px',
  '3xl': '48px',
  '4xl': '64px',
} as const;

// Typography scale
export const SATS_TYPOGRAPHY = {
  h1: {
    fontSize: '2.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: '-0.015625em',
  },
  h2: {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: '-0.0125em',
  },
  h3: {
    fontSize: '1.75rem',
    fontWeight: 700,
    lineHeight: 1.4,
    letterSpacing: '-0.0083em',
  },
  h4: {
    fontSize: '1.5rem',
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h5: {
    fontSize: '1.25rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h6: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
  },
  body1: {
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.6,
  },
  body2: {
    fontSize: '0.95rem',
    fontWeight: 400,
    lineHeight: 1.6,
  },
  caption: {
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 1.5,
  },
  overline: {
    fontSize: '0.75rem',
    fontWeight: 600,
    lineHeight: 1.5,
    letterSpacing: '0.5px',
  },
} as const;

// Transition durations (in milliseconds)
export const SATS_TRANSITIONS = {
  fast: '150ms',
  base: '300ms',
  slow: '500ms',
  slower: '700ms',
} as const;

// Z-index scale
export const SATS_Z_INDEX = {
  hide: -1,
  auto: 'auto',
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  backDrop: 1040,
  offcanvas: 1050,
  modal: 1060,
  popover: 1070,
  tooltip: 1080,
  notification: 1090,
} as const;

// Responsive breakpoints
export const SATS_BREAKPOINTS = {
  xs: 0,
  sm: 600,
  md: 960,
  lg: 1280,
  xl: 1920,
} as const;

// Border definitions
export const SATS_BORDERS = {
  thin: '1px solid',
  normal: '2px solid',
  thick: '3px solid',
  
  cyanLight: `1px solid ${SATS_COLORS.cyanTransparent}`,
  cyan: `1px solid ${SATS_COLORS.cyan}`,
  
  blueLight: `1px solid ${SATS_COLORS.blueTransparent}`,
  blue: `1px solid ${SATS_COLORS.blue}`,
} as const;

const satsDesignSystem = {
  SATS_COLORS,
  SATS_GRADIENTS,
  SATS_SHADOWS,
  SATS_BORDER_RADIUS,
  SATS_SPACING,
  SATS_TYPOGRAPHY,
  SATS_TRANSITIONS,
  SATS_Z_INDEX,
  SATS_BREAKPOINTS,
  SATS_BORDERS,
};

export default satsDesignSystem;
