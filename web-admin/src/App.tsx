import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useRealtimeStore, setupRealtimeSync } from './services/realtimeStore';
import { useAuthStore } from './services/authStore';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { LoginPageVariant } from './pages/LoginPageVariant';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectManagementPage } from './pages/ProjectManagementPage';
import { ProjectDiagramTab } from './pages/ProjectDiagramTab';
import { TaskManagementPage } from './pages/TaskManagementPage';
import { MaterialTrackingPage } from './pages/MaterialTrackingPage';
import { IssueResolutionPage } from './pages/IssueResolutionPage';
import { PersonnelPage } from './pages/PersonnelPage';
import { AccountPage } from './pages/AccountPage';
import { DocumentTrackingPage } from './pages/DocumentTrackingPage';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { FieldLogsPage } from './pages/FieldLogsPage';
import { ProjectCostPlanPage } from './pages/ProjectCostPlanPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectOverviewTab } from './pages/ProjectOverviewTab';
import { TaskAssignmentPage } from './pages/TaskAssignmentPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { AttendancePage } from './pages/AttendancePage';

import { App as CapApp } from '@capacitor/app';

import { UpdateNotifier } from './components/common/UpdateNotifier';
import { GlobalNotificationToast } from './components/common/GlobalNotificationToast';
import { NotificationBell } from './components/common/NotificationBell';
import { ChatWidget } from './components/common/ChatWidget';
import { LogoutBlockingModal } from './components/common/LogoutBlockingModal';
import { requestSystemNotificationPermission } from './services/systemNotificationService';


