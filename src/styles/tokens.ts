/**
 * TradeForge Institutional Design System Tokens
 * Source of truth for colors, surfaces, borders, typography, radii, spacing, and transitions.
 */

export const tfTokens = {
  colors: {
    // Pure Black Foundation
    bgPrimary: '#030405',
    bgSecondary: '#06080B',
    bgTertiary: '#090C10',

    // Surfaces
    surface1: '#0D1014',       // Card / Primary surface
    surface2: '#11151A',       // Elevated surface
    surfaceHover: '#151A20',   // Hover state
    surfaceModal: '#0B0E12',   // Modal container
    surfaceInput: '#080A0D',   // Input fields

    // Borders
    borderSubtle: 'rgba(255, 255, 255, 0.055)',
    borderDefault: 'rgba(255, 255, 255, 0.07)',
    borderStrong: 'rgba(255, 255, 255, 0.09)',
    borderActive: 'rgba(99, 102, 241, 0.35)',

    // Typography
    textPrimary: '#F4F5F7',
    textSecondary: '#C2C7D0',
    textMuted: '#8A919D',
    textDisabled: '#5E6570',
    textLabels: '#A7ADB7',

    // Accents
    accentBlue: '#3B82F6',
    accentIndigo: '#6366F1',
    accentPurple: '#7C3AED',

    // Active state
    activeGradient: 'linear-gradient(90deg, rgba(59, 130, 246, 0.16), rgba(124, 58, 237, 0.18))',
    buttonPrimaryGradient: 'linear-gradient(135deg, #2563EB, #7C3AED)',

    // Semantic colors
    success: '#10B981',
    successSubtle: 'rgba(16, 185, 129, 0.12)',
    successBorder: 'rgba(16, 185, 129, 0.25)',

    warning: '#F59E0B',
    warningSubtle: 'rgba(245, 158, 11, 0.12)',
    warningBorder: 'rgba(245, 158, 11, 0.25)',

    danger: '#EF4444',
    dangerSubtle: 'rgba(239, 68, 68, 0.12)',
    dangerBorder: 'rgba(239, 68, 68, 0.25)',

    info: '#3B82F6',
    infoSubtle: 'rgba(59, 130, 246, 0.12)',
    infoBorder: 'rgba(59, 130, 246, 0.25)',
  },

  radii: {
    xs: '6px',
    sm: '8px',
    md: '10px',
    card: '12px',
    modal: '16px',
    full: '9999px',
  },

  spacing: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
  },

  shadows: {
    sm: '0 1px 2px rgba(0, 0, 0, 0.4)',
    card: '0 4px 20px rgba(0, 0, 0, 0.25)',
    elevated: '0 8px 30px rgba(0, 0, 0, 0.35)',
    modal: '0 20px 50px rgba(0, 0, 0, 0.72)',
    dropdown: '0 12px 36px rgba(0, 0, 0, 0.65)',
  },

  transitions: {
    fast: '120ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '160ms ease',
  },
} as const;

export type TfTokens = typeof tfTokens;
