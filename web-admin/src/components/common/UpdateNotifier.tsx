import React, { useEffect, useState, useCallback } from 'react';
import { Download, X, Loader2, CheckCircle2, AlertTriangle, RotateCcw, Sparkles } from 'lucide-react';
import type { UpdateStatusPayload } from '@/types/electron';


type UiState = {
  visible: boolean;
  status: 'available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  releaseNotes?: string;
  notes?: string[];
  percent?: number;
  transferred?: number;
  total?: number;
  bytesPerSecond?: number;
  message?: string;
  source?: 'electron' | 'web';
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
  const [isInstalling, setIsInstalling] = useState(false);

  // ─── Electron auto-update (giữ nguyên logic cũ) ───
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    api.onUpdateStatus((p: UpdateStatusPayload) => {
      switch (p.status) {
        case 'available':
          setState({ visible: true, status: 'available', version: p.version, releaseNotes: p.releaseNotes, source: 'electron' });
          break;
        case 'downloading':
          setState((s) => ({
            ...s,
            visible: true,
            status: 'downloading',
            percent: p.percent,
            transferred: p.transferred,
            total: p.total,
            bytesPerSecond: p.bytesPerSecond,
            source: 'electron',
          }));
          break;
        case 'downloaded':
          setState((s) => ({ ...s, visible: true, status: 'downloaded', version: p.version, source: 'electron' }));
          break;
        case 'error':
          setState((s) => ({ ...s, visible: true, status: 'error', message: p.message || 'Lỗi không xác định', source: 'electron' }));
          console.error('[Update] Lỗi kiểm tra/cập nhật:', p.message);
          break;
        default:
          break;
      }
    });
  }, []);

  // ─── Web & Mobile In-App Update Checker (GitHub Releases) ───
  const checkWebVersion = useCallback(async () => {
    try {
      const response = await fetch('https://api.github.com/repos/kennhope13/Titsmart_task/releases/latest', {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      if (!response.ok) return;
      const data = await response.json();
      const latestTag = (data.tag_name || '').replace(/^v/, '').trim();
      const currentVer = import.meta.env.VITE_APP_VERSION || '1.0.0';

      if (latestTag && compareVersions(latestTag, currentVer) > 0) {
        // Tìm link tải APK trực tiếp từ release assets hoặc URL quy chuẩn
        const apkAsset = data.assets?.find((a: any) => a.name.toLowerCase().endsWith('.apk'));
        const downloadUrl = apkAsset?.browser_download_url 
          || `https://github.com/kennhope13/Titsmart_task/releases/download/v${latestTag}/TITSMART-v${latestTag}.apk`;

        const rawBody = data.body || '';
        const notes = rawBody
          .split('\n')
          .map((line: string) => line.replace(/^[\s*-]+/, '').replace(/\*\*/g, '').trim())
          .filter((line: string) => line.length > 0 && !line.startsWith('#') && !line.includes('Full Changelog'));

        setState({
          visible: true,
          status: 'available',
          version: latestTag,
          releaseNotes: rawBody,
          notes: notes.length > 0 ? notes : ['Cải tiến hiệu năng & tối ưu giao diện mới nhất'],
          message: downloadUrl,
          source: 'web'
        });
      }
    } catch (err) {
      console.warn('[UpdateNotifier] Check release failed:', err);
    }
  }, []);

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

  const dismiss = () => setState({ ...state, visible: false });

  const handleWebUpdate = async () => {
    const isCapacitorNative = !!(window as any).Capacitor?.isNativePlatform?.();

    // 1. Nếu là ứng dụng Android APK cài đặt gốc (Capacitor Native)
    if (isCapacitorNative) {
      const downloadUrl = (state.message && state.message.startsWith('http')) 
        ? state.message 
        : `https://github.com/kennhope13/Titsmart_task/releases/download/v${state.version}/TITSMART-v${state.version}.apk`;
      window.location.href = downloadUrl;
      dismiss();
      return;
    }

    // 2. Nếu đang chạy trên trình duyệt Web (Desktop PC/Laptop, iOS Safari, Android Chrome):
    // Làm mới cache bộ nhớ, unregister Service Worker, và tải lại phiên bản mới nhất ngay lập tức
    setIsInstalling(true);
    setState((s) => ({ ...s, status: 'downloading', percent: 60 }));

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

    setState((s) => ({ ...s, status: 'downloaded', percent: 100 }));
    setTimeout(() => {
      // Tải lại trang với URL cache-busting để đảm bảo tải bản mới nhất từ Netlify
      const url = new URL(window.location.href);
      url.searchParams.set('_v', Date.now().toString());
      window.location.href = url.toString();
    }, 600);
  };

  const handleInstallAndRestart = () => {
    setIsInstalling(true);
    // Trigger electron auto-updater install
    try {
      window.electronAPI?.installUpdate();
    } catch (e) {
      console.error(e);
    }
  };

  // Tự động kích hoạt cài đặt và khởi động lại sau 2 giây khi đã tải xong trên Electron
  useEffect(() => {
    if (state.status === 'downloaded' && state.source === 'electron') {
      const timer = setTimeout(() => {
        handleInstallAndRestart();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state.status, state.source]);

  if (!state.visible && !isInstalling) {
    return null;
  }

  const isUpdating = state.status === 'downloading' || state.status === 'downloaded' || isInstalling;

  return (
    <>
      {/* ─── FULLSCREEN BLOCKING OVERLAY KHI ĐANG TẢI & CÀI ĐẶT BẢN CẬP NHẬT ─── */}
      {isUpdating && (
        <div 
          className="fixed inset-0 z-[999999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 select-none cursor-wait animate-fadeIn pointer-events-auto"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-outline-variant max-w-md w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-4 py-2.5 bg-surface-container-low border-b border-outline-variant flex justify-between items-center select-none shrink-0">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5 truncate">
                <span className="material-symbols-outlined text-[18px]">system_update</span>
                <span className="truncate">Cập nhật hệ thống TITSMART</span>
              </h3>
              <span className="text-[11px] font-bold text-primary px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md">
                v{state.version || 'mới'}
              </span>
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col items-center text-center">
              {/* Status Icon */}
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-3 text-primary shadow-xs">
                {state.status === 'downloaded' ? (
                  <span className="material-symbols-outlined text-3xl text-emerald-600 animate-bounce">check_circle</span>
                ) : (
                  <span className="material-symbols-outlined text-3xl text-primary animate-spin">sync</span>
                )}
              </div>

              {/* Title */}
              <h4 className="text-base font-bold text-slate-800 mb-1">
                {isInstalling 
                  ? 'Đang cài đặt bản cập nhật...'
                  : state.status === 'downloaded'
                    ? 'Đã tải xong bản cập nhật!'
                    : 'Đang tải bản cập nhật mới...'}
              </h4>

              {/* Version Comparison Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs mb-4">
                <span className="text-slate-500 font-medium">
                  Hiện tại: <strong className="text-slate-700 font-mono font-bold">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</strong>
                </span>
                <span className="material-symbols-outlined text-[13px] text-slate-400">arrow_forward</span>
                <span className="text-primary font-bold font-mono">
                  Mới: v{state.version || 'mới'}
                </span>
              </div>

              {/* TITSMART Standard Progress Bar */}
              {state.status === 'downloading' && (
                <div className="w-full space-y-1.5 mb-2">
                  <div className="flex justify-between items-center text-xs text-slate-500 font-medium">
                    <span>
                      {state.transferred && state.total 
                        ? `${(state.transferred / (1024 * 1024)).toFixed(1)} MB / ${(state.total / (1024 * 1024)).toFixed(1)} MB`
                        : 'Tiến độ tải dữ liệu'}
                      {state.bytesPerSecond ? ` • ${(state.bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s` : ''}
                    </span>
                    <span className="text-primary font-bold text-xs font-mono">{state.percent ?? 0}%</span>
                  </div>
                  
                  {/* Clean flat progress bar matching TITSMART app style */}
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                    <div 
                      className="bg-primary h-full transition-all duration-300 rounded-full"
                      style={{ width: `${Math.max(state.percent ?? 0, 2)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Actions for downloaded state */}
              {state.status === 'downloaded' && !isInstalling && (
                <button
                  onClick={handleInstallAndRestart}
                  className="w-full mt-3 py-2 px-4 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary/90 transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                  Cài đặt & Khởi động lại ngay
                </button>
              )}

              {isInstalling && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-3">
                  <div className="bg-primary h-full w-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TOAST / BANNER THÔNG BÁO KHI CÓ BẢN MỚI HOẶC LỖI (CHƯA TẢI) ─── */}
      {state.visible && !isUpdating && (
      <div className="fixed bottom-24 md:bottom-5 right-3 md:right-5 z-[9999] w-[380px] max-w-[calc(100vw-1.5rem)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="rounded-2xl bg-white border border-outline-variant shadow-2xl overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-2.5 bg-surface-container-low border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">
                {state.source === 'web' ? 'auto_awesome' : 'download'}
              </span>
              <h3 className="text-xs font-bold text-primary">
                {state.status === 'error' ? 'Lỗi cập nhật' : 'Có bản cập nhật mới'}
              </h3>
            </div>
            <button 
              onClick={dismiss} 
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors cursor-pointer" 
              title="Để sau"
            >
              <span className="material-symbols-outlined text-[18px] block">close</span>
            </button>
          </div>

          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Phiên bản hiện tại: <strong className="text-slate-700 font-mono">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</strong></span>
              <span className="text-primary font-bold font-mono px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md">
                Mới: v{state.version || 'mới'}
              </span>
            </div>

            {/* Web / Mobile: hiển thị danh sách notes dạng list gọn gàng */}
            {state.source === 'web' && state.notes && state.notes.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] font-bold text-slate-700 mb-1">Nội dung cập nhật:</p>
                <ul className="space-y-1 max-h-28 overflow-y-auto custom-scrollbar">
                  {state.notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600 leading-tight">
                      <span className="text-emerald-500 font-bold shrink-0">✓</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 pt-1 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Tải file cài đặt:</span>
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://github.com/kennhope13/Titsmart_task/releases/download/v${state.version}/TITSMART-v${state.version}.apk`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[13px]">android</span>
                      APK
                    </a>
                    <span className="text-slate-300">•</span>
                    <a
                      href="https://github.com/kennhope13/Titsmart_task/releases/latest"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-medium inline-flex items-center gap-0.5"
                    >
                      <span className="material-symbols-outlined text-[13px]">desktop_windows</span>
                      Windows
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Electron: hiển thị releaseNotes */}
            {state.source === 'electron' && state.status === 'available' && state.releaseNotes && (
              <div 
                className="text-xs text-slate-600 max-h-32 overflow-y-auto custom-scrollbar prose prose-sm prose-slate bg-slate-50 p-2.5 rounded-lg border border-slate-100"
                dangerouslySetInnerHTML={{ __html: state.releaseNotes }}
              />
            )}

            {state.status === 'error' && (
              <div>
                <p className="text-xs text-red-500 whitespace-pre-line max-h-24 overflow-y-auto">{state.message}</p>
                {state.source === 'electron' && (
                  <div className="mt-2 p-2.5 bg-slate-50 border border-slate-100 rounded-lg">
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Lỗi kết nối mạng khi tải bản cập nhật tự động. Vui lòng tải file cài đặt thủ công:
                    </p>
                    <a 
                      href="https://github.com/kennhope13/Titsmart_task/releases/latest" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold text-primary hover:underline"
                    >
                      <span className="material-symbols-outlined text-[14px]">download</span>
                      Tải Setup.exe mới nhất
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              {state.status === 'available' && (
                <>
                  <button
                    onClick={dismiss}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Để sau
                  </button>
                  {state.source === 'web' ? (
                    <button
                      onClick={handleWebUpdate}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[15px]">sync</span>
                      Cập nhật ngay
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setState(s => ({ ...s, status: 'downloading', percent: 0 }));
                        window.electronAPI?.downloadUpdate();
                      }}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[15px]">download</span>
                      Cập nhật ngay
                    </button>
                  )}
                </>
              )}
              {state.status === 'error' && (
                <button
                  onClick={dismiss}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </>
  );
};

export default UpdateNotifier;
