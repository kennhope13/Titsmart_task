const fs = require('fs');

let costPlan = fs.readFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', 'utf8');
costPlan = costPlan.replace(
  "{ id: 'DOCUMENTS', label: 'Theo dõi chứng từ', icon: 'description', show: user?.role !== 'engineer' },",
  "// { id: 'DOCUMENTS', label: 'Theo dõi chứng từ', icon: 'description', show: user?.role !== 'engineer' },"
);
costPlan = costPlan.replace(
  /\{\s*activeTab\s*===\s*'DOCUMENTS'\s*&&\s*\(\s*<DocumentCertificateTab[\s\S]*?\/>\s*\)\s*\}/,
  ""
);
// Pass selectedProject and onAddMaterial to MaterialAndPurchasingTab
costPlan = costPlan.replace(
  '<MaterialAndPurchasingTab',
  '<MaterialAndPurchasingTab \n            selectedProject={selectedProject}\n            onAddMaterial={handleAddMaterialPlan}'
);

fs.writeFileSync('web-admin/src/pages/ProjectCostPlanPage.tsx', costPlan, 'utf8');

let tabSrc = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');
tabSrc = tabSrc.replace(
  "import { CustomSelect } from '@/components/common/CustomSelect';",
  "import { CustomSelect } from '@/components/common/CustomSelect';\nimport { DocumentCertificateTab } from './DocumentCertificateTab';"
);

// Add props to interface
tabSrc = tabSrc.replace(
  "userRole?: string;",
  "userRole?: string;\n  selectedProject: string;\n  onAddMaterial: (plan: any) => void;"
);

// Add props to component destructured arguments
tabSrc = tabSrc.replace(
  "userRole,\n}: MaterialAndPurchasingTabProps",
  "userRole,\n  selectedProject,\n  onAddMaterial,\n}: MaterialAndPurchasingTabProps"
);

// Add local state
tabSrc = tabSrc.replace(
  "const [tempValue, setTempValue] = useState<string>('');",
  "const [tempValue, setTempValue] = useState<string>('');\n  const [triggerAddDoc, setTriggerAddDoc] = useState(false);"
);

// Hide filter bar when DOCS
tabSrc = tabSrc.replace(
  '<div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 text-xs text-slate-600 flex-wrap">',
  '<div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 text-xs text-slate-600 flex-wrap" style={{ display: subTab === "DOCS" ? "none" : "flex" }}>'
);

// Add "Thêm Mới" button in the tab buttons area
const tabsHtmlRegex = /(<div className="flex px-4 gap-4 border-b border-slate-200 overflow-x-auto custom-scrollbar">[\s\S]*?<\/div>)/;
const match = tabSrc.match(tabsHtmlRegex);
if (match) {
  const newTabsHtml = match[1] + `\n        {subTab === 'DOCS' && userRole !== 'engineer' && (
          <div className="absolute right-4 top-2 z-50">
            <button 
              onClick={() => setTriggerAddDoc(true)} 
              className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-[13px] font-bold hover:opacity-90 active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Thêm Mới
            </button>
          </div>
        )}`;
  tabSrc = tabSrc.replace(tabsHtmlRegex, newTabsHtml);
}

// In the table area, conditionally render DocumentCertificateTab
const tableContainerRegex = /<div className="flex-1 overflow-auto bg-white relative custom-scrollbar table-container">/;
const newTableContainer = `<div className="flex-1 overflow-auto bg-white relative custom-scrollbar table-container">
        {subTab === 'DOCS' ? (
          <div className="w-full h-full relative" style={{ minHeight: 0 }}>
            <DocumentCertificateTab 
              data={data}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              selectedProject={selectedProject}
              onAdd={onAddMaterial}
              onUpdate={onUpdateMaterial}
              onDelete={onDelete}
              triggerAdd={triggerAddDoc}
              onTriggerHandled={() => setTriggerAddDoc(false)}
            />
          </div>
        ) : (`;

tabSrc = tabSrc.replace(tableContainerRegex, newTableContainer);

// Close the ternary at the end of the table
tabSrc = tabSrc.replace(
  '        </table>\n      </div>\n    </div>\n  );\n};',
  '        </table>\n        )}\n      </div>\n    </div>\n  );\n};'
);

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', tabSrc, 'utf8');
console.log('Script built successfully');
