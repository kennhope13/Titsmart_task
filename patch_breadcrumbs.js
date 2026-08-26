const fs = require('fs');

function patchProjectDetailPage() {
  const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
  let data = fs.readFileSync(filePath, 'utf8');

  // Add useState to import
  data = data.replace(
    "import React, { useMemo } from 'react';",
    "import React, { useMemo, useState, useEffect } from 'react';"
  );

  // Add subTitle state
  const stateTarget = `  const role = useAuthStore(state => state.user?.role);`;
  const stateReplacement = `  const role = useAuthStore(state => state.user?.role);
  const [subTitle, setSubTitle] = useState('');`;
  data = data.replace(stateTarget, stateReplacement);

  // Add rendering in header
  const headerTarget = `<div className="flex items-center h-full">
          <h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">
            {project.name}
          </h1>
        </div>`;
  const headerReplacement = `const activeTab = tabs.find(t => location.pathname.includes(t.path));
        
        <div className="flex items-center h-full gap-2 overflow-hidden">
          <h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase shrink-0">
            {project.name}
          </h1>
          {activeTab && (
            <>
              <span className="material-symbols-outlined text-slate-400 text-[14px] shrink-0">arrow_forward_ios</span>
              <span className="text-[15px] font-bold text-slate-700 shrink-0">{activeTab.label}</span>
            </>
          )}
          {subTitle && (
            <>
              <span className="material-symbols-outlined text-slate-400 text-[12px] shrink-0">arrow_forward_ios</span>
              <span className="text-[14px] font-medium text-slate-600 truncate">{subTitle}</span>
            </>
          )}
        </div>`;
  data = data.replace(headerTarget, `{/* Dynamic Breadcrumbs */}\n        ${headerReplacement}`);

  // Add context to Outlet
  const outletTarget = `<Outlet />`;
  const outletReplacement = `<Outlet context={{ setSubTitle }} />`;
  data = data.replace(outletTarget, outletReplacement);

  fs.writeFileSync(filePath, data);
  console.log('Patched ProjectDetailPage.tsx');
}

function patchProjectCostPlanPage() {
  const filePath = 'web-admin/src/pages/ProjectCostPlanPage.tsx';
  let data = fs.readFileSync(filePath, 'utf8');

  // Add useOutletContext
  data = data.replace(
    "import { useParams } from 'react-router-dom';",
    "import { useParams, useOutletContext } from 'react-router-dom';"
  );

  // Add effect to set subtitle
  const target = `const [activeTab, setActiveTab] = useState<any>('TECH');`;
  const replacement = `const [activeTab, setActiveTab] = useState<any>('TECH');
  const outletContext = useOutletContext<{ setSubTitle?: (title: string) => void }>();

  useEffect(() => {
    if (outletContext?.setSubTitle) {
      if (activeTab === 'TECH') outletContext.setSubTitle('Đặt hàng');
      else if (activeTab === 'DOCS') outletContext.setSubTitle('Chứng từ');
      else if (activeTab === 'FINANCE') outletContext.setSubTitle('Thanh toán');
      else if (activeTab === 'EXPENSE') outletContext.setSubTitle('Chi phí công trình');
      else outletContext.setSubTitle('');
    }
  }, [activeTab, outletContext?.setSubTitle]);`;
  
  data = data.replace(target, replacement);
  fs.writeFileSync(filePath, data);
  console.log('Patched ProjectCostPlanPage.tsx');
}

patchProjectDetailPage();
patchProjectCostPlanPage();
