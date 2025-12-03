import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import type { PhaseType } from '../types';

// Phase-specific colors
export const phaseColors = {
  fast_1: {
    light: {
      primary: '#6366f1', // Indigo
      secondary: '#818cf8',
      background: '#eef2ff',
      surface: '#ffffff',
      text: '#1e1b4b',
    },
    dark: {
      primary: '#818cf8',
      secondary: '#a5b4fc',
      background: '#1e1b4b',
      surface: '#312e81',
      text: '#eef2ff',
    },
  },
  fast_2: {
    light: {
      primary: '#8b5cf6', // Purple
      secondary: '#a78bfa',
      background: '#f5f3ff',
      surface: '#ffffff',
      text: '#3b0764',
    },
    dark: {
      primary: '#a78bfa',
      secondary: '#c4b5fd',
      background: '#3b0764',
      surface: '#5b21b6',
      text: '#f5f3ff',
    },
  },
  eating_window_1: {
    light: {
      primary: '#10b981', // Green
      secondary: '#34d399',
      background: '#ecfdf5',
      surface: '#ffffff',
      text: '#064e3b',
    },
    dark: {
      primary: '#34d399',
      secondary: '#6ee7b7',
      background: '#064e3b',
      surface: '#047857',
      text: '#ecfdf5',
    },
  },
  daily_eating_window: {
    light: {
      primary: '#f59e0b', // Orange
      secondary: '#fbbf24',
      background: '#fffbeb',
      surface: '#ffffff',
      text: '#78350f',
    },
    dark: {
      primary: '#fbbf24',
      secondary: '#fcd34d',
      background: '#78350f',
      surface: '#92400e',
      text: '#fffbeb',
    },
  },
  recovery_eating_window: {
    light: {
      primary: '#eab308', // Yellow
      secondary: '#fde047',
      background: '#fefce8',
      surface: '#ffffff',
      text: '#713f12',
    },
    dark: {
      primary: '#fde047',
      secondary: '#fef08a',
      background: '#713f12',
      surface: '#a16207',
      text: '#fefce8',
    },
  },
};

export function getPhaseColors(phase: PhaseType, isDark: boolean) {
  const phaseColorSet = phaseColors[phase] || phaseColors.daily_eating_window;
  return isDark ? phaseColorSet.dark : phaseColorSet.light;
}

// Typography
const fontConfig = {
  displayLarge: {
    fontFamily: 'System',
    fontSize: 57,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 64,
  },
  displayMedium: {
    fontFamily: 'System',
    fontSize: 45,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 52,
  },
  displaySmall: {
    fontFamily: 'System',
    fontSize: 36,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 44,
  },
  headlineLarge: {
    fontFamily: 'System',
    fontSize: 32,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 40,
  },
  headlineMedium: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 36,
  },
  headlineSmall: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 32,
  },
  titleLarge: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 28,
  },
  titleMedium: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  bodyLarge: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.5,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 16,
  },
  labelLarge: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
};

// Spacing constants
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Create light theme
export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6366f1',
    secondary: '#818cf8',
    background: '#ffffff',
    surface: '#f9fafb',
    error: '#ef4444',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
    onBackground: '#1f2937',
    onSurface: '#1f2937',
  },
  fonts: configureFonts({ config: fontConfig }),
};

// Create dark theme
export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#818cf8',
    secondary: '#a5b4fc',
    background: '#111827',
    surface: '#1f2937',
    error: '#f87171',
    onPrimary: '#1e1b4b',
    onSecondary: '#1e1b4b',
    onBackground: '#f9fafb',
    onSurface: '#f9fafb',
  },
  fonts: configureFonts({ config: fontConfig }),
};

export type AppTheme = typeof lightTheme;

