import { create } from 'zustand';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import toast from 'react-hot-toast';
import { ErrorHandler } from '../services/utils/errorHandler';

export interface WrapperUpdateInfo {
  version: string;
  date: string | null;
  body: string | null;
}

interface WrapperUpdateState {
  updateInfo: WrapperUpdateInfo | null;
  isCheckingUpdate: boolean;
  isDownloadingUpdate: boolean;
  isUpdateModalOpen: boolean;
  setUpdateModalOpen: (open: boolean) => void;
  checkForUpdate: (options?: { showToast?: boolean }) => Promise<void>;
  downloadAndInstall: () => Promise<void>;
}

let currentUpdate: Update | null = null;
let hasPromptedOnStartup = false;

export const useWrapperUpdateStore = create<WrapperUpdateState>((set) => ({
  updateInfo: null,
  isCheckingUpdate: false,
  isDownloadingUpdate: false,
  isUpdateModalOpen: false,

  setUpdateModalOpen: (open) => set({ isUpdateModalOpen: open }),

  checkForUpdate: async (options) => {
    const { showToast = false } = options || {};

    if (hasPromptedOnStartup) {
      return;
    }
    hasPromptedOnStartup = true;

    set({ isCheckingUpdate: true });

    try {
      const update = await check();

      if (!update) {
        if (showToast) {
          toast.success('PenumbraWrapper is up to date');
        }
        set({ updateInfo: null, isUpdateModalOpen: false });
        return;
      }

      currentUpdate = update;
      set({
        updateInfo: {
          version: update.version,
          date: update.date ?? null,
          body: update.body ?? null,
        },
        isUpdateModalOpen: true,
      });
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'Check wrapper update', {
        addToOperationLog: false,
        showToast,
      });
    } finally {
      set({ isCheckingUpdate: false });
    }
  },

  downloadAndInstall: async () => {
    if (!currentUpdate) {
      set({ isUpdateModalOpen: false });
      return;
    }

    set({ isDownloadingUpdate: true });

    try {
      await currentUpdate.downloadAndInstall();
      toast.success('Update installed. Restarting...');
      await relaunch();
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'Download wrapper update', {
        addToOperationLog: false,
      });
    } finally {
      set({ isDownloadingUpdate: false });
    }
  },
}));
