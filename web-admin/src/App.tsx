import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useRealtimeStore } from './services/realtimeStore';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { TaskManagementPage } from './pages/TaskManagementPage';
import { MaterialTrackingPage } from './pages/MaterialTrackingPage';
import { IssueResolutionPage } from './pages/IssueResolutionPage';
import { ReportExportPage } from './pages/ReportExportPage';
import { PersonnelPage } from './pages/PersonnelPage';
import { AccountPage } from './pages/AccountPage';
import { ProjectCostPlanPage } from './pages/ProjectCostPlanPage';
import { DocumentTrackingPage } from './pages/DocumentTrackingPage';
import { ActivityLogPage } from './pages/ActivityLogPage';

export const App: React.FC = () => {
  const { fetchProjects, fetchTasks, fetchMaterials, fetchIssues, fetchEngineers, fetchActivityLogs, fetchAccounting } = useRealtimeStore();

  useEffect(() => {
    fetchProjects();
    fetchTasks();
    fetchMaterials();
    fetchIssues();
    fetchEngineers();
    fetchActivityLogs();
    fetchAccounting();
  }, []);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tasks" element={<TaskManagementPage />} />
        <Route path="/cost-plan" element={<ProjectCostPlanPage />} />
        <Route path="/document-tracking" element={<DocumentTrackingPage />} />
        <Route path="/materials" element={<MaterialTrackingPage />} />
        <Route path="/issues" element={<IssueResolutionPage />} />
        <Route path="/reports" element={<ReportExportPage />} />
        <Route path="/personnel" element={<PersonnelPage />} />
        <Route path="/activity-log" element={<ActivityLogPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;