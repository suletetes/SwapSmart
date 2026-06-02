/**
 * SwapSmart Design System Tokens
 * Maps to the Google Stitch design system defined in the design document.
 */
export const tokens = {
  colors: {
    primary: '#10B981',
    secondary: '#1E293B',
    accent: '#F59E0B',
    background: { light: '#F8FAFC', dark: '#0F172A' },
    surface: { light: '#FFFFFF', dark: '#1E293B' },
    text: {
      primary: { light: '#1E293B', dark: '#F8FAFC' },
      secondary: { light: '#64748B', dark: '#94A3B8' },
    },
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
    border: { light: '#E2E8F0', dark: '#334155' },
  },
  typography: {
    fontFamily: { heading: 'Inter', body: 'DM Sans' },
    scale: {
      xs: '10px',
      sm: '13px',
      base: '16px',
      lg: '20px',
      xl: '25px',
      '2xl': '31px',
      '3xl': '39px',
      '4xl': '49px',
    },
  },
  spacing: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const,
  borderRadius: { card: '16px', button: '12px', bottomSheet: '24px' },
  shadows: {
    soft: '0 4px 6px rgba(0,0,0,0.05)',
    elevated: '0 10px 15px rgba(0,0,0,0.1)',
  },
  zIndex: {
    base: 0,
    dropdown: 10,
    sticky: 20,
    overlay: 30,
    modal: 40,
    popover: 50,
    toast: 60,
  },
  animation: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  touchTarget: '44px',
} as const;

export type DesignTokens = typeof tokens;
