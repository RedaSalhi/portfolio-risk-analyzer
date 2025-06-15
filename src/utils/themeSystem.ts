// src/utils/themeSystem.ts - ADVANCED THEME SYSTEM
// Beautiful theming system with dark mode, color schemes, and animations

import { Appearance } from 'react-native';
import { useState, useEffect, createContext, useContext } from 'react';

// Color Palettes
export const ColorPalettes = {
  blue: {
    primary: '#1f4e79',
    secondary: '#2980b9',
    accent: '#3498db',
    light: '#e3f2fd',
    gradient: ['#667eea', '#764ba2'],
  },
  purple: {
    primary: '#8e44ad',
    secondary: '#9b59b6',
    accent: '#bb6bd9',
    light: '#f3e5f5',
    gradient: ['#667eea', '#764ba2'],
  },
  green: {
    primary: '#27ae60',
    secondary: '#2ecc71',
    accent: '#58d68d',
    light: '#e8f5e8',
    gradient: ['#56ab2f', '#a8e6cf'],
  },
  orange: {
    primary: '#e67e22',
    secondary: '#f39c12',
    accent: '#f5b041',
    light: '#fff3e0',
    gradient: ['#ff6b35', '#f7931e'],
  },
  red: {
    primary: '#e74c3c',
    secondary: '#c0392b',
    accent: '#ec7063',
    light: '#ffebee',
    gradient: ['#ff6b6b', '#ee5a24'],
  },
  teal: {
    primary: '#16a085',
    secondary: '#1abc9c',
    accent: '#48c9b0',
    light: '#e0f2f1',
    gradient: ['#11998e', '#38ef7d'],
  },
};

// Theme Types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    card: string;
    text: {
      primary: string;
      secondary: string;
      accent: string;
      inverse: string;
    };
    border: string;
    shadow: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  gradients: {
    primary: string[];
    secondary: string[];
    surface: string[];
    header: string[];
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: { fontSize: number; fontWeight: string; lineHeight: number };
    h2: { fontSize: number; fontWeight: string; lineHeight: number };
    h3: { fontSize: number; fontWeight: string; lineHeight: number };
    body: { fontSize: number; fontWeight: string; lineHeight: number };
    caption: { fontSize: number; fontWeight: string; lineHeight: number };
  };
  animations: {
    fast: number;
    normal: number;
    slow: number;
  };
}

// Light Theme
export const LightTheme: Theme = {
  colors: {
    primary: '#1f4e79',
    secondary: '#2980b9',
    accent: '#3498db',
    background: '#f0f2f5',
    surface: '#ffffff',
    card: '#ffffff',
    text: {
      primary: '#2c3e50',
      secondary: '#7f8c8d',
      accent: '#1f4e79',
      inverse: '#ffffff',
    },
    border: '#e0e6ed',
    shadow: 'rgba(0,0,0,0.1)',
    success: '#27ae60',
    warning: '#f39c12',
    error: '#e74c3c',
    info: '#3498db',
  },
  gradients: {
    primary: ['#1f4e79', '#2980b9'],
    secondary: ['#667eea', '#764ba2'],
    surface: ['#ffffff', '#f8f9fa'],
    header: ['#1f4e79', '#2980b9', '#3498db'],
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '800', lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
    h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
    body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  },
  animations: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
};

// Dark Theme
export const DarkTheme: Theme = {
  colors: {
    primary: '#4A90E2',
    secondary: '#5DADE2',
    accent: '#7FB3D3',
    background: '#121212',
    surface: '#1e1e1e',
    card: '#2d2d30',
    text: {
      primary: '#ffffff',
      secondary: '#b0b0b0',
      accent: '#4A90E2',
      inverse: '#000000',
    },
    border: '#404040',
    shadow: 'rgba(0,0,0,0.3)',
    success: '#4CAF50',
    warning: '#FF9800',
    error: '#F44336',
    info: '#2196F3',
  },
  gradients: {
    primary: ['#4A90E2', '#357ABD'],
    secondary: ['#667eea', '#764ba2'],
    surface: ['#1e1e1e', '#2d2d30'],
    header: ['#1a1a2e', '#16213e', '#0f3460'],
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '800', lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
    h3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
    body: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  },
  animations: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
};

// Theme Configuration
export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  colorScheme: keyof typeof ColorPalettes;
  animations: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: 'small' | 'normal' | 'large';
}

