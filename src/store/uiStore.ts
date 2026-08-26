import { create } from 'zustand';
import {
  applyTheme,
  getInitialTheme,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from '../lib/theme';

export type LogFilter = 'all' | 'info' | 'success' | 'warning' | 'error';

interface UIState {
  logPanelHeight: number;
  logFilter: LogFilter;
  logAutoscroll: boolean;
  logFontSize: number;
  activeModal: string | null;
  theme: ThemeMode;
  compactView: boolean;
  acceptedRisk: boolean;
  sidebarCollapsed: boolean;

  // Actions
  setLogPanelHeight: (height: number) => void;
  setLogFilter: (filter: LogFilter) => void;
  setLogAutoscroll: (autoscroll: boolean) => void;
  setLogFontSize: (size: number) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setCompactView: (compact: boolean) => void;
  setAcceptedRisk: (accepted: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

function loadStoredNumber(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const stored = localStorage.getItem(key);
  const parsed = stored ? Number(stored) : NaN;
  return !Number.isNaN(parsed) && parsed > 0 ? parsed : fallback;
}

function loadStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const stored = localStorage.getItem(key);
  return stored !== null ? (stored as T) : fallback;
}

function loadStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  const stored = localStorage.getItem(key);
  return stored !== null ? stored === 'true' : fallback;
}

export const useUIStore = create<UIState>((set) => ({
  logPanelHeight: loadStoredNumber('logPanelHeight', 200),
  logFilter: loadStoredValue<LogFilter>('logFilter', 'all'),
  logAutoscroll: loadStoredBoolean('logAutoscroll', true),
  logFontSize: loadStoredNumber('logFontSize', 12),
  activeModal: null,
  theme: (() => {
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);
    return initialTheme;
  })(),
  compactView: loadStoredBoolean('compactView', false),
  acceptedRisk: loadStoredBoolean('acceptedRisk', false),
  sidebarCollapsed: loadStoredBoolean('sidebarCollapsed', false),

  setLogPanelHeight: (height) => {
    set({ logPanelHeight: height });
    if (typeof window !== 'undefined') {
      localStorage.setItem('logPanelHeight', height.toString());
    }
  },

  setLogFilter: (filter) => {
    set({ logFilter: filter });
    if (typeof window !== 'undefined') {
      localStorage.setItem('logFilter', filter);
    }
  },

  setLogAutoscroll: (autoscroll) => {
    set({ logAutoscroll: autoscroll });
    if (typeof window !== 'undefined') {
      localStorage.setItem('logAutoscroll', autoscroll.toString());
    }
  },

  setLogFontSize: (size) => {
    set({ logFontSize: size });
    if (typeof window !== 'undefined') {
      localStorage.setItem('logFontSize', size.toString());
    }
  },

  openModal: (modalId) => set({ activeModal: modalId }),

  closeModal: () => set({ activeModal: null }),

  setTheme: (theme) => {
    set({ theme });
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    applyTheme(theme);
    if (typeof window !== 'undefined') {
      import('@tauri-apps/api/window')
        .then(({ getCurrentWindow }) => getCurrentWindow().setTheme(theme))
        .catch(() => undefined);
    }
  },

  toggleTheme: () =>
    set((state) => {
      const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
      }
      applyTheme(nextTheme);
      if (typeof window !== 'undefined') {
        import('@tauri-apps/api/window')
          .then(({ getCurrentWindow }) => getCurrentWindow().setTheme(nextTheme))
          .catch(() => undefined);
      }
      return { theme: nextTheme };
    }),

  setCompactView: (compact) => {
    set({ compactView: compact });
    if (typeof window !== 'undefined') {
      localStorage.setItem('compactView', compact.toString());
    }
    document.documentElement.dataset.compact = compact ? 'true' : 'false';
  },

  setAcceptedRisk: (accepted) => {
    set({ acceptedRisk: accepted });
    if (typeof window !== 'undefined') {
      localStorage.setItem('acceptedRisk', accepted.toString());
    }
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', collapsed.toString());
    }
  },
}));
