import { create } from 'zustand';
import { applyTheme, getInitialTheme, THEME_STORAGE_KEY, type ThemeMode } from '../lib/theme';

export type LogFilter = 'all' | 'info' | 'success' | 'warning' | 'error';
export type LogPanelPosition = 'right' | 'bottom';

interface UIState {
  isLogPanelOpen: boolean;
  logPanelWidth: number;
  logPanelHeight: number;
  logPanelPosition: LogPanelPosition;
  logFilter: LogFilter;
  logAutoscroll: boolean;
  logFontSize: number;
  activeModal: string | null;
  theme: ThemeMode;

  // Actions
  openLogPanel: () => void;
  closeLogPanel: () => void;
  toggleLogPanel: () => void;
  setLogPanelWidth: (width: number) => void;
  setLogPanelHeight: (height: number) => void;
  setLogPanelPosition: (position: LogPanelPosition) => void;
  setLogFilter: (filter: LogFilter) => void;
  setLogAutoscroll: (autoscroll: boolean) => void;
  setLogFontSize: (size: number) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
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
  isLogPanelOpen: false,
  logPanelWidth: (() => {
    if (typeof window === 'undefined') return 800;
    const storedWidth = localStorage.getItem('logPanelWidth');
    const parsedWidth = storedWidth ? Number(storedWidth) : NaN;
    if (!Number.isNaN(parsedWidth) && parsedWidth > 0) {
      return parsedWidth;
    }
    return window.innerWidth * 0.4;
  })(),
  logPanelHeight: loadStoredNumber('logPanelHeight', 240),
  logPanelPosition: loadStoredValue<LogPanelPosition>('logPanelPosition', 'right'),
  logFilter: loadStoredValue<LogFilter>('logFilter', 'all'),
  logAutoscroll: loadStoredBoolean('logAutoscroll', true),
  logFontSize: loadStoredNumber('logFontSize', 12),
  activeModal: null,
  theme: (() => {
    const initialTheme = getInitialTheme();
    applyTheme(initialTheme);
    return initialTheme;
  })(),

  openLogPanel: () => set({ isLogPanelOpen: true }),

  closeLogPanel: () => set({ isLogPanelOpen: false }),

  toggleLogPanel: () => set((state) => ({ isLogPanelOpen: !state.isLogPanelOpen })),

  setLogPanelWidth: (width) => {
    set({ logPanelWidth: width });
    if (typeof window !== 'undefined') {
      localStorage.setItem('logPanelWidth', width.toString());
    }
  },

  setLogPanelHeight: (height) => {
    set({ logPanelHeight: height });
    if (typeof window !== 'undefined') {
      localStorage.setItem('logPanelHeight', height.toString());
    }
  },

  setLogPanelPosition: (position) => {
    set({ logPanelPosition: position });
    if (typeof window !== 'undefined') {
      localStorage.setItem('logPanelPosition', position);
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
}));
