import React, { useEffect, useState } from 'react';
import { Download, X, Loader2, CheckCircle2, AlertTriangle, RotateCcw } from 'lucide-react';
import type { UpdateStatusPayload } from '@/types/electron';

type UiState = {
  visible: boolean;
  status: 'available' | 'downloading' | 'downloaded';
  version?: string;
  releaseNotes?: string;
  percent?: number;
};

const initialState: UiState = { visible: false, status: 'available' };

export const UpdateNotifier: React.FC = () => {
  const [state, setState] = useState<UiState>(initialState);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    api.onUpdateStatus((p: UpdateStatusPayload) => {
      switch (p.status) {
        case 'available':
          setState({ visible: true, status: 'available', version: p.version, releaseNotes: p.releaseNotes });
          break;
        case 'downloading':
          setState((s) => ({ ...s, visible: true, status: 'downloading', percent: p.percent }));
          break;
        case 'downloaded':
          setState((s) => ({ ...s, visible: true, status: 'downloaded', version: p.version }));
          break;
        case 'error':
          // Không làm phiền người dùng khi kiểm tra lỗi, chỉ log console
          setState((s) => ({ ...s, visible: false }));
          console.error('[Update] Lỗi kiểm tra/cập nhật:', p.message);
          break;
        default:
          break;
      }
    });
  }, []);

  if (!state.visible) return null;

  const dismiss = () => setState({ ...state, visible: false });

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[380px] max-w-[calc(100vw-2rem)]">
      <div className="rounded-xl bg-white border border-slate-200 shadow-2xl overflow-hidden">
        <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00236F]/5 border border-[#00236F]/10 flex items-center justify-center">
              {state.status === 'downloaded' ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : state.status === 'downloading' ? (
                <Loader2 className="w-5 h-5 text-[#00236F] animate-spin" />
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

        {state.status === 'available' && state.releaseNotes && (
          <div className="px-4 pt-2 pb-1">
            <p className="text-xs text-slate-500 whitespace-pre-line max-h-24 overflow-y-auto">{state.releaseNotes}</p>
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
              <button
                onClick={() => window.electronAPI?.downloadUpdate()}
                className="px-3 py-1.5 text-sm font-semibold text-white bg-[#00236F] hover:bg-[#001a56] rounded-lg transition-colors"
              >
                Cập nhật ngay
              </button>
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