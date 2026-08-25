import React, { useMemo } from 'react';
import { useParams, Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams();
  const { projects } = useRealtimeStore();
  const location = useLocation();

  const project = useMemo(() => {
    // Find project by ID or Code
    return projects.find(p => p.id === projectId || p.code === projectId);
  }, [projects, projectId]);

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-50">
        <span className="material-symbols-outlined text-5xl text-rose-500 mb-3 animate-pulse">error</span>
        <h2 className="text-lg font-bold text-slate-800">Không tìm thấy dự án</h2>
        <p className="text-slate-500 text-sm mb-5 text-center max-w-sm">Dự án này không tồn tại, đã bị xóa hoặc bạn không có quyền truy cập.</p>
        <Link to="/projects" className="bg-primary hover:opacity-90 active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all">
          Quay lại Danh sách Dự án
        </Link>
      </div>
    );
  }

  // Tabs for the project detail view
  const tabs = [
    {
      label: 'Tiến độ Công việc',
      path: `/projects/${project.id}/tasks`,
      icon: 'playlist_add_check'
    },
    {
      label: 'Nhật ký Hiện trường',
      path: `/projects/${project.id}/field-logs`,
      icon: 'photo_camera'
    },
    {
      label: 'Vật tư & Chi phí',
      path: `/projects/${project.id}/cost-plan`,
      icon: 'request_quote'
    },
    {
      label: 'Kho Dự án',
      path: `/projects/${project.id}/inventory`,
      icon: 'warehouse'
    },
    {
      label: 'Theo dõi Hồ sơ',
      path: `/projects/${project.id}/documents`,
      icon: 'drafts'
    }
  ];

  // Redirect to first tab if we are exactly on /projects/:projectId
  const isExactBaseRoute = location.pathname.replace(/\/$/, '') === `/projects/${projectId}`;
  if (isExactBaseRoute) {
    return <Navigate to={`/projects/${project.id}/tasks`} replace />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      {/* Top Project Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 flex-shrink-0 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold mb-1">
            <Link to="/projects" className="hover:text-primary transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">arrow_back</span>
              Dự án
            </Link>
            <span>/</span>
            <span className="text-slate-600 truncate max-w-[200px]">{project.name}</span>
          </div>
          <h1 className="text-lg font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">domain</span>
            {project.name}
          </h1>
        </div>

        {/* Quick status badge */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
            project.status === 'active' 
              ? 'bg-blue-50 text-blue-700 border-blue-200' 
              : project.status === 'completed'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-ping"></span>
            {project.status === 'active' ? 'Đang triển khai' : project.status === 'completed' ? 'Đã hoàn thành' : 'Tạm dừng'}
          </span>
        </div>
      </div>

      {/* Tabs list inside detail layout */}
      <div className="flex border-b border-slate-200 bg-white px-6 gap-6 flex-shrink-0 overflow-x-auto scrollbar-hide shadow-sm z-10">
        {tabs.map(tab => {
          const isActive = location.pathname.startsWith(`/projects/${project.id}/${tab.path.split('/').pop()}`);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex items-center gap-2 py-3 border-b-2 font-bold text-xs transition-all whitespace-nowrap ${
                isActive 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Content wrapper */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
        <Outlet />
      </div>
    </div>
  );
};

export default ProjectDetailPage;
