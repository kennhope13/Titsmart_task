import React from 'react';
import { useUIStore } from '../../services/uiStore';
import { Modal } from './Modal';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    sidebarHoverToExpand,
    sidebarShowToggleButton,
    showNotificationBell,
    autoShowNotificationPopup,
    setSidebarHoverToExpand,
    setSidebarShowToggleButton,
    setShowNotificationBell,
    setAutoShowNotificationPopup,
  } = useUIStore();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài đặt giao diện"
      icon="settings"
      size="md"
    >
      <div className="p-4 space-y-3">
        {/* Row 1: Sidebar Mode */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-slate-600">side_navigation</span>
            <span className="text-xs font-bold text-slate-800">Thanh điều hướng</span>
          </div>
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSidebarShowToggleButton(true);
                setSidebarHoverToExpand(false);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                sidebarShowToggleButton ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ghim
            </button>
            <button
              type="button"
              onClick={() => {
                setSidebarHoverToExpand(true);
                setSidebarShowToggleButton(false);
              }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                sidebarHoverToExpand ? 'bg-white text-primary shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rê chuột
            </button>
          </div>
        </div>

        {/* Row 2: Notification Bell */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-slate-600">notifications</span>
            <span className="text-xs font-bold text-slate-800">Nút chuông thông báo</span>
          </div>
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => setShowNotificationBell(true)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                showNotificationBell ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bật
            </button>
            <button
              type="button"
              onClick={() => setShowNotificationBell(false)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                !showNotificationBell ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tắt
            </button>
          </div>
        </div>

        {/* Row 3: Auto Notification Popup on startup */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-lg text-slate-600">web_stories</span>
            <span className="text-xs font-bold text-slate-800">Thông báo khi mở app</span>
          </div>
          <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
            <button
              type="button"
              onClick={() => setAutoShowNotificationPopup(true)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                autoShowNotificationPopup ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Bật
            </button>
            <button
              type="button"
              onClick={() => setAutoShowNotificationPopup(false)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                !autoShowNotificationPopup ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tắt
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};
