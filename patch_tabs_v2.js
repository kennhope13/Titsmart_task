const fs = require('fs');

function patchMaterialTab() {
  const filePath = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
  let f = fs.readFileSync(filePath, 'utf8');

  // Add activeSubTab to props interface
  f = f.replace(/export interface MaterialAndPurchasingTabProps \{/, "export interface MaterialAndPurchasingTabProps {\n  activeSubTab?: 'TECH' | 'ORDER' | 'DOCS' | 'FINANCE';");

  // Destructure activeSubTab
  f = f.replace(/userRole\n\}\) => \{/, "userRole,\n  activeSubTab\n}) => {");

  // Replace useState for subTab
  f = f.replace(/const \[subTab, setSubTab\] = useState\<'TECH' \| 'ORDER' \| 'DOCS' \| 'FINANCE'\>\('TECH'\);/, "const subTab = activeSubTab || 'TECH';");

  // Remove the rendered subTabs buttons
  f = f.replace(/<div className="flex px-4 gap-4 border-b border-slate-200 overflow-x-auto custom-scrollbar">[\s\S]*?<\/div>/, "");

  fs.writeFileSync(filePath, f);
}

function patchCostPlanPage() {
  const filePath = 'web-admin/src/pages/ProjectCostPlanPage.tsx';
  let f = fs.readFileSync(filePath, 'utf8');

  // Change state type to ANY to avoid TS union type errors easily
  f = f.replace(/const \[activeTab, setActiveTab\] = useState\w*\<[^>]+\>\(.*?\);/, "const [activeTab, setActiveTab] = useState<any>('TECH');");

  // Change the tabs array definition
  const oldTabsRegex = /\[\s*\{\s*id:\s*'MATERIAL_PLAN'[\s\S]*?\]\.filter\(t => t\.show\)/;
  const newTabs = `[
            { id: 'TECH', label: 'Đặt hàng', icon: 'list_alt', show: true },
            { id: 'DOCS', label: 'Chứng từ', icon: 'description', show: true },
            { id: 'FINANCE', label: 'Thanh toán', icon: 'payments', show: user?.role !== 'engineer' },
            { id: 'EXPENSE', label: 'Chi Phí Công Trình', icon: 'receipt_long', show: user?.role !== 'engineer' },
          ].filter(t => t.show)`;
  f = f.replace(oldTabsRegex, newTabs);

  // Fix conditions
  f = f.replace(/activeTab === "MATERIAL_PLAN"/g, "(activeTab === 'TECH' || activeTab === 'DOCS' || activeTab === 'FINANCE')");
  f = f.replace(/activeTab === 'MATERIAL_PLAN'/g, "(activeTab === 'TECH' || activeTab === 'DOCS' || activeTab === 'FINANCE')");
  f = f.replace(/activeTab !== "MATERIAL_PLAN"/g, "(activeTab !== 'TECH' && activeTab !== 'DOCS' && activeTab !== 'FINANCE')");
  f = f.replace(/activeTab !== 'MATERIAL_PLAN'/g, "(activeTab !== 'TECH' && activeTab !== 'DOCS' && activeTab !== 'FINANCE')");

  // Add the prop activeSubTab={activeTab} to MaterialAndPurchasingTab
  f = f.replace(/<MaterialAndPurchasingTab\s+selectedProject/g, "<MaterialAndPurchasingTab\n            activeSubTab={activeTab}\n            selectedProject");
  
  // Fix header text
  f = f.replace(/VẬT TƯ & CHI PHÍ DỰ ÁN/g, 'MUA HÀNG & CHI PHÍ');

  fs.writeFileSync(filePath, f);
}

patchMaterialTab();
patchCostPlanPage();
console.log("Done");
