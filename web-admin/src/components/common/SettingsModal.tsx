import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../../services/uiStore';
import { useAuthStore } from '../../services/authStore';
import { broadcastRealtimeSync } from '../../services/realtimeStore';
import { uploadAttachment } from '../../utils/fileUploadHelper';
import { Modal } from './Modal';
import { ChangePasswordModal } from './ChangePasswordModal';
import { Toast } from './Toast';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const isAdmin = user?.username === 'admin' || user?.role === 'admin' || user?.role === 'Quản trị viên';
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' | 'error' });

  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const {
    sidebarHoverToExpand,
    sidebarShowToggleButton,
    showNotificationBell,
    autoShowNotificationPopup,
    showChatWidget,
    companyName,
    companySlogan,
    companyLogo,
    setSidebarHoverToExpand,
    setSidebarShowToggleButton,
    setShowNotificationBell,
    setAutoShowNotificationPopup,
    setShowChatWidget,
    setCompanyName,
    setCompanySlogan,
    setCompanyLogo,
    setIsApplyingBranding,
    saveBrandingToCloud,
  } = useUIStore();

  const [inputCompanyName, setInputCompanyName] = useState(companyName || 'TITSMART');
  const [inputCompanySlogan, setInputCompanySlogan] = useState(companySlogan || 'Project Manager');
  const [inputCompanyLogo, setInputCompanyLogo] = useState<string | null>(companyLogo || null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Sync state when modal opens or store changes
  React.useEffect(() => {
    if (isOpen) {
      setInputCompanyName(companyName || 'TITSMART');
      setInputCompanySlogan(companySlogan || 'Project Manager');
      setInputCompanyLogo(companyLogo || null);
      setIsSaving(false);
    }
  }, [isOpen, companyName, companySlogan, companyLogo]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) {
      triggerToast('Chỉ Quản trị viên (Admin) mới có quyền thay đổi logo công ty!', 'warning');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      triggerToast('Ảnh logo không được vượt quá 5MB!', 'warning');
      return;
    }

    try {
      // Tải logo lên Supabase Storage bucket 'titsmart-images' để tạo public URL dùng cho toàn bộ người dùng
      const uploadRes = await uploadAttachment(file, 'company_branding');
      if (uploadRes && uploadRes.url) {
        setInputCompanyLogo(uploadRes.url);
        triggerToast('Tải ảnh logo lên đám mây thành công!', 'info');
      }
    } catch (err) {
      console.warn('Lỗi tải logo lên storage, dùng fallback local:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        if (base64) {
          setInputCompanyLogo(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBranding = async () => {
    if (!isAdmin) {
      triggerToast('Chỉ Quản trị viên (Admin) mới có quyền thay đổi thông tin thương hiệu!', 'warning');
      return;
    }
    if (isSaving) return;
    setIsSaving(true);
    setIsApplyingBranding(true);

    const finalName = inputCompanyName.trim() || 'TITSMART';
    const finalSlogan = inputCompanySlogan.trim() || 'Project Manager';
    const finalLogo = inputCompanyLogo;

    // Đóng Modal ngay lập tức để toàn bộ ứng dụng hiển thị loading blocking
    onClose();

    try {
      // 1. Lưu đồng bộ lên Supabase Cloud
      await saveBrandingToCloud({
        companyName: finalName,
        companySlogan: finalSlogan,
        companyLogo: finalLogo,
        updatedBy: user?.name || user?.username || 'Admin',
      });

      // 2. Phát tín hiệu realtime broadcast để tất cả người dùng khác đang mở app tự động cập nhật ngay lập tức
      broadcastRealtimeSync('branding');

      // Giữ loading blocking 0.5s cho trải nghiệm mượt mà
      await new Promise((res) => setTimeout(res, 500));

      triggerToast('Đã lưu và đồng bộ thương hiệu cho toàn bộ người dùng!', 'success');
    } catch (err: any) {
      console.error('Lỗi lưu branding lên cloud:', err);
      // Fallback lưu local store
      setCompanyName(finalName);
      setCompanySlogan(finalSlogan);
      setCompanyLogo(finalLogo);
      triggerToast('Đã lưu thương hiệu vào thiết bị!', 'info');
    } finally {
      setIsSaving(false);
      setIsApplyingBranding(false);
    }
  };

  const handleResetBranding = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setIsApplyingBranding(true);

    onClose();

    try {
      await saveBrandingToCloud({
        companyName: 'TITSMART',
        companySlogan: 'Project Manager',
        companyLogo: null,
        updatedBy: user?.name || user?.username || 'Admin',
      });

      broadcastRealtimeSync('branding');
      await new Promise((res) => setTimeout(res, 500));

      setInputCompanyName('TITSMART');
      setInputCompanySlogan('Project Manager');
      setInputCompanyLogo(null);

      triggerToast('Đã khôi phục thương hiệu mặc định TITSMART cho tất cả mọi người!', 'info');
    } catch (err) {
      console.error('Lỗi reset branding:', err);
      setInputCompanyName('TITSMART');
      setInputCompanySlogan('Project Manager');
      setInputCompanyLogo(null);
      setCompanyName('TITSMART');
      setCompanySlogan('Project Manager');
      setCompanyLogo(null);
    } finally {
      setIsSaving(false);
      setIsApplyingBranding(false);
    }
  };

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          if (!isSaving) onClose();
        }}
        title="Cài đặt hệ thống"
        icon="settings"
        size="md"
        requireConfirmOnClose={false}
      >
        <div className="p-4 space-y-3 relative">
          {/* Blocking Overlay khi đang lưu cài đặt */}
          {isSaving && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-xs rounded-2xl z-50 flex flex-col items-center justify-center gap-3 animate-in fade-in duration-200 select-none">
              <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
              <div className="text-center">
                <p className="text-xs font-extrabold text-slate-800">Đang lưu cài đặt...</p>
                <p className="text-[11px] text-slate-500 font-medium">Vui lòng chờ trong giây lát</p>
              </div>
            </div>
          )}

          {/* Section: Nhận diện thương hiệu (Tên công ty & Slogan) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-primary">branding_watermark</span>
                <span className="text-xs font-bold text-slate-800">Thương hiệu & Tên công ty</span>
                {!isAdmin && (
                  <span className="text-[10px] font-semibold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">
                    Chỉ xem (Admin)
                  </span>
                )}
              </div>
              {isAdmin && (inputCompanyName !== 'TITSMART' || inputCompanySlogan !== 'Project Manager') && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleResetBranding}
                  className="text-[11px] font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50"
                  title="Khôi phục mặc định TITSMART"
                >
                  Mặc định
                </button>
              )}
            </div>

            <div className="space-y-2 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tên công ty / Ứng dụng
                </label>
                <input
                  type="text"
                  disabled={isSaving || !isAdmin}
                  value={inputCompanyName}
                  onChange={(e) => setInputCompanyName(e.target.value)}
                  placeholder="Ví dụ: TITSMART..."
                  title={!isAdmin ? 'Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa' : ''}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Logo công ty
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative w-11 h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center p-1.5 shadow-2xs shrink-0 overflow-hidden">
                    <img
                      src={inputCompanyLogo || './logo.png'}
                      alt="Logo Preview"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {isAdmin ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        disabled={isSaving}
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-sm text-primary">upload</span>
                        <span>{inputCompanyLogo ? 'Thay đổi logo' : 'Tải lên logo'}</span>
                      </button>
                      {inputCompanyLogo && (
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => setInputCompanyLogo(null)}
                          className="px-2 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          title="Dùng lại logo mặc định"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          <span>Xóa logo</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">
                      Chỉ Admin mới có quyền đổi logo
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Slogan / Dòng phụ đề
                </label>
                <input
                  type="text"
                  disabled={isSaving || !isAdmin}
                  value={inputCompanySlogan}
                  onChange={(e) => setInputCompanySlogan(e.target.value)}
                  placeholder="Ví dụ: Project Manager..."
                  title={!isAdmin ? 'Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa' : ''}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                {/* Live Preview nhỏ */}
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white rounded-lg border border-slate-200/80 min-w-0 max-w-[210px] overflow-hidden shadow-2xs">
                  <img src={inputCompanyLogo || './logo.png'} alt="Logo" className="w-5 h-5 object-contain shrink-0 rounded" />
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <span 
                      className={`font-extrabold text-blue-900 block leading-tight truncate ${
                        inputCompanyName.length > 20
                          ? 'text-[9.5px]'
                          : inputCompanyName.length > 14
                          ? 'text-[10.5px]'
                          : inputCompanyName.length > 8
                          ? 'text-[11.5px]'
                          : 'text-[12.5px]'
                      }`}
                    >
                      {inputCompanyName.trim() || 'TITSMART'}
                    </span>
                    <span 
                      className={`text-slate-500 font-bold uppercase block truncate leading-tight mt-0.5 ${
                        inputCompanySlogan.length > 24
                          ? 'text-[6px] tracking-[0.02em]'
                          : inputCompanySlogan.length > 16
                          ? 'text-[6.5px] tracking-[0.05em]'
                          : 'text-[7.5px] tracking-[0.08em]'
                      }`}
                    >
                      {inputCompanySlogan.trim() || 'Project Manager'}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveBranding}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer bg-primary text-white hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <span className="material-symbols-outlined text-sm">save</span>
                    )}
                    <span>{isSaving ? 'Đang lưu...' : 'Áp dụng'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100 my-1"></div>

          {/* Row 1: Sidebar Mode (Desktop Only) */}
          <div className="hidden sm:flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
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

          {/* Row 4: Chat Widget Button Toggle */}
          <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-lg text-slate-600">forum</span>
              <span className="text-xs font-bold text-slate-800">Nút Chat nội bộ</span>
            </div>
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg border border-slate-200/60 shrink-0">
              <button
                type="button"
                onClick={() => setShowChatWidget(true)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  showChatWidget ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Bật
              </button>
              <button
                type="button"
                onClick={() => setShowChatWidget(false)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  !showChatWidget ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tắt
              </button>
            </div>
          </div>

          {/* Divider & Account Actions */}
          <div className="h-px bg-slate-100 my-1"></div>

          {/* Row 5: Change Password */}
          <button
            type="button"
            onClick={() => {
              setIsChangePasswordOpen(true);
            }}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-lg text-slate-600">lock_reset</span>
              <span className="text-xs font-bold text-slate-800">Đổi mật khẩu</span>
            </div>
            <span className="material-symbols-outlined text-slate-400 text-base">chevron_right</span>
          </button>

          {/* Row 6: Logout */}
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-red-50/70 border border-red-200/70 hover:bg-red-100/80 text-red-600 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-lg">logout</span>
                <span className="text-xs font-bold">Đăng xuất</span>
              </div>
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          )}

          {/* Version info */}
          <div className="text-center pt-1">
            <span className="text-[11px] font-mono text-slate-400 font-medium">
              Phiên bản v{import.meta.env.VITE_APP_VERSION || '1.0.0'}
            </span>
          </div>
        </div>
      </Modal>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        onSuccess={() => triggerToast('Đổi mật khẩu tài khoản thành công!', 'success')}
      />

      <Toast
        show={toastState.show}
        message={toastState.message}
        type={toastState.type}
        onClose={() => setToastState(prev => ({ ...prev, show: false }))}
      />
    </>
  );
};
