import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('UI Crash ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
          <div className="max-w-2xl bg-white p-8 rounded-2xl shadow-xl border border-slate-200 text-left">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-4xl text-rose-500">error</span>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Đã xảy ra lỗi hiển thị (UI Crash)</h2>
                <p className="text-xs text-slate-500">Chi tiết lỗi phát sinh bên dưới:</p>
              </div>
            </div>
            <pre className="p-4 bg-slate-900 text-rose-300 text-xs font-mono rounded-xl overflow-x-auto max-h-60 mb-6 select-all">
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="px-6 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 active:scale-95 transition-all shadow-md"
              >
                Tải lại ứng dụng
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <App />
        </HashRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
