export type ThemeMode = 'dark' | 'light'

export type ThemeAccent = 'blue' | 'purple' | 'teal' | 'green' | 'red'

export type ThemePreset = 'system' | 'rose_pine_moon' | 'gruvbox_light' | 'gruvbox_dark'

export const THEME_STORAGE_KEY = 'uiTheme'
export const ACCENT_STORAGE_KEY = 'uiAccent'
export const PRESET_STORAGE_KEY = 'uiPreset'

export const THEME_ACCENTS: ThemeAccent[] = ['blue', 'purple', 'teal', 'green', 'red']

export const THEME_PRESETS: Array<{ preset: ThemePreset; label: string }> = [
  { preset: 'system', label: 'System' },
  { preset: 'rose_pine_moon', label: 'Rosé Pine Moon' },
  { preset: 'gruvbox_light', label: 'Gruvbox Light' },
  { preset: 'gruvbox_dark', label: 'Gruvbox Dark' },
]

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
  return 'dark'
}

export function getInitialAccent(): ThemeAccent {
  if (typeof window === 'undefined') return 'teal'
  const stored = localStorage.getItem(ACCENT_STORAGE_KEY)
  return THEME_ACCENTS.includes(stored as ThemeAccent) ? (stored as ThemeAccent) : 'teal'
}

export function getInitialPreset(): ThemePreset {
  if (typeof window === 'undefined') return 'system'
  const stored = localStorage.getItem(PRESET_STORAGE_KEY)
  return THEME_PRESETS.some((p) => p.preset === stored) ? (stored as ThemePreset) : 'system'
}

export function applyTheme(theme: ThemeMode, accent: ThemeAccent, preset: ThemePreset = 'system') {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.accent = accent
  document.documentElement.dataset.preset = preset
  document.documentElement.style.colorScheme = theme
}