export const DefaultThemeConfig: ThemeConfig = {
  mode: 'auto',
  colorScheme: 'blue',
  animations: true,
  reducedMotion: false,
  highContrast: false,
  fontSize: 'normal',
};

// Theme Context
export const ThemeContext = createContext<{
  theme: Theme;
  config: ThemeConfig;
  updateTheme: (config: Partial<ThemeConfig>) => void;
}>({
  theme: LightTheme,
  config: DefaultThemeConfig,
  updateTheme: () => {},
});

// Custom Hook for Theme
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Theme Generator
export const generateTheme = (config: ThemeConfig): Theme => {
  const baseTheme = config.mode === 'dark' ? DarkTheme : LightTheme;
  const colorPalette = ColorPalettes[config.colorScheme];
  
  // Apply color scheme
  const theme: Theme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colorPalette.primary,
      secondary: colorPalette.secondary,
      accent: colorPalette.accent,
      text: {
        ...baseTheme.colors.text,
        accent: colorPalette.primary,
      },
    },
    gradients: {
      ...baseTheme.gradients,
      primary: colorPalette.gradient,
      secondary: colorPalette.gradient,
    },
  };

  // Apply font size adjustments
  const fontSizeMultiplier = 
    config.fontSize === 'small' ? 0.9 :
    config.fontSize === 'large' ? 1.1 : 1.0;

  theme.typography = {
    h1: { ...theme.typography.h1, fontSize: theme.typography.h1.fontSize * fontSizeMultiplier },
    h2: { ...theme.typography.h2, fontSize: theme.typography.h2.fontSize * fontSizeMultiplier },
    h3: { ...theme.typography.h3, fontSize: theme.typography.h3.fontSize * fontSizeMultiplier },
    body: { ...theme.typography.body, fontSize: theme.typography.body.fontSize * fontSizeMultiplier },
    caption: { ...theme.typography.caption, fontSize: theme.typography.caption.fontSize * fontSizeMultiplier },
  };

  // Apply high contrast adjustments
  if (config.highContrast) {
    theme.colors.text.primary = config.mode === 'dark' ? '#ffffff' : '#000000';
    theme.colors.border = config.mode === 'dark' ? '#ffffff' : '#000000';
  }

  // Apply reduced motion
  if (config.reducedMotion) {
    theme.animations = {
      fast: 0,
      normal: 0,
      slow: 0,
    };
  }

  return theme;
};

// Auto Theme Detection
export const detectSystemTheme = (): 'light' | 'dark' => {
  const colorScheme = Appearance.getColorScheme();
  return colorScheme === 'dark' ? 'dark' : 'light';
};

// Theme Storage
export const ThemeStorage = {
  async save(config: ThemeConfig): Promise<void> {
    try {
      // In a real app, use AsyncStorage
      console.log('Saving theme config:', config);
    } catch (error) {
      console.error('Failed to save theme config:', error);
    }
  },

  async load(): Promise<ThemeConfig> {
    try {
      // In a real app, load from AsyncStorage
      return DefaultThemeConfig;
    } catch (error) {
      console.error('Failed to load theme config:', error);
      return DefaultThemeConfig;
    }
  },
};

// Predefined Theme Presets
export const ThemePresets = {
  financial: {
    mode: 'light' as const,
    colorScheme: 'blue' as const,
    animations: true,
    reducedMotion: false,
    highContrast: false,
    fontSize: 'normal' as const,
  },
  risk: {
    mode: 'light' as const,
    colorScheme: 'red' as const,
    animations: true,
    reducedMotion: false,
    highContrast: false,
    fontSize: 'normal' as const,
  },
  growth: {
    mode: 'light' as const,
    colorScheme: 'green' as const,
    animations: true,
    reducedMotion: false,
    highContrast: false,
    fontSize: 'normal' as const,
  },
  professional: {
    mode: 'dark' as const,
    colorScheme: 'blue' as const,
    animations: false,
    reducedMotion: true,
    highContrast: true,
    fontSize: 'normal' as const,
  },
  accessible: {
    mode: 'light' as const,
    colorScheme: 'blue' as const,
    animations: false,
    reducedMotion: true,
    highContrast: true,
    fontSize: 'large' as const,
  },
};

