import React, { useEffect, useState, useRef } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
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
import { OfficeCostsPage } from './pages/OfficeCostsPage';
import { FieldLogsPage } from './pages/FieldLogsPage';
import { ProjectCostPlanPage } from './pages/ProjectCostPlanPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectOverviewTab } from './pages/ProjectOverviewTab';
import { TaskAssignmentPage } from './pages/TaskAssignmentPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { AttendancePage } from './pages/AttendancePage';

import { UpdateNotifier } from './components/common/UpdateNotifier';
import { GlobalNotificationToast } from './components/common/GlobalNotificationToast';
import { ChatWidget } from './components/common/ChatWidget';
import { LogoutBlockingModal } from './components/common/LogoutBlockingModal';


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
  const { user, refreshUser } = useAuthStore();
  const [loginStyle, setLoginStyle] = useState<'default' | 'variant'>(() => (localStorage.getItem('titsmart_login_style') as 'default' | 'variant') || 'default');
  const { fetchProjects, fetchTasks, fetchMaterials, fetchIssues, fetchEngineers, fetchActivityLogs, fetchAccounting, fetchFieldLogs } = useRealtimeStore();

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

  useEffect(() => {
    refreshUser();

    // Xử lý nút back phần cứng trên Android (thanh điều hướng hệ thống)
    const capApp = (window as any).Capacitor?.Plugins?.App;
    let backListener: any = null;

    if (capApp && typeof capApp.addListener === 'function') {
      capApp.addListener('backButton', () => {
        // 1. Ưu tiên đóng Modal/Dialog đang mở nếu có
        const modalCloseBtn =
          (document.querySelector('.fixed.inset-0 button[title="Đóng"]') as HTMLButtonElement) ||
          (document.querySelector('.fixed.inset-0 button:has(.material-symbols-outlined)') as HTMLButtonElement);
        if (modalCloseBtn) {
          modalCloseBtn.click();
          return;
        }

        // 2. Lấy đường dẫn hiện tại từ Hash
        const hash = (window.location.hash || '').replace(/^#/, '');
        const cleanPath = hash.split('?')[0];

        const isRootScreen =
          cleanPath === '' ||
          cleanPath === '/' ||
          cleanPath === '/projects' ||
          cleanPath === '/dashboard' ||
          cleanPath === '/login';

        if (!isRootScreen) {
          // Không phải trang gốc → quay lại trang trước hoặc trang danh sách dự án
          if (window.history.length > 1) {
            window.history.back();
          } else {
            window.location.hash = '#/projects';
          }
          return;
        }

        // 3. Đang ở trang gốc → Yêu cầu nhấn 2 lần trong 2 giây mới thoát App
        const now = Date.now();
        if (now - lastBackTimeRef.current < 2000) {
          capApp.exitApp();
        } else {
          lastBackTimeRef.current = now;
          setExitToast(true);
          setTimeout(() => setExitToast(false), 2000);
        }
      })
        .then((handle: any) => {
          backListener = handle;
        })
        .catch((err: any) => {
          console.warn('Capacitor backButton listener failed:', err);
        });
    }

    return () => {
      if (backListener && typeof backListener.remove === 'function') {
        backListener.remove();
      }
    };
  }, [refreshUser]);

  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  return (
    <>
      <UpdateNotifier />
      <GlobalNotificationToast />
      <LogoutBlockingModal />
      {/* ChatWidget rendered at root level to avoid z-index stacking context issues from Layout */}
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
          <Route path="/office-costs" element={<OfficeCostsPage />} />
          <Route path="/account" element={<AccountPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
