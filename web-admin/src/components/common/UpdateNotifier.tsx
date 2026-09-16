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

  if (!state.visible) return null;

  const dismiss = () => setState({ ...state, visible: false });

  const handleWebUpdate = async () => {
    const downloadUrl = (state.message && state.message.startsWith('http')) 
      ? state.message 
      : `https://github.com/kennhope13/Titsmart_task/releases/download/v${state.version}/TITSMART-v${state.version}.apk`;

    // Nếu chạy trên Capacitor Android Native, tải APK trực tiếp để người dùng cài đặt
    const isCapacitorNative = !!(window as any).Capacitor?.isNativePlatform?.();

    if (isCapacitorNative) {
      window.open(downloadUrl, '_system');
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
          window.location.reload();
        }
      };

      xhr.onerror = () => {
        window.location.reload();
      };

      xhr.send();
    } catch (err) {
      window.location.href = downloadUrl;
    }
  };

  return (
    <div className="fixed bottom-24 md:bottom-5 right-3 md:right-5 z-[9999] w-[380px] max-w-[calc(100vw-1.5rem)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              {state.status === 'downloaded' ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : state.status === 'downloading' ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : state.source === 'web' ? (
                <Sparkles className="w-4 h-4 text-primary" />
              ) : (
                <Download className="w-4 h-4 text-primary" />
              )}
            </div>
            <div>
              <p className="text-xs md:text-sm font-extrabold text-slate-800">
                {state.status === 'downloaded'
                  ? 'Đã sẵn sàng cài đặt'
                  : state.status === 'downloading'
                    ? 'Đang tải bản cập nhật'
                    : 'Có bản cập nhật mới'}
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                Phiên bản thiết bị: <span className="font-bold text-slate-700">v{import.meta.env.VITE_APP_VERSION || '1.0.0'}</span> → Mới: <span className="font-bold text-primary">v{state.version || 'mới'}</span>
              </p>
            </div>
          </div>
          {state.status !== 'downloading' && (
            <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 p-1" title="Để sau">
              <X className="w-4 h-4" />
            </button>
          )}
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

        {state.status === 'downloading' && (
          <div className="px-4 pt-2">
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#00236F] transition-all" style={{ width: `${state.percent ?? 0}%` }} />
            </div>
            <p className="text-xs text-slate-500 mt-1.5">{state.percent ?? 0}%</p>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 px-4 pb-3.5 pt-2">
          {state.status === 'available' && (
            <>
              <button
                onClick={dismiss}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Để sau
              </button>
              {state.source === 'web' ? (
                <button
                  onClick={handleWebUpdate}
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-[#00236F] hover:bg-[#001a56] rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Cập nhật ngay
                </button>
              ) : (
                <button
                  onClick={() => window.electronAPI?.downloadUpdate()}
                  className="px-3 py-1.5 text-sm font-semibold text-white bg-[#00236F] hover:bg-[#001a56] rounded-lg transition-colors"
                >
                  Cập nhật ngay
                </button>
              )}
            </>
          )}
          {state.status === 'downloading' && (
            <span className="text-xs text-slate-400 inline-flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Không đóng app khi đang tải
            </span>
          )}
          {state.status === 'downloaded' && (
            <>
              <button
                onClick={dismiss}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Để sau
              </button>
              <button
                onClick={() => window.electronAPI?.installUpdate()}
                className="px-3 py-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Cài đặt & khởi động lại
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateNotifier;
