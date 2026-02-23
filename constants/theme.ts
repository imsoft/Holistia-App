/**
 * Paleta de colores de Holistia (alineada con la web).
 * Única fuente de colores para la app móvil.
 */

import { Platform } from 'react-native';

// Light mode (:root)
const light = {
  background: '#ffffff',
  foreground: '#1d293d',
  card: '#ffffff',
  cardForeground: '#1d293d',
  primary: '#6468f0',
  primaryForeground: '#ffffff',
  secondary: '#e4e8ef',
  secondaryForeground: '#364050',
  muted: '#f5f5f5',
  mutedForeground: '#6c727e',
  accent: '#e1e7fd',
  accentForeground: '#364050',
  destructive: '#f14444',
  destructiveMuted: 'rgba(241, 68, 68, 0.15)',
  border: '#e1e5eb',
  input: '#e1e5eb',
  ring: '#6468f0',
  // Aliases para compatibilidad
  text: '#1d293d',
  tint: '#6468f0',
  icon: '#6c727e',
  tabIconDefault: '#6c727e',
  tabIconSelected: '#6468f0',
};

// Dark mode (.dark)
const dark = {
  background: '#0f182b',
  foreground: '#e4e8ef',
  card: '#1d293d',
  cardForeground: '#e4e8ef',
  primary: '#818cf9',
  primaryForeground: '#0f182b',
  secondary: '#2f3848',
  secondaryForeground: '#d1d4db',
  muted: '#1d293d',
  mutedForeground: '#9ba2ae',
  accent: '#364050',
  accentForeground: '#d1d4db',
  destructive: '#f14444',
  destructiveMuted: 'rgba(241, 68, 68, 0.15)',
  border: '#4b5666',
  input: '#4b5666',
  ring: '#818cf9',
  // Aliases para compatibilidad
  text: '#e4e8ef',
  tint: '#818cf9',
  icon: '#9ba2ae',
  tabIconDefault: '#9ba2ae',
  tabIconSelected: '#818cf9',
};

export const Colors = {
  light,
  dark,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
