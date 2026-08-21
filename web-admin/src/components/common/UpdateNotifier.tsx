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

  // ─── Web polling version.json ───
  const checkWebVersion = useCallback(async () => {
    // Nếu đang chạy trên Electron hoặc localhost, bỏ qua web polling
    if (window.electronAPI || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return;

    try {
      const currentVersion = import.meta.env.VITE_APP_VERSION || '0.0.0';
      const res = await fetch(`./version.json?t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.version && compareVersions(data.version, currentVersion) > 0) {
        setState({
          visible: true,
          status: 'available',
          version: data.version,
          notes: data.notes || [],
          source: 'web',
        });
      }
    } catch {
      // Lỗi fetch thì bỏ qua, không hiển thị gì
    }
  }, []);

  useEffect(() => {
    if (window.electronAPI) return; // Electron xử lý riêng

    // Kiểm tra ngay khi mount
    checkWebVersion();

    // Poll mỗi 5 phút
    const interval = setInterval(checkWebVersion, POLL_INTERVAL);

    // Kiểm tra khi tab trở lại (user quay lại sau khi nghỉ)
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

  const handleWebUpdate = () => {
    // Hard reload để xóa cache
    window.location.reload();
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[420px] max-w-[calc(100vw-2rem)]">
      <div className="rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00236F]/5 border border-[#00236F]/10 flex items-center justify-center">
              {state.status === 'downloaded' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : state.status === 'downloading' ? (
                <Loader2 className="w-5 h-5 text-[#00236F] animate-spin" />
              ) : state.source === 'web' ? (
                <Sparkles className="w-5 h-5 text-[#00236F]" />
              ) : (
                <Download className="w-5 h-5 text-[#00236F]" />
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">
                {state.status === 'downloaded'
                  ? 'Đã sẵn sàng cài đặt'
                  : state.status === 'downloading'
                    ? 'Đang tải bản cập nhật'
                    : 'Có bản cập nhật mới'}
              </p>
              {state.version && (
                <p className="text-xs text-slate-500">
                  Phiên bản {state.version}
                  {state.status === 'available' && ' đã có sẵn'}
                </p>
              )}
            </div>
          </div>
          {state.status !== 'downloading' && (
            <button onClick={dismiss} className="text-slate-400 hover:text-slate-600" title="Để sau">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Web: hiển thị danh sách notes dạng list */}
        {state.source === 'web' && state.notes && state.notes.length > 0 && (
          <div className="px-4 pt-2 pb-1">
            <p className="text-[11px] font-bold text-slate-600 mb-1.5">Nội dung cập nhật:</p>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {state.notes.map((note, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-500">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
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