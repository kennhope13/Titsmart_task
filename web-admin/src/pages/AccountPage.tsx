import React from 'react';
import { useRealtimeStore } from '../services/realtimeStore';

export const AccountPage: React.FC = () => {
  const engineer = useRealtimeStore((state) => state.engineers[0]);

  return (
    <div className="px-0 pt-0 pb-4 space-y-4">
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-xl">account_circle</span></div>
        <div><h2 className="text-2xl font-extrabold text-slate-900">Tài khoản</h2></div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-2xl bg-primary text-white flex items-center justify-center text-2xl font-extrabold">{(engineer?.name || 'QL').slice(0, 2).toUpperCase()}</div>
          <h3 className="mt-3 text-lg font-extrabold text-slate-900">{engineer?.name || 'Quản lý'}</h3>
          <span className="mt-2 px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-bold">Quản lý</span>
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <Info label="Họ tên" value={engineer?.name || 'Quản lý'} icon="person" />
            <Info label="Mã nhân viên" value="NV-001" icon="badge" />
            <Info label="Vai trò" value="Quản lý" icon="verified_user" />
            <Info label="Email" value={engineer?.email || 'admin@titsmart.vn'} icon="mail" />
            <Info label="Số điện thoại" value={engineer?.phone || 'Chưa cập nhật'} icon="call" />
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end">
            <button onClick={() => alert('Chức năng đổi mật khẩu sẽ kết nối API xác thực ở bản đầy đủ.')} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"><span className="material-symbols-outlined text-sm align-[-2px] mr-1">lock_reset</span>Đổi mật khẩu</button>
            <button onClick={() => alert('Bạn đã đăng xuất khỏi phiên hiện tại.')} className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-bold hover:opacity-90"><span className="material-symbols-outlined text-sm align-[-2px] mr-1">logout</span>Đăng xuất</button>
          </div>
        </div>
      </section>
    </div>
  );
};

const Info = ({ label, value, icon }: { label: string; value: string; icon: string }) => (
  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-start gap-3">
    <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
    <div className="min-w-0"><div className="text-[11px] uppercase font-bold text-slate-400">{label}</div><div className="mt-1 font-extrabold text-slate-800 truncate">{value}</div></div>
  </div>
);