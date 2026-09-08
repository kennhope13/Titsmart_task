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
    setSidebarHoverToExpand,
    setSidebarShowToggleButton,
    setShowNotificationBell,
  } = useUIStore();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài đặt giao diện"
      icon="settings"
      size="md"
    >
      <div className="p-5 space-y-5 overflow-y-auto">
        {/* Section 1: Navigation Bar Mode */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Chế độ thanh điều hướng (Sidebar)
          </label>
          <div className="grid grid-cols-1 gap-2">
            <div
              onClick={() => {
                setSidebarShowToggleButton(true);
                setSidebarHoverToExpand(false);
              }}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                sidebarShowToggleButton
                  ? 'border-primary bg-blue-50/50 text-primary font-bold shadow-2xs'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-base">push_pin</span>
                <div className="text-xs">
                  <div className="font-bold">Sử dụng nút ghim</div>
                  <div className="text-[11px] text-slate-500 font-normal">Bấm vào biểu tượng logo để cố định mở/thu nhỏ</div>
                </div>
              </div>
              <input
                type="radio"
                checked={sidebarShowToggleButton}
                readOnly
                className="w-4 h-4 text-primary focus:ring-primary border-slate-300 pointer-events-none"
              />
            </div>

            <div
              onClick={() => {
                setSidebarHoverToExpand(true);
                setSidebarShowToggleButton(false);
              }}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                sidebarHoverToExpand
                  ? 'border-primary bg-blue-50/50 text-primary font-bold shadow-2xs'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-base">mouse</span>
                <div className="text-xs">
                  <div className="font-bold">Mở rộng khi trỏ chuột</div>
                  <div className="text-[11px] text-slate-500 font-normal">Tự động mở rộng danh mục khi di chuột vào sidebar</div>
                </div>
              </div>
              <input
                type="radio"
                checked={sidebarHoverToExpand}
                readOnly
                className="w-4 h-4 text-primary focus:ring-primary border-slate-300 pointer-events-none"
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-slate-100"></div>

        {/* Section 2: Notification Bell Display */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Biểu tượng thông báo (Notification Bell)
          </label>
          <div className="grid grid-cols-1 gap-2">
            <div
              onClick={() => setShowNotificationBell(true)}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                showNotificationBell
                  ? 'border-primary bg-blue-50/50 text-primary font-bold shadow-2xs'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-base">notifications</span>
                <div className="text-xs">
                  <div className="font-bold">Hiển thị nút chuông</div>
                  <div className="text-[11px] text-slate-500 font-normal">Hiện nút chuông ở góc trên bên phải màn hình</div>
                </div>
              </div>
              <input
                type="radio"
                checked={showNotificationBell}
                readOnly
                className="w-4 h-4 text-primary focus:ring-primary border-slate-300 pointer-events-none"
              />
            </div>

            <div
              onClick={() => setShowNotificationBell(false)}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                !showNotificationBell
                  ? 'border-primary bg-blue-50/50 text-primary font-bold shadow-2xs'
                  : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-base">notifications_off</span>
                <div className="text-xs">
                  <div className="font-bold">Ẩn nút chuông</div>
                  <div className="text-[11px] text-slate-500 font-normal">Ẩn chuông thông báo khỏi thanh tiêu đề trên</div>
                </div>
              </div>
              <input
                type="radio"
                checked={!showNotificationBell}
                readOnly
                className="w-4 h-4 text-primary focus:ring-primary border-slate-300 pointer-events-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-md bg-primary text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-2xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};
