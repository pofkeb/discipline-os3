import { useColorScheme } from 'react-native';

const lightColors = {
  background: '#F2F2F7',
  surface: '#FFFFFF',
  surfaceHighlight: '#F9F9FB',
  textPrimary: '#000000',
  textSecondary: '#6C6C70',
  textTertiary: '#AEAEB2',
  border: '#E5E5EA',
  accent: '#FF3B30',
  success: '#34C759',
  error: '#FF3B30',
  overlay: 'rgba(0,0,0,0.5)',
};

const darkColors = {
  background: '#000000',
  surface: '#1C1C1E',
  surfaceHighlight: '#2C2C2E',
  textPrimary: '#FFFFFF',
  textSecondary: '#8E8E93',
  textTertiary: '#48484A',
  border: '#38383A',
  accent: '#FF453A',
  success: '#30D158',
  error: '#FF453A',
  overlay: 'rgba(0,0,0,0.7)',
};

export type ThemeColors = typeof lightColors;

export const getColors = (scheme: 'light' | 'dark'): ThemeColors => {
  return scheme === 'dark' ? darkColors : lightColors;
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
  hero: 48,
};

export function useThemeColors(): ThemeColors {
  const scheme = useColorScheme();
  return getColors(scheme === 'dark' ? 'dark' : 'light');
}
