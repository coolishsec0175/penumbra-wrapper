export type ThemeMode = 'dark' | 'light'

export type ThemeAccent = 'blue' | 'purple' | 'teal' | 'green' | 'red'

export const THEME_STORAGE_KEY = 'uiTheme'
export const ACCENT_STORAGE_KEY = 'uiAccent'

export const THEME_ACCENTS: ThemeAccent[] = ['blue', 'purple', 'teal', 'green', 'red']

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

export function applyTheme(theme: ThemeMode, accent: ThemeAccent) {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
  document.documentElement.dataset.accent = accent
  document.documentElement.style.colorScheme = theme
}