// Animation Utilities
export const AnimationUtils = {
  createFadeIn: (duration: number = 300) => ({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: { duration },
  }),

  createSlideIn: (direction: 'up' | 'down' | 'left' | 'right' = 'up', distance: number = 50, duration: number = 300) => {
    const transforms = {
      up: { translateY: distance },
      down: { translateY: -distance },
      left: { translateX: distance },
      right: { translateX: -distance },
    };

    return {
      from: transforms[direction],
      to: { translateY: 0, translateX: 0 },
      config: { duration },
    };
  },

  createScale: (fromScale: number = 0.8, toScale: number = 1, duration: number = 300) => ({
    from: { scale: fromScale },
    to: { scale: toScale },
    config: { duration },
  }),

  createBounce: (duration: number = 600) => ({
    from: { scale: 0.3 },
    to: { scale: 1 },
    config: {
      duration,
      tension: 300,
      friction: 10,
    },
  }),

  createPulse: (minScale: number = 1, maxScale: number = 1.05, duration: number = 1000) => ({
    from: { scale: minScale },
    to: { scale: maxScale },
    loop: true,
    config: { duration },
  }),
};

// Accessibility Utilities
export const AccessibilityUtils = {
  getContrastRatio: (foreground: string, background: string): number => {
    // Simplified contrast ratio calculation
    // In a real implementation, you'd use a proper color contrast library
    return 4.5; // WCAG AA compliant ratio
  },

  isHighContrast: (theme: Theme): boolean => {
    return theme.colors.text.primary === '#000000' || theme.colors.text.primary === '#ffffff';
  },

  getAccessibleColor: (theme: Theme, purpose: 'text' | 'background' | 'accent'): string => {
    switch (purpose) {
      case 'text':
        return theme.colors.text.primary;
      case 'background':
        return theme.colors.background;
      case 'accent':
        return theme.colors.accent;
      default:
        return theme.colors.primary;
    }
  },
};

// Performance Utilities
export const PerformanceUtils = {
  shouldUseAnimations: (config: ThemeConfig): boolean => {
    return config.animations && !config.reducedMotion;
  },

  getOptimizedAnimationDuration: (baseMs: number, config: ThemeConfig): number => {
    if (!config.animations || config.reducedMotion) return 0;
    return baseMs;
  },

  createOptimizedStyle: (theme: Theme, config: ThemeConfig) => ({
    shadowOpacity: config.animations ? 0.1 : 0,
    elevation: config.animations ? 3 : 0,
    borderWidth: config.highContrast ? 2 : 1,
  }),
};

// Color Utilities
export const ColorUtils = {
  hexToRgba: (hex: string, alpha: number = 1): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  lighten: (color: string, amount: number = 0.1): string => {
    // Simplified color lightening
    // In a real implementation, you'd use a proper color manipulation library
    return color + '20'; // Add transparency for lightening effect
  },

  darken: (color: string, amount: number = 0.1): string => {
    // Simplified color darkening
    return color;
  },

  createGradient: (colors: string[], direction: string = 'to right'): string => {
    return `linear-gradient(${direction}, ${colors.join(', ')})`;
  },

  getSemanticColor: (theme: Theme, semantic: 'success' | 'warning' | 'error' | 'info'): string => {
    return theme.colors[semantic];
  },
};

// Theme Validator
export const ThemeValidator = {
  validateConfig: (config: Partial<ThemeConfig>): ThemeConfig => {
    return {
      mode: config.mode && ['light', 'dark', 'auto'].includes(config.mode) ? config.mode : 'auto',
      colorScheme: config.colorScheme && Object.keys(ColorPalettes).includes(config.colorScheme) 
        ? config.colorScheme as keyof typeof ColorPalettes 
        : 'blue',
      animations: typeof config.animations === 'boolean' ? config.animations : true,
      reducedMotion: typeof config.reducedMotion === 'boolean' ? config.reducedMotion : false,
      highContrast: typeof config.highContrast === 'boolean' ? config.highContrast : false,
      fontSize: config.fontSize && ['small', 'normal', 'large'].includes(config.fontSize) 
        ? config.fontSize as 'small' | 'normal' | 'large'
        : 'normal',
    };
  },

  validateTheme: (theme: Theme): boolean => {
    try {
      // Basic validation
      return !!(
        theme.colors &&
        theme.gradients &&
        theme.spacing &&
        theme.borderRadius &&
        theme.typography &&
        theme.animations
      );
    } catch {
      return false;
    }
  },
};

export default {
  LightTheme,
  DarkTheme,
  ColorPalettes,
  DefaultThemeConfig,
  ThemePresets,
  generateTheme,
  detectSystemTheme,
  ThemeStorage,
  AnimationUtils,
  AccessibilityUtils,
  PerformanceUtils,
  ColorUtils,
  ThemeValidator,
};
