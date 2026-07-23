import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { TaskManagementPage } from './pages/TaskManagementPage';
import { MaterialTrackingPage } from './pages/MaterialTrackingPage';
import { IssueResolutionPage } from './pages/IssueResolutionPage';
import { ReportExportPage } from './pages/ReportExportPage';

export const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tasks" element={<TaskManagementPage />} />
        <Route path="/materials" element={<MaterialTrackingPage />} />
        <Route path="/issues" element={<IssueResolutionPage />} />
        <Route path="/reports" element={<ReportExportPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;
