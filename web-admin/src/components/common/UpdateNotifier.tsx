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
          setState((s) => ({ ...s, visible: true, status: 'downloading', percent: p.percent, source: 'electron' }));
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
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isCapacitorNative = !!(window as any).Capacitor?.isNativePlatform?.();
    const isAndroid = /android/i.test(navigator.userAgent);

    // Xử lý riêng cho iPhone / iOS / PWA Web App:
    // Làm mới cache bộ nhớ và tải lại phiên bản mới nhất ngay lập tức mà không cần tải file APK
    if (isIOS) {
      setIsInstalling(true);
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
        console.warn('Lỗi dọn cache iOS:', err);
      }
      setTimeout(() => {
        window.location.reload();
      }, 1200);
      return;
    }

    const downloadUrl = (state.message && state.message.startsWith('http')) 
      ? state.message 
      : `https://github.com/kennhope13/Titsmart_task/releases/download/v${state.version}/TITSMART-v${state.version}.apk`;

    // Ưu tiên tải trực tiếp file APK cho Android Native hoặc trình duyệt Android
    if (isCapacitorNative || isAndroid) {
      // Chuyển hướng trực tiếp URL tải APK để trình duyệt Android kích hoạt Download Manager hệ thống
      window.location.href = downloadUrl;
      dismiss();
      return;
    }

    setState((s) => ({ ...s, status: 'downloading', percent: 0 }));

    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', downloadUrl, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setState((s) => ({ ...s, status: 'downloading', percent }));
        } else {
          setState((s) => ({ ...s, status: 'downloading', percent: Math.min((s.percent || 0) + 15, 90) }));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const blob = xhr.response;
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `TITSMART-v${state.version || 'latest'}.apk`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setState((s) => ({ ...s, status: 'downloaded', percent: 100 }));
        } else {
          window.open(downloadUrl, '_blank');
          dismiss();
        }
      };

      xhr.onerror = () => {
        window.open(downloadUrl, '_blank');
        dismiss();
      };

      xhr.send();
    } catch (err) {
      window.open(downloadUrl, '_blank');
      dismiss();
    }
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
          className="fixed inset-0 z-[999999] bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 text-white select-none cursor-wait animate-fadeIn pointer-events-auto"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <div className="bg-slate-900/95 border border-slate-700/80 p-6 sm:p-8 rounded-2xl max-w-md w-full text-center shadow-2xl flex flex-col items-center relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-16 -left-16 w-36 h-36 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Icon */}
            <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center mb-4 text-sky-400 shadow-inner relative z-10">
              {state.status === 'downloaded' ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
              ) : isInstalling ? (
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              ) : (
                <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
              )}
            </div>

            {/* Title */}
            <h2 className="text-lg sm:text-xl font-bold text-white mb-1.5 relative z-10">
              {isInstalling 
                ? 'Đang cài đặt bản cập nhật...'
                : state.status === 'downloaded'
                  ? 'Đã tải xong bản cập nhật!'
                  : 'Đang tải bản cập nhật mới...'}
            </h2>

            {/* Version info */}
            <p className="text-xs text-slate-300 font-medium mb-4 relative z-10">
              Phiên bản hiện tại: <span className="font-bold text-slate-200">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span>
              {' → '}
              Phiên bản mới: <span className="font-bold text-emerald-400">v{state.version || 'mới'}</span>
            </p>

            {/* Progress bar */}
            {state.status === 'downloading' && (
              <div className="w-full mb-4 relative z-10">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-1.5">
                  <span>Tiến độ tải dữ liệu</span>
                  <span className="text-sky-400 font-bold text-sm">{state.percent ?? 0}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700/60 p-0.5">
                  <div 
                    className="bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 h-full transition-all duration-300 rounded-full shadow-sm"
                    style={{ width: `${Math.max(state.percent ?? 0, 4)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Notice / Warning box */}
            <div className="w-full bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-left mb-4 flex items-start gap-2.5 relative z-10">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] sm:text-xs text-amber-200/90 leading-relaxed font-medium">
                {state.status === 'downloaded' || isInstalling
                  ? 'Hệ thống đang chuẩn bị cài đặt và sẽ tự động khởi động lại ứng dụng trong giây lát.'
                  : 'Hệ thống đang tạm khóa thao tác để bảo toàn dữ liệu trong quá trình cập nhật. Vui lòng không đóng ứng dụng.'}
              </p>
            </div>

            {/* Actions for downloaded state */}
            {state.status === 'downloaded' && !isInstalling && (
              <button
                onClick={handleInstallAndRestart}
                className="w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-98 relative z-10"
              >
                <RotateCcw className="w-4 h-4" />
                Cài đặt & Khởi động lại ngay
              </button>
            )}

            {isInstalling && (
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden relative z-10">
                <div className="bg-emerald-500 h-full w-full animate-pulse"></div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TOAST / BANNER THÔNG BÁO KHI CÓ BẢN MỚI HOẶC LỖI (CHƯA TẢI) ─── */}
      {state.visible && !isUpdating && (
      <div className="fixed bottom-24 md:bottom-5 right-3 md:right-5 z-[9999] w-[380px] max-w-[calc(100vw-1.5rem)] pb-[env(safe-area-inset-bottom,0px)]">
        <div className="rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
          <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                {state.source === 'web' ? (
                  <Sparkles className="w-4 h-4 text-primary" />
                ) : (
                  <Download className="w-4 h-4 text-primary" />
                )}
              </div>
              <div>
                <p className="text-xs md:text-sm font-extrabold text-slate-800">
                  {state.status === 'error' ? 'Lỗi cập nhật' : 'Có bản cập nhật mới'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  Phiên bản thiết bị: <span className="font-bold text-slate-700">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span> → Mới: <span className="font-bold text-primary">v{state.version || 'mới'}</span>
                </p>
              </div>
            </div>
            <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer" title="Để sau">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Web / Mobile: hiển thị danh sách notes dạng list gọn gàng */}
          {state.source === 'web' && state.notes && state.notes.length > 0 && (
            <div className="px-4 pt-1.5 pb-1">
              <p className="text-[11px] font-bold text-slate-600 mb-1">Nội dung cập nhật:</p>
              <ul className="space-y-1 max-h-24 overflow-y-auto">
                {state.notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-600 leading-tight">
                    <span className="text-emerald-500 font-bold shrink-0">✓</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Electron: hiển thị releaseNotes HTML */}
          {state.source === 'electron' && state.status === 'available' && state.releaseNotes && (
            <div className="px-4 pt-2 pb-1">
              <div 
                className="text-xs text-slate-500 max-h-32 overflow-y-auto prose prose-sm prose-slate"
                dangerouslySetInnerHTML={{ __html: state.releaseNotes }}
              />
            </div>
          )}

          {state.status === 'error' && (
            <div className="px-4 pt-2 pb-1">
              <p className="text-xs text-red-500 whitespace-pre-line max-h-24 overflow-y-auto">{state.message}</p>
              {state.source === 'electron' && (
                <div className="mt-2 p-2 bg-slate-50 border border-slate-100 rounded-lg">
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Lỗi kết nối mạng khi tải bản cập nhật tự động. Vui lòng tải file cài đặt thủ công:
                  </p>
                  <a 
                    href="https://github.com/kennhope13/Titsmart_task/releases/latest" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1 mt-1.5 text-xs font-bold text-primary hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Tải Setup.exe mới nhất
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 px-4 pb-3.5 pt-2">
            {state.status === 'available' && (
              <>
                <button
                  onClick={dismiss}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Để sau
                </button>
                {state.source === 'web' ? (
                  <button
                    onClick={handleWebUpdate}
                    className="px-3 py-1.5 text-sm font-semibold text-white bg-[#00236F] hover:bg-[#001a56] rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Cập nhật ngay
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setState(s => ({ ...s, status: 'downloading', percent: 0 }));
                      window.electronAPI?.downloadUpdate();
                    }}
                    className="px-3 py-1.5 text-sm font-semibold text-white bg-[#00236F] hover:bg-[#001a56] rounded-lg transition-colors cursor-pointer active:scale-95"
                  >
                    Cập nhật ngay
                  </button>
                )}
              </>
            )}
            {state.status === 'error' && (
              <button
                onClick={dismiss}
                className="px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </>
  );
};

export default UpdateNotifier;
