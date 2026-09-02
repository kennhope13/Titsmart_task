import React, { useMemo, useState, useEffect } from 'react';
import { useParams, Link, useLocation, Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams();
  const { projects } = useRealtimeStore();
  const location = useLocation();
  const role = useAuthStore(state => state.user?.role);
  const [subTitle, setSubTitle] = useState('');
  const navigate = useNavigate();

  const handleTabClick = (e: React.MouseEvent, path: string) => {
    e.preventDefault();
    navigate(path, { replace: true, state: { reset: Date.now() } });
  };

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
        <Link to="/projects" className="page-title text-lg font-extrabold text-slate-900 hover:text-primary transition-colors border-l-4 border-primary pl-2 uppercase shrink-0 cursor-pointer inline-flex items-center">
          Quay lại Danh sách Dự án
        </Link>
      </div>
    );
  }

  // Tabs for the project detail view
  const baseTabs = [
      { label: 'Tiến độ Công việc', path: `/projects/${project.id}/tasks`, icon: 'fact_check' },
      { label: 'Vật tư & Chi phí', path: `/projects/${project.id}/cost-plan`, icon: 'account_balance_wallet' },
      { label: 'Hồ sơ', path: `/projects/${project.id}/documents`, icon: 'file_present', requireAdmin: true },
      { label: 'Kho Dự án', path: `/projects/${project.id}/inventory`, icon: 'inventory_2' },
      { label: 'Nhật ký Hiện trường', path: `/projects/${project.id}/field-logs`, icon: 'add_a_photo' }
    ];

    const tabs = baseTabs.filter(tab => {
      if (tab.requireAdmin && (role === 'staff' || role === 'engineer')) return false;
      return true;
    });

  // Redirect to first tab if we are exactly on /projects/:projectId
  const activeTab = tabs.find(t => location.pathname.includes(t.path));

  const isExactBaseRoute = location.pathname.replace(/\/$/, '') === `/projects/${projectId}`;
  if (isExactBaseRoute) {
    return <Navigate to={`/projects/${project.id}/tasks`} replace />;
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-100">
      {/* Top Project Bar */}
      <div className={`bg-white border-b border-slate-200 pl-3 py-3 md:py-0 md:h-12 flex flex-col sm:flex-row sm:items-center justify-between gap-2 flex-shrink-0 shadow-sm pr-[4.5rem]`}>
        <div className="flex items-center h-full gap-2 overflow-hidden">
          <Link to="/projects" className="page-title text-lg font-extrabold text-slate-900 hover:text-primary transition-colors border-l-4 border-primary pl-2 uppercase shrink-0 cursor-pointer">
            {project.name}
          </Link>
          {activeTab && (
            <>
              <span className="material-symbols-outlined text-slate-400 text-[14px] shrink-0">arrow_forward_ios</span>
              <a href={activeTab.path} onClick={(e) => handleTabClick(e, activeTab.path)} className="text-[15px] font-bold text-slate-700 hover:text-primary transition-colors shrink-0 cursor-pointer">
                {activeTab.label}
              </a>
            </>
          )}
          {subTitle && (
            <>
              <span className="material-symbols-outlined text-slate-400 text-[12px] shrink-0">arrow_forward_ios</span>
              <span className="text-[14px] font-medium text-slate-600 truncate">{subTitle}</span>
            </>
          )}
        </div>

        <div id="project-header-actions" className="flex items-center gap-2 shrink-0 ml-auto flex-wrap justify-end"></div>
      </div>



      {/* Content wrapper */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
        <Outlet context={{ setSubTitle }} key={location.state?.reset || location.pathname} />
      </div>
    </div>
  );
};

export default ProjectDetailPage;
