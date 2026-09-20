/**
 * TradeForge Institutional Design System Tokens
 * Source of truth for colors, surfaces, borders, typography, radii, spacing, and transitions.
 */

export const tfTokens = {
  colors: {
    // Base backgrounds
    bgApp: '#07080B',
    bgAppSecondary: '#090A0E',
    bgAppTertiary: '#0C0D11',

    // Primary surfaces (Level 1 & 2)
    surfaceBase: '#101116',
    surfaceCard: '#12141A',
    surfaceCardAlt: '#15171D',

    // Elevated surfaces (Level 3)
    surfaceElevated: '#181A21',
    surfaceModal: '#1C1F27',
    surfaceActive: '#1E222D',

    // Borders
    borderSubtle: 'rgba(255, 255, 255, 0.06)',
    borderDefault: 'rgba(255, 255, 255, 0.08)',
    borderStrong: 'rgba(255, 255, 255, 0.12)',
    borderFocus: 'rgba(59, 130, 246, 0.5)',

    // Accents (Intentional, institutional blue/indigo/violet family)
    accentPrimary: '#3B82F6',       // Blue 500
    accentPrimaryHover: '#2563EB',  // Blue 600
    accentPrimarySubtle: 'rgba(59, 130, 246, 0.12)',
    accentIndigo: '#6366F1',
    accentIndigoSubtle: 'rgba(99, 102, 241, 0.12)',

    // Semantic colors
    success: '#10B981',             // Emerald 500
    successSubtle: 'rgba(16, 185, 129, 0.12)',
    successBorder: 'rgba(16, 185, 129, 0.25)',

    warning: '#F59E0B',             // Amber 500
    warningSubtle: 'rgba(245, 158, 11, 0.12)',
    warningBorder: 'rgba(245, 158, 11, 0.25)',

    danger: '#EF4444',              // Red 500
    dangerSubtle: 'rgba(239, 68, 68, 0.12)',
    dangerBorder: 'rgba(239, 68, 68, 0.25)',

    neutral: '#94A3B8',             // Slate 400
    neutralSubtle: 'rgba(148, 163, 184, 0.10)',
    neutralBorder: 'rgba(148, 163, 184, 0.20)',

    // Typography colors
    textPrimary: '#F8FAFC',         // Near white
    textSecondary: '#94A3B8',       // Muted cool gray
    textTertiary: '#64748B',        // Subtle gray
    textMuted: '#475569',
  },

  radii: {
    xs: '6px',
    sm: '8px',
    md: '10px',
    card: '14px',
    modal: '18px',
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
    card: '0 4px 16px rgba(0, 0, 0, 0.45)',
    elevated: '0 8px 30px rgba(0, 0, 0, 0.6)',
    modal: '0 20px 50px rgba(0, 0, 0, 0.8)',
    dropdown: '0 12px 36px rgba(0, 0, 0, 0.7)',
  },

  transitions: {
    fast: '140ms cubic-bezier(0.16, 1, 0.3, 1)',
    normal: '180ms ease',
  },
} as const;

export type TfTokens = typeof tfTokens;
