import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { TaskManagementPage } from './pages/TaskManagementPage';
import { MaterialTrackingPage } from './pages/MaterialTrackingPage';
import { IssueResolutionPage } from './pages/IssueResolutionPage';
import { ReportExportPage } from './pages/ReportExportPage';
import { PersonnelPage } from './pages/PersonnelPage';
import { AccountPage } from './pages/AccountPage';

export const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tasks" element={<TaskManagementPage />} />
        <Route path="/materials" element={<MaterialTrackingPage />} />
        <Route path="/issues" element={<IssueResolutionPage />} />
        <Route path="/reports" element={<ReportExportPage />} />
        <Route path="/personnel" element={<PersonnelPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;