import { useColorScheme } from 'react-native';

// ─── Premium Color Palette ───

const lightColors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceHighlight: '#F5F5F7',
  textPrimary: '#1A1A1A',
  textSecondary: '#636366',
  textTertiary: '#AEAEB2',
  border: '#E8E8ED',
  accent: '#E63935',
  success: '#2ECC71',
  error: '#E63935',
  overlay: 'rgba(0,0,0,0.5)',
};

const darkColors = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceHighlight: '#2C2C2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#98989D',
  textTertiary: '#48484A',
  border: '#38383A',
  accent: '#FF4B47',
  success: '#32D74B',
  error: '#FF4B47',
  overlay: 'rgba(0,0,0,0.7)',
};

export type ThemeColors = typeof lightColors;

export const getColors = (scheme: 'light' | 'dark'): ThemeColors => {
  return scheme === 'dark' ? darkColors : lightColors;
};

// ─── Refined Spacing Scale (8pt grid) ───

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// ─── Radius Scale ───

export const radius = {
  xs: 4,
  sm: 8,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 9999,
};

// ─── Typography Scale ───

export const fontSize = {
  xxs: 10,
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 32,
  hero: 44,
};

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return getColors(scheme === 'dark' ? 'dark' : 'light');
}
