import { useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Flash } from './pages/Flash';
import { Exploit } from './pages/Exploit';
import { Device } from './pages/Device';
import { Log } from './pages/Log';
import { Settings } from './pages/Settings';
import { UpdateAvailableModal } from './components/UpdateAvailableModal';
import { RiskDisclaimerModal } from './components/RiskDisclaimerModal';
import { useOperationStream } from './hooks/useOperationStream';
import { useSettings } from './hooks/useSettings';
import { ConfirmationProvider } from './hooks/confirmationProvider';
import { DeviceApi } from './services/api/deviceApi';
import { useDeviceStore } from './store/deviceStore';
import { useUpdateStore } from './store/updateStore';

function AppContent() {
  useOperationStream();

  const { isLoading: isSettingsLoading, error: settingsError } = useSettings();
  const autoCheckUpdates = useDeviceStore((state) => state.autoCheckUpdates);
  const isSettingsLoaded = useDeviceStore((state) => state.isSettingsLoaded);
  const hasPromptedUpdate = useRef(false);
  const updateInfo = useUpdateStore((state) => state.updateInfo);
  const isUpdateModalOpen = useUpdateStore((state) => state.isUpdateModalOpen);
  const checkUpdate = useUpdateStore((state) => state.checkUpdate);
  const setUpdateModalOpen = useUpdateStore((state) => state.setUpdateModalOpen);

  useEffect(() => {
    if (!isSettingsLoaded || !autoCheckUpdates) return;
    if (hasPromptedUpdate.current) return;
    hasPromptedUpdate.current = true;

    checkUpdate({ showToast: false });
  }, [autoCheckUpdates, checkUpdate, isSettingsLoaded]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      DeviceApi.cancelOperation().catch(() => undefined);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      handleBeforeUnload();
    };
  }, []);

  return (
    <BrowserRouter>
        {isSettingsLoading && (
          <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[200] px-3 py-1.5 text-xs font-medium bg-muted text-foreground border border-border rounded-full shadow">
            Loading settings...
          </div>
        )}
        {settingsError && (
          <div className="fixed top-3 right-3 z-[200] px-3 py-1.5 text-xs font-medium bg-error/10 text-error border border-error rounded shadow">
            Settings load failed: {settingsError}
          </div>
        )}
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="flash" element={<Flash />} />
          <Route path="exploit" element={<Exploit />} />
          <Route path="device" element={<Device />} />
          <Route path="log" element={<Log />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      <Toaster position="top-center" theme="dark" />

      <UpdateAvailableModal
        isOpen={isUpdateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        updateInfo={updateInfo}
      />

      <RiskDisclaimerModal />
    </BrowserRouter>
  );
}

function App() {
  return (
    <ConfirmationProvider>
      <AppContent />
    </ConfirmationProvider>
  );
}

export default App;
