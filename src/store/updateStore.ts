import { create } from 'zustand';
import { toast } from 'sonner';
import { PenumbraApi } from '../services/api/penumbraApi';
import { ErrorHandler } from '../services/utils/errorHandler';
import type { PenumbraUpdateInfo } from '../types';

interface UpdateState {
  updateInfo: PenumbraUpdateInfo | null;
  isCheckingUpdate: boolean;
  isUpdateModalOpen: boolean;
  setUpdateModalOpen: (open: boolean) => void;
  checkUpdate: (options?: { showToast?: boolean }) => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  updateInfo: null,
  isCheckingUpdate: false,
  isUpdateModalOpen: false,

  setUpdateModalOpen: (open: boolean) => set({ isUpdateModalOpen: open }),

  checkUpdate: async (options) => {
    const { showToast = true } = options || {};
    set({ isCheckingUpdate: true });

    try {
      const info = await PenumbraApi.checkUpdate();
      set({ updateInfo: info });

      if (info.update_available) {
        set({ isUpdateModalOpen: true });
      } else if (showToast) {
        toast.success('Penumbra is up to date');
      }
    } catch (error: unknown) {
      ErrorHandler.handle(error, 'Check updates', {
        addToOperationLog: false,
        showToast,
      });
    } finally {
      set({ isCheckingUpdate: false });
    }
  },
}));