const ProtectedLayout: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUser } = useAuthStore();
  const [loginStyle, setLoginStyle] = useState<'default' | 'variant'>(() => (localStorage.getItem('titsmart_login_style') as 'default' | 'variant') || 'default');
  const fetchProjects = useRealtimeStore(s => s.fetchProjects);
  const fetchTasks = useRealtimeStore(s => s.fetchTasks);
  const fetchMaterials = useRealtimeStore(s => s.fetchMaterials);
  const fetchIssues = useRealtimeStore(s => s.fetchIssues);
  const fetchEngineers = useRealtimeStore(s => s.fetchEngineers);
  const fetchActivityLogs = useRealtimeStore(s => s.fetchActivityLogs);
  const fetchAccounting = useRealtimeStore(s => s.fetchAccounting);
  const fetchFieldLogs = useRealtimeStore(s => s.fetchFieldLogs);

  const switchLoginStyle = (style: 'default' | 'variant') => {
    localStorage.setItem('titsmart_login_style', style);
    setLoginStyle(style);
  };

  const renderLogin = () =>
    loginStyle === 'variant' ? (
      <LoginPageVariant onSwitchStyle={() => switchLoginStyle('default')} />
    ) : (
      <LoginPage onSwitchStyle={() => switchLoginStyle('variant')} />
    );

  const [exitToast, setExitToast] = useState(false);
  const lastBackTimeRef = useRef<number>(0);
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const locationRef = useRef(location);
  locationRef.current = location;

  const handleGlobalBack = (): boolean => {
    // 1. Ưu tiên đóng Modal/Dialog/Popup đang mở nếu có
    const modalCloseButtons = Array.from(
      document.querySelectorAll(
        '.fixed.inset-0 button[title="Đóng"], .fixed.inset-0 button[aria-label="Đóng"], .fixed.inset-0 button[aria-label="Close"], .fixed.inset-0 button.close-btn'
      )
    ) as HTMLButtonElement[];

    if (modalCloseButtons.length > 0) {
      const topModalBtn = modalCloseButtons[modalCloseButtons.length - 1];
      if (topModalBtn) {
        topModalBtn.click();
        return true; // đã xử lý đóng modal
      }
    }

    const genericModalCloseBtn = document.querySelector(
      '.fixed.inset-0 button:has(.material-symbols-outlined)'
    ) as HTMLButtonElement;
    if (genericModalCloseBtn) {
      genericModalCloseBtn.click();
      return true;
    }

    // 2. Lấy đường dẫn hiện tại
    const currentPath = locationRef.current.pathname;

    // Nếu đang ở trong một dự án cụ thể (/projects/:projectId/...) → Quay lại danh sách tất cả dự án
    if (currentPath.startsWith('/projects/') && currentPath !== '/projects') {
      navigateRef.current('/projects');
      return true; // đã xử lý quay lại
    }

    const isRootScreen =
      currentPath === '' ||
      currentPath === '/' ||
      currentPath === '/projects' ||
      currentPath === '/dashboard' ||
      currentPath === '/login';

    if (!isRootScreen) {
      // Đang ở trang phụ khác (/attendance, /account, /materials, /cost-plan...) → Quay lại /projects
      navigateRef.current('/projects');
      return true; // đã xử lý quay lại
    }

    // 3. Đang ở màn hình chính (Root) → Yêu cầu nhấn 2 lần trong 2 giây mới thoát ứng dụng
    const now = Date.now();
    if (now - lastBackTimeRef.current < 2000) {
      try {
        CapApp.exitApp();
      } catch (_) {}
      return false; // cho phép thoát
    } else {
      lastBackTimeRef.current = now;
      setExitToast(true);
      setTimeout(() => setExitToast(false), 2000);
      return true; // chặn thoát ở lần nhấn đầu tiên
    }
  };

  useEffect(() => {
    refreshUser();

    // Thiết lập guard history để bắt sự kiện nút Back trên trình duyệt di động / PWA
    try {
      window.history.pushState({ titsmartApp: true }, '', window.location.href);
    } catch (_) {}

    const onPopState = () => {
      const consumed = handleGlobalBack();
      if (consumed) {
        try {
          window.history.pushState({ titsmartApp: true }, '', window.location.href);
        } catch (_) {}
      }
    };

    window.addEventListener('popstate', onPopState);

    // Xử lý nút back phần cứng trên Android qua plugin @capacitor/app chính thức
    let capListener: any = null;
    try {
      CapApp.addListener('backButton', () => {
        handleGlobalBack();
      })
        .then((handle) => {
          capListener = handle;
        })
        .catch((err) => {
          console.warn('Capacitor backButton listener failed:', err);
        });
    } catch (e) {
      console.warn('CapApp not available:', e);
    }

    return () => {
      window.removeEventListener('popstate', onPopState);
      if (capListener && typeof capListener.remove === 'function') {
        capListener.remove();
      }
    };
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
    requestSystemNotificationPermission();
    fetchProjects();
    fetchTasks();
    fetchMaterials();
    fetchIssues();
    fetchEngineers();
    fetchActivityLogs();
    fetchAccounting();
    fetchFieldLogs();
    
    // Bật đồng bộ Realtime tối ưu giữa các thiết bị
    const cleanup = setupRealtimeSync();

    return () => {
      if (cleanup) cleanup();
    };
  }, [user?.id]);

  return (
    <>
      <UpdateNotifier />
      <GlobalNotificationToast />
      <LogoutBlockingModal />
      {/* Floating widgets rendered at root level to avoid z-index stacking context and overflow issues from Layout */}
      {user && <NotificationBell />}
      <ChatWidget />

      {exitToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900/90 text-white px-4 py-2 rounded-full text-xs font-medium shadow-lg animate-fadeIn pointer-events-none select-none">
          Nhấn lần nữa để thoát ứng dụng
        </div>
      )}

      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : renderLogin()} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Navigate to="/projects" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/task-assignment" element={<TaskAssignmentPage />} />
          <Route path="/my-tasks" element={<MyTasksPage />} />
          <Route path="/projects" element={<ProjectManagementPage />} />
          <Route path="/projects/:projectId" element={<ProjectDetailPage />}>
            <Route index element={<ProjectOverviewTab />} />
            <Route path="overview" element={<ProjectOverviewTab />} />
            <Route path="tasks" element={<TaskManagementPage />} />
            <Route path="field-logs" element={<FieldLogsPage />} />
            <Route path="cost-plan" element={<ProjectCostPlanPage />} />
            <Route path="inventory" element={<MaterialTrackingPage />} />
            <Route path="documents" element={<DocumentTrackingPage />} />
            <Route path="diagram" element={<ProjectDiagramTab />} />
          </Route>
          <Route path="/tasks" element={<TaskManagementPage />} />
          <Route path="/document-tracking" element={<DocumentTrackingPage />} />
          <Route path="/field-logs" element={<FieldLogsPage />} />
          <Route path="/materials" element={<MaterialTrackingPage />} />
          <Route path="/cost-plan" element={<ProjectCostPlanPage />} />
          <Route path="/issues" element={<IssueResolutionPage />} />
          <Route path="/personnel" element={<PersonnelPage />} />
          <Route path="/activity-log" element={<ActivityLogPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
