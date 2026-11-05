// Pure White Minimalist Terminal Theme

export const TERM_COLOR_KEY = 'aries-term-color'
export const TERM_COLOR_EVENT = 'term-color-change'
export const DEFAULT_TERM_COLOR = '#0f172a'

export const WHITE_PALETTE: Record<string, string> = {
  '--term-bg': '#f8fafc',
  '--term-panel': 'rgba(255, 255, 255, 0.92)',
  '--term-fg': '#334155',
  '--term-fg-strong': '#0f172a',
  '--term-dim': '#64748b',
  '--term-faint': '#94a3b8',
  '--term-line': 'rgba(0, 0, 0, 0.08)',
  '--term-accent': '#0f172a',
  '--term-selection': 'rgba(15, 23, 42, 0.12)',
  '--term-red': '#dc2626',
  '--term-yellow': '#d97706',
  '--term-green': '#16a34a',
  '--term-cyan': '#0284c7',
  '--term-blue': '#2563eb',
  '--term-magenta': '#9333ea',
  '--glaze-surface': 'rgba(255, 255, 255, 0.88)',
  '--glaze-panel': 'rgba(255, 255, 255, 0.94)',
  '--glaze-border-light': 'rgba(0, 0, 0, 0.08)',
  '--glaze-border-shadow': 'rgba(0, 0, 0, 0.04)',
  '--glaze-glow': 'rgba(0, 0, 0, 0.04)',
  '--glaze-glow-vivid': 'rgba(0, 0, 0, 0.08)',
  '--glaze-caustic-1': 'rgba(240, 244, 248, 0.6)',
  '--glaze-caustic-2': 'rgba(248, 250, 252, 0.4)',
  '--glaze-specular': 'rgba(255, 255, 255, 0.8)',
  '--term-mode': 'light',
}

export function derivePalette(): Record<string, string> {
  return { ...WHITE_PALETTE }
}

export function getStoredTermColor(): string {
  return DEFAULT_TERM_COLOR
}

export function applyTermColor(): void {
  // Pure white locked
}

// Boot script: apply the clean white palette before first paint (no flash).
export const themeBoot = `(function(){
  try {
    document.documentElement.dataset.mode = 'light';
    document.documentElement.style.colorScheme = 'light';
  } catch (e) {}
})()`
