import { create } from 'zustand';
import { toast } from 'sonner';
import { PenumbraApi } from '../services/api/penumbraApi';
import { ErrorHandler } from '../services/utils/errorHandler';
import type { PenumbraUpdateInfo } from '../types';

interface UpdateState {
  updateInfo: PenumbraUpdateInfo | null;
  isCheckingUpdate: boolean;
  checkUpdate: (options?: { showToast?: boolean }) => Promise<void>;
}

export const useUpdateStore = create<UpdateState>((set) => ({
  updateInfo: null,
  isCheckingUpdate: false,

  checkUpdate: async (options) => {
    const { showToast = true } = options || {};
    set({ isCheckingUpdate: true });

    try {
      const info = await PenumbraApi.checkUpdate();
      set({ updateInfo: info });

      if (info.update_available) {
        toast.info(`Update available: ${info.latest_version}`);
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
