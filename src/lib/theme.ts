export type ThemeMode = 'dark' | 'light'

export type ThemeAccent = 'blue' | 'purple' | 'teal' | 'green' | 'red'

export type ThemePreset = 'zinc' | 'charcoal' | 'sunset' | 'warm' | 'cool' | 'hacker'

export const THEME_STORAGE_KEY = 'uiTheme'
export const ACCENT_STORAGE_KEY = 'uiAccent'
export const PRESET_STORAGE_KEY = 'uiPreset'

export const THEME_ACCENTS: ThemeAccent[] = ['blue', 'purple', 'teal', 'green', 'red']

export const THEME_PRESETS: Array<{ preset: ThemePreset; label: string }> = [
  { preset: 'zinc', label: 'Zinc' },
  { preset: 'charcoal', label: 'Charcoal' },
  { preset: 'sunset', label: 'Sunset' },
  { preset: 'warm', label: 'Warm' },
  { preset: 'cool', label: 'Cool' },
  { preset: 'hacker', label: 'Hacker' },
]

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export function getInitialAccent(): ThemeAccent {
  if (typeof window === 'undefined') return 'blue'
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY)
  return THEME_ACCENTS.includes(stored as ThemeAccent) ? (stored as ThemeAccent) : 'blue'
}

export function getInitialPreset(): ThemePreset {
  if (typeof window === 'undefined') return 'charcoal'
  const stored = localStorage.getItem(PRESET_STORAGE_KEY)
  return THEME_PRESETS.some((p) => p.preset === stored) ? (stored as ThemePreset) : 'charcoal'
}

export function applyTheme(theme: ThemeMode, accent: ThemeAccent, preset: ThemePreset = 'zinc') {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.accent = accent
  document.documentElement.dataset.preset = theme === 'dark' ? preset : 'zinc'
  document.documentElement.style.colorScheme = theme
}
