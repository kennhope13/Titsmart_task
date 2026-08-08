import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, DEMO_ACCOUNTS } from '../services/authStore';

const features = [
  { icon: 'account_tree', title: 'Quản lý dự án', desc: 'Theo dõi tiến độ, kế hoạch và chi phí theo từng dự án.' },
  { icon: 'warehouse', title: 'Kho & Vật tư', desc: 'Quản lý tồn kho, nhập xuất vật tư theo dự án.' },
  { icon: 'request_quote', title: 'Chi phí & Lương', desc: 'Kiểm soát chi phí thực tế, lương nhân công và dự toán.' },
  { icon: 'analytics', title: 'Báo cáo tổng hợp', desc: 'Báo cáo tiến độ, chi phí và nhân sự một cách trực quan.' },
];

export const LoginPage: React.FC<{ onSwitchStyle?: () => void }> = ({ onSwitchStyle }) => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const result = login(username, password);
      setLoading(false);
      if (result.ok) {
        navigate('/', { replace: true });
      } else {
        setError(result.error || 'Đăng nhập thất bại.');
      }
    }, 450);
  };

  const fillAccount = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setUsername(account.username);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-slate-50 overflow-hidden">
      <div className="hidden md:flex flex-1 flex-col justify-between bg-primary relative overflow-hidden p-10 lg:p-14 text-white">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-blue-500/10"></div>
        <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-blue-400/10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full border border-white/10"></div>

        <div className="relative flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-white shadow-sm overflow-hidden">
            <img src="/logo.png" alt="TITSMART" className="w-full h-full object-contain p-0.5" />
          </div>
          <div>
            <h1 className="font-extrabold text-xl leading-tight">TITSMART</h1>
            <p className="text-[11px] text-blue-100 font-medium">Project Manager</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl lg:text-4xl font-extrabold leading-tight">HỆ THỐNG QUẢN LÝ<br />CÔNG VIỆC & DỰ ÁN</h2>
          <p className="mt-4 text-blue-100 text-sm leading-relaxed">
            Giải pháp quản lý toàn diện cho doanh nghiệp: theo dõi tiến độ, kiểm soát chi phí, quản lý kho vật tư và nhân sự trong một nền tảng duy nhất.
          </p>

          <div className="mt-8 space-y-4">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">{f.icon}</span>
                </div>
                <div>
                  <div className="font-bold text-sm">{f.title}</div>
                  <div className="text-xs text-blue-100/90">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-[11px] text-blue-100/70">© {new Date().getFullYear()} TITSMART Project Manager. All rights reserved.</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 md:p-10 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="md:hidden flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-white shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden">
              <img src="/logo.png" alt="TITSMART" className="w-full h-full object-contain p-0.5" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg text-primary leading-tight">TITSMART</h1>
              <p className="text-[10px] text-slate-500 font-medium">Project Manager</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 lg:p-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">lock</span>
              </div>
              <div>
                <h2 className="page-title text-xl font-extrabold text-slate-900">ĐĂNG NHẬP</h2>
                <p className="text-xs text-slate-500 mt-0.5">Đăng nhập để tiếp tục với hệ thống</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Tên đăng nhập</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">person</span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Nhập tên đăng nhập"
                    autoComplete="username"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">Mật khẩu</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">key</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-bold">
                  <span className="material-symbols-outlined text-base flex-shrink-0">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                    Đang đăng nhập...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">login</span>
                    Đăng nhập
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2.5">Tài khoản demo</div>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => fillAccount(acc)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors text-left group"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-extrabold text-slate-800 truncate">{acc.name} <span className="text-slate-400 font-semibold">• {acc.title}</span></div>
                      <div className="text-[11px] font-mono text-slate-500 truncate">{acc.username} / {acc.password}</div>
                    </div>
                    <span className="material-symbols-outlined text-base text-slate-400 group-hover:text-primary flex-shrink-0">login</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400 mt-5">© {new Date().getFullYear()} TITSMART Project Manager</p>

          {onSwitchStyle && (
            <button
              type="button"
              onClick={onSwitchStyle}
              className="mx-auto mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] font-bold text-slate-500 hover:bg-blue-50 hover:text-primary hover:border-blue-200 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">style</span>
              Xem giao diện đăng nhập khác
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
