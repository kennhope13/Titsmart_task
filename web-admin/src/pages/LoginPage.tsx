import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, DEMO_ACCOUNTS } from '../services/authStore';
import { User, Key, Eye, EyeOff, Lock, ArrowRight, Shield, Zap, Boxes, BarChart3 } from 'lucide-react';

export const LoginPage: React.FC<{ onSwitchStyle?: () => void }> = ({ onSwitchStyle }) => {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }
    setLoading(true);
    setTimeout(async () => {
      const result = await login(username, password);
      setLoading(false);
      if (result.ok) {
        navigate('/', { replace: true });
      } else {
        setError(result.error || 'Đăng nhập thất bại.');
      }
    }, 600);
  };

  const fillAccount = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setUsername(account.username);
    setPassword(account.password);
    setError('');
  };

  return (
    <div className="relative min-h-screen w-full flex bg-slate-50 overflow-hidden font-title-md">
      {/* Background Soft Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute top-[60%] -left-[10%] w-[40%] h-[60%] rounded-full bg-blue-400/10 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
      </div>

      <div className="relative z-10 flex w-full min-h-screen overflow-y-auto py-10">
        {/* Login Form Container */}
        <div className={`flex-1 flex flex-col items-center justify-center px-4 transition-all duration-1000 delay-150 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
            {/* Premium Card - HORIZONTAL LAYOUT */}
            <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-[0_20px_60px_-15px_rgba(0,35,111,0.1)] border border-slate-100 relative mt-4 overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-400 to-primary"></div>
              
              <div className="flex flex-col md:flex-row p-8 sm:p-10 gap-10 md:gap-14">
                
                {/* Left Column: Branding & Demo Accounts */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {/* Centered Logo & Header */}
                    <div className="flex flex-col items-start mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm overflow-hidden mb-4">
                        <img src="./logo.png" alt="TITSMART" className="w-8 h-8 object-contain" />
                      </div>
                      <h1 className="text-3xl font-extrabold text-primary tracking-tight mb-1">TITSMART</h1>
                      <p className="text-slate-400 font-bold text-[10px] tracking-[0.2em] uppercase">Project Manager</p>
                    </div>
                    
                    <h2 className="text-xl font-extrabold text-slate-900 mb-2">Đăng nhập hệ thống</h2>
                    <p className="text-slate-500 text-sm font-medium">Chào mừng bạn! Vui lòng nhập thông tin để tiếp tục.</p>
                  </div>

                  <div className="mt-8 pt-8 border-t border-slate-100 hidden md:block">
                    <div className="mb-4">
                      <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Tài khoản trải nghiệm</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {DEMO_ACCOUNTS.map((acc, idx) => (
                        <button
                          key={acc.username}
                          type="button"
                          onClick={() => fillAccount(acc)}
                          className="group flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-primary/5 hover:border-primary/20 transition-all duration-300 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full group-hover:border-primary/20 group-hover:bg-primary/5 transition-colors">
                              {acc.title}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              <strong className="text-slate-400 font-sans text-[9px] uppercase">ID:</strong> {acc.username}
                            </span>
                          </div>
                          <div className="text-slate-300 group-hover:text-primary transition-colors shrink-0 ml-2">
                            <ArrowRight size={14} strokeWidth={2.5} />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Login Form */}
                <div className="flex-1 flex flex-col justify-center">
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Tên đăng nhập</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                          <User size={20} strokeWidth={2} />
                        </div>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Nhập tên đăng nhập"
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all duration-300"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Mật khẩu</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                          <Key size={20} strokeWidth={2} />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Nhập mật khẩu"
                          className="w-full bg-slate-50/50 border border-slate-200 rounded-xl py-3.5 pl-11 pr-12 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white transition-all duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-primary transition-colors"
                        >
                          {showPassword ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="animate-in fade-in slide-in-from-top-2 p-3.5 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
                        <div className="text-red-500 mt-0.5">
                          <Lock size={18} strokeWidth={2.5} />
                        </div>
                        <p className="text-sm text-red-600 font-semibold">{error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full relative group overflow-hidden rounded-xl bg-primary text-white font-bold py-4 mt-2 transition-all duration-300 hover:bg-[#001a54] hover:shadow-[0_8px_25px_-8px_rgba(0,35,111,0.6)] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2 text-[15px]">
                        {loading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang đăng nhập...
                          </>
                        ) : (
                          <>
                            Đăng nhập vào hệ thống
                            <ArrowRight size={18} strokeWidth={2.5} className="group-hover:translate-x-1.5 transition-transform duration-300" />
                          </>
                        )}
                      </span>
                      <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                    </button>
                  </form>
                  
                  {/* Mobile demo accounts (visible only on small screens) */}
                  <div className="mt-8 pt-6 border-t border-slate-100 md:hidden">
                    <div className="mb-4">
                      <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Tài khoản trải nghiệm</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {DEMO_ACCOUNTS.map((acc, idx) => (
                        <button
                          key={acc.username}
                          type="button"
                          onClick={() => fillAccount(acc)}
                          className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-left"
                        >
                          <span className="text-[11px] font-bold text-slate-700">{acc.title}</span>
                          <span className="text-[11px] text-slate-500 font-mono">ID: {acc.username}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                {onSwitchStyle && (
                  <button
                    onClick={onSwitchStyle}
                    className="mt-6 w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">style</span>
                    Xem giao diện Classic
                  </button>
                )}
              </div>
            </div>
            
            <p className="text-center text-slate-400 font-medium text-xs mt-8">
              &copy; {new Date().getFullYear()} TITSMART Project Manager.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
