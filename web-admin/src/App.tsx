import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useRealtimeStore, setupRealtimeSync } from './services/realtimeStore';
import { useAuthStore } from './services/authStore';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { LoginPageVariant } from './pages/LoginPageVariant';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectManagementPage } from './pages/ProjectManagementPage';
import { TaskManagementPage } from './pages/TaskManagementPage';
import { MaterialTrackingPage } from './pages/MaterialTrackingPage';
import { IssueResolutionPage } from './pages/IssueResolutionPage';
import { ReportExportPage } from './pages/ReportExportPage';
import { PersonnelPage } from './pages/PersonnelPage';
import { AccountPage } from './pages/AccountPage';
import { DocumentTrackingPage } from './pages/DocumentTrackingPage';
import { ActivityLogPage } from './pages/ActivityLogPage';
import { FieldLogsPage } from './pages/FieldLogsPage';
import { ProjectCostPlanPage } from './pages/ProjectCostPlanPage';

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
  const user = useAuthStore((state) => state.user);
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
    // Bật đồng bộ Realtime giữa các thiết bị
    setupRealtimeSync();
  }, [user]);

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : renderLogin()} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/projects" element={<ProjectManagementPage />} />
        <Route path="/tasks" element={<TaskManagementPage />} />
        <Route path="/document-tracking" element={<DocumentTrackingPage />} />
        <Route path="/field-logs" element={<FieldLogsPage />} />
        <Route path="/materials" element={<MaterialTrackingPage />} />
        <Route path="/cost-plan" element={<ProjectCostPlanPage />} />
        <Route path="/issues" element={<IssueResolutionPage />} />
        <Route path="/reports" element={<ReportExportPage />} />
        <Route path="/personnel" element={<PersonnelPage />} />
        <Route path="/activity-log" element={<ActivityLogPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
