import { create } from 'zustand';
import { applyTheme, getInitialTheme, THEME_STORAGE_KEY, type ThemeMode } from '../lib/theme';

interface UIState {
  isLogPanelOpen: boolean;
  logPanelWidth: number;
  activeModal: string | null;
  theme: ThemeMode;
  
  // Actions
  openLogPanel: () => void;
  closeLogPanel: () => void;
  toggleLogPanel: () => void;
  setLogPanelWidth: (width: number) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
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
