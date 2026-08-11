import type { ThemeName } from './types';

export interface ThemeTokens {
  background: string;
  text: string;
  axis: string;
  split: string;
  colors: string[];
}

const themes: Record<ThemeName, ThemeTokens> = {
  light: {
    background: 'transparent',
    text: '#1f2937',
    axis: '#6b7280',
    split: '#e5e7eb',
    colors: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'],
  },
  dark: {
    background: 'transparent',
    text: '#e5e7eb',
    axis: '#9ca3af',
    split: '#374151',
    colors: ['#60a5fa', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#22d3ee'],
  },
  brand: {
    background: 'transparent',
    text: '#0f172a',
    axis: '#475569',
    split: '#e2e8f0',
    colors: ['#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  },
};

export function getThemeTokens(name: ThemeName = 'light'): ThemeTokens {
  return themes[name] ?? themes.light;
}
