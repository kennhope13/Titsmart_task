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
        <Link to="/projects" className="bg-primary hover:opacity-90 active:scale-95 text-white px-5 py-2.5 rounded-xl text-[13px] font-bold shadow-md transition-all">
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
      <div className={`bg-white border-b border-slate-200 pl-3 py-3 md:py-0 md:h-12 flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0 shadow-sm electron-drag ${window.electronAPI ? 'pr-[180px]' : 'pr-5'}`}>
        <div className="flex items-center h-full electron-no-drag">
          <h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">
            {project.name}
          </h1>
        </div>


      </div>



      {/* Content wrapper */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
        <Outlet />
      </div>
    </div>
  );
};

export default ProjectDetailPage;
