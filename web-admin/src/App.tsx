import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useRealtimeStore } from './services/realtimeStore';
import { Layout } from './components/layout/Layout';
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

export const App: React.FC = () => {
  const { fetchProjects, fetchTasks, fetchMaterials, fetchIssues, fetchEngineers, fetchActivityLogs, fetchAccounting, fetchFieldLogs } = useRealtimeStore();

  useEffect(() => {
    fetchProjects();
    fetchTasks();
    fetchMaterials();
    fetchIssues();
    fetchEngineers();
    fetchActivityLogs();
    fetchAccounting();
    fetchFieldLogs();
  }, []);

  return (
    <Layout>
      <Routes>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;