import React from 'react';
import { CustomSelect } from '@/components/common/CustomSelect';

interface CostPlanHeaderProps {
  selectedProject: string;
  setSelectedProject: (val: string) => void;
  projectOptions: string[];
  projects: any[];
  onImportClick?: () => void;
}

export const CostPlanHeader: React.FC<CostPlanHeaderProps> = ({
  selectedProject, setSelectedProject, projectOptions, projects, onImportClick
}) => {
  const selectedProjectName = projects.find((project) => project.code === selectedProject)?.name || selectedProject || 'Chưa chọn dự án';

  return (
    <section className="border-b border-slate-200 bg-white px-6 py-4 md:py-0 md:h-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between h-full">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="border-l-4 border-primary pl-4 min-w-0">
              <h1 className="page-title text-lg font-extrabold uppercase text-slate-900">KẾ HOẠCH & CHI PHÍ DỰ ÁN</h1>
              <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                {selectedProjectName}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="material-symbols-outlined text-[18px] text-slate-400">business_center</span>
            <CustomSelect
              value={selectedProject}
              onChange={(event) => setSelectedProject(event.target.value)}
              className="w-full min-w-[220px] bg-transparent text-sm font-bold text-slate-800 outline-none sm:w-72"
            >
              {projectOptions.length === 0 ? (
                <option value="">-- Chưa có dự án --</option>
              ) : (
                projectOptions.map((code) => {
                  const project = projects.find((item) => item.code === code);
                  return <option key={code} value={code}>{project?.name || code}</option>;
                })
              )}
            </CustomSelect>
          </div>
        </div>
      </div>
    </section>
  );
};
