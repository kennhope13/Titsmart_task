export const colors = {
  primary: '#1e3a8a', // Dark blue
  primaryLight: '#eff6ff', // Light blue background
  accent: '#10b981', // Emerald green
  accentLight: '#ecfdf5', // Light green bg
  danger: '#ef4444', // Red
  dangerLight: '#fef2f2', // Light red bg
  warning: '#f59e0b', // Amber
  warningLight: '#fffbeb', // Light amber bg
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  white: '#ffffff',
  border: '#e2e8f0',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const typography = {
  fontSizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
};
