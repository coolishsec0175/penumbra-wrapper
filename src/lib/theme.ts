export type ThemeMode = 'dark' | 'light'

export const THEME_STORAGE_KEY = 'uiTheme'

export function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === 'undefined') return

  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}
