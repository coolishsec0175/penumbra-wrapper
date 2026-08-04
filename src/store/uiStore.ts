import { create } from 'zustand';
import {
  applyTheme,
  getInitialAccent,
  getInitialPreset,
  getInitialTheme,
  THEME_STORAGE_KEY,
  ACCENT_STORAGE_KEY,
  PRESET_STORAGE_KEY,
  type ThemeMode,
  type ThemeAccent,
  type ThemePreset,
} from '../lib/theme';

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
  accent: ThemeAccent;
  preset: ThemePreset;
  sidebarCollapsed: boolean;
  compactView: boolean;
  acceptedRisk: boolean;

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
  setAccent: (accent: ThemeAccent) => void;
  setPreset: (preset: ThemePreset) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCompactView: (compact: boolean) => void;
  setAcceptedRisk: (accepted: boolean) => void;
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

export const useUIStore = create<UIState>((set, get) => ({
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
    applyTheme(initialTheme, getInitialAccent(), getInitialPreset());
    return initialTheme;
  })(),
  accent: getInitialAccent(),
  preset: getInitialPreset(),
  sidebarCollapsed: loadStoredBoolean('sidebarCollapsed', false),
  compactView: loadStoredBoolean('compactView', false),
  acceptedRisk: loadStoredBoolean('acceptedRisk', false),

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
    applyTheme(theme, get().accent, get().preset);
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
      applyTheme(nextTheme, state.accent, state.preset);
      if (typeof window !== 'undefined') {
        import('@tauri-apps/api/window')
          .then(({ getCurrentWindow }) => getCurrentWindow().setTheme(nextTheme))
          .catch(() => undefined);
      }
      return { theme: nextTheme };
    }),

  setAccent: (accent) => {
    set({ accent });
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    }
    applyTheme(get().theme, accent, get().preset);
  },

  setPreset: (preset) => {
    set({ preset });
    if (typeof window !== 'undefined') {
      localStorage.setItem(PRESET_STORAGE_KEY, preset);
    }
    applyTheme(get().theme, get().accent, preset);
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', collapsed.toString());
    }
  },

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
}));
