import React, { useEffect, useState, useCallback } from 'react';
import type { UpdateStatusPayload } from '@/types/electron';
import { useUIStore } from '../../services/uiStore';
import { sendSystemNotification } from '../../services/systemNotificationService';

type UiState = {
  visible: boolean;
  status: 'available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  source?: 'electron' | 'web';
  message?: string;
};

const initialState: UiState = { visible: false, status: 'available' };

const POLL_INTERVAL = 5 * 60 * 1000; // 5 phút

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export const UpdateNotifier: React.FC = () => {
  const [state, setState] = useState<UiState>(initialState);
  const [isRestarting, setIsRestarting] = useState(false);
  const { setAvailableUpdateVersion, availableUpdateVersion, isUpdatingApp, setIsUpdatingApp } = useUIStore();

  const isUpdating = isRestarting || isUpdatingApp;
  const currentVer = state.version || availableUpdateVersion || '';

  const notifyNewVersion = useCallback((ver: string, source: 'electron' | 'web', downloadUrl?: string) => {
    setState({
      visible: true,
      status: 'downloaded',
      version: ver,
      source,
      message: downloadUrl,
    });
    setAvailableUpdateVersion(ver);

    // Gửi thông báo hệ thống ra ngoài ứng dụng (Desktop Windows / Mobile Phone)
    const hasNotifiedKey = `titsmart_notified_ver_${ver}`;
    if (!sessionStorage.getItem(hasNotifiedKey)) {
      sessionStorage.setItem(hasNotifiedKey, 'true');
      sendSystemNotification({
        id: `update-${ver}`,
        title: `TITSMART có phiên bản mới v${ver}`,
        body: `Bản cập nhật v${ver} đã sẵn sàng. Mở ứng dụng để cập nhật ngay!`,
      });
    }
  }, [setAvailableUpdateVersion]);

  // Cho phép kiểm tra hiển thị nút demo qua url ?demo_update=1 hoặc hash
  useEffect(() => {
    const search = window.location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '');
    const params = new URLSearchParams(search);
    if (params.get('demo_update') === '1' || params.get('demo_update') === 'true' || localStorage.getItem('titsmart_show_update_preview') === 'true') {
      notifyNewVersion('3.8.176', 'web');
    }
  }, [notifyNewVersion]);

  // ─── Electron auto-update listener ───
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    api.onUpdateStatus((p: UpdateStatusPayload) => {
      switch (p.status) {
        case 'available':
          break;
        case 'downloaded':
          if (p.version) {
            notifyNewVersion(p.version, 'electron');
          }
          break;
        case 'error':
          console.warn('[UpdateNotifier] Electron auto-updater:', p.message);
          break;
        default:
          break;
      }
    });
  }, [notifyNewVersion]);

  // ─── Web & Mobile In-App Update Checker (GitHub Releases) ───
  const checkWebVersion = useCallback(async () => {
    try {
      const response = await fetch('https://api.github.com/repos/kennhope13/Titsmart_task/releases/latest', {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (!response.ok) return;
      const data = await response.json();
      const latestTag = (data.tag_name || '').replace(/^v/, '').trim();
      const currentVerEnv = import.meta.env.VITE_APP_VERSION || '1.0.0';

      if (latestTag && compareVersions(latestTag, currentVerEnv) > 0) {
        const apkAsset = data.assets?.find((a: any) => a.name.toLowerCase().endsWith('.apk'));
        const downloadUrl = apkAsset?.browser_download_url 
          || `https://github.com/kennhope13/Titsmart_task/releases/download/v${latestTag}/TITSMART-v${latestTag}.apk`;

        notifyNewVersion(latestTag, 'web', downloadUrl);
      }
    } catch (err) {
      console.warn('[UpdateNotifier] Check release failed:', err);
    }
  }, [notifyNewVersion]);

  useEffect(() => {
    if (window.electronAPI) return;
    checkWebVersion();
    const interval = setInterval(checkWebVersion, POLL_INTERVAL);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkWebVersion();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkWebVersion]);

  const handleRestart = async () => {
    setIsRestarting(true);
    setIsUpdatingApp(true);

    // 1. Electron Desktop App: Gọi updater restart & install ngay lập tức
    if (state.source === 'electron') {
      try {
        window.electronAPI?.installUpdate();
      } catch (e) {
        console.error(e);
        setIsRestarting(false);
        setIsUpdatingApp(false);
      }
      return;
    }

    // 2. Mobile App (Capacitor Native APK)
    const isCapacitorNative = !!(window as any).Capacitor?.isNativePlatform?.();
    if (isCapacitorNative) {
      const downloadUrl = (state.message && state.message.startsWith('http')) 
        ? state.message 
        : `https://github.com/kennhope13/Titsmart_task/releases/download/v${state.version || availableUpdateVersion}/TITSMART-v${state.version || availableUpdateVersion}.apk`;
      try {
        window.open(downloadUrl, '_system');
      } catch (_) {
        window.location.href = downloadUrl;
      }
      setIsRestarting(false);
      setIsUpdatingApp(false);
      return;
    }

    // 3. Web Browser: Dọn sạch cache và tải lại trang tức thì
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
    } catch (err) {
      console.warn('Lỗi dọn cache web:', err);
    }

    setTimeout(() => {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('_v', Date.now().toString());
        window.location.replace(url.toString());
      } catch (_) {
        window.location.reload();
      }
    }, 300);
  };

  return (
    <>
      {/* ─── FULL-SCREEN BLOCKING OVERLAY: Chặn toàn bộ thao tác click/gõ khi đang cập nhật ─── */}
      {isUpdating && (
        <div 
          className="fixed inset-0 z-[99999999] bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto select-none cursor-wait p-4 touch-none overscroll-contain"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
          onKeyDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 max-w-[280px] xs:max-w-xs sm:max-w-sm w-full shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-3 sm:mb-4 text-[#00236f] dark:text-blue-400">
              <span className="material-symbols-outlined text-2xl sm:text-3xl animate-spin">
                restart_alt
              </span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Đang cập nhật phiên bản {currentVer ? `v${currentVer}` : ''}
            </h3>
          </div>
        </div>
      )}

      {/* ─── FLOATING BADGE NÚT TẢI LẠI (ĐÃ CHUẨN HÓA CHO CẢ MOBILE & DESKTOP) ─── */}
      {state.visible && !isUpdating && (
        <div className="fixed right-16 sm:right-20 bottom-[calc(env(safe-area-inset-bottom,0px)+74px)] sm:bottom-5 md:right-20 z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-auto select-none">
          <div className="inline-flex items-center gap-1.5 bg-[#00236f] hover:bg-[#001c5a] active:bg-[#001545] text-white px-2.5 py-1.5 min-h-[34px] rounded-xl shadow-lg border border-white/20 text-xs font-bold transition-all">
            <button
              type="button"
              onClick={handleRestart}
              disabled={isUpdating}
              title={`Khởi động lại để cập nhật phiên bản mới v${state.version || ''}`}
              className="inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-75 disabled:cursor-wait"
            >
              <span className={`material-symbols-outlined text-[17px] ${isUpdating ? 'animate-spin' : ''}`}>
                restart_alt
              </span>
              <span className="font-mono text-xs font-bold tracking-tight">
                v{state.version}
              </span>
            </button>
            {!isUpdating && (
              <button
                type="button"
                onClick={() => setState(s => ({ ...s, visible: false }))}
                className="p-0.5 hover:bg-white/20 rounded-md transition-colors cursor-pointer ml-0.5 opacity-75 hover:opacity-100"
                title="Để sau"
              >
                <span className="material-symbols-outlined text-[14px] block">close</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default UpdateNotifier;
