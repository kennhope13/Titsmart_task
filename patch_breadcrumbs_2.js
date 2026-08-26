const fs = require('fs');

function patchProjectDetailPage() {
  const filePath = 'web-admin/src/pages/ProjectDetailPage.tsx';
  let data = fs.readFileSync(filePath, 'utf8');

  // Add useState to import
  if (data.includes("import React, { useMemo } from 'react';")) {
      data = data.replace(
        "import React, { useMemo } from 'react';",
        "import React, { useMemo, useState } from 'react';"
      );
  }

  // Add subTitle state
  if (!data.includes('const [subTitle, setSubTitle]')) {
      const stateTarget = `  const role = useAuthStore(state => state.user?.role);`;
      const stateReplacement = `  const role = useAuthStore(state => state.user?.role);\n  const [subTitle, setSubTitle] = useState('');`;
      data = data.replace(stateTarget, stateReplacement);
  }

  // Add activeTab variable
  if (!data.includes('const activeTab = tabs.find')) {
      const activeTabTarget = `  // Redirect to first tab if we are exactly on /projects/:projectId`;
      const activeTabReplacement = `  const activeTab = tabs.find(t => location.pathname.includes(t.path));\n\n  // Redirect to first tab if we are exactly on /projects/:projectId`;
      data = data.replace(activeTabTarget, activeTabReplacement);
  }

  // Add rendering in header
  const headerTarget = `<div className="flex items-center h-full">
          <h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">
            {project.name}
          </h1>
        </div>`;
  if (data.includes(headerTarget)) {
      const headerReplacement = `<div className="flex items-center h-full gap-2 overflow-hidden">
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
      data = data.replace(headerTarget, headerReplacement);
  }

  // Add context to Outlet
  const outletTarget = `<Outlet />`;
  if (data.includes(outletTarget)) {
      const outletReplacement = `<Outlet context={{ setSubTitle }} />`;
      data = data.replace(outletTarget, outletReplacement);
  }

  fs.writeFileSync(filePath, data);
  console.log('Patched ProjectDetailPage.tsx');
}

patchProjectDetailPage();
