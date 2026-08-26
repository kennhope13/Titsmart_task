const fs = require('fs');

function patchMaterialTab() {
  const filePath = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
  let f = fs.readFileSync(filePath, 'utf8');

  // Add prop
  f = f.replace('export interface MaterialAndPurchasingTabProps {', "export interface MaterialAndPurchasingTabProps {\n  activeSubTab?: 'TECH' | 'ORDER' | 'DOCS' | 'FINANCE';");

  // Destructure activeSubTab
  f = f.replace('userRole\n}) => {', "userRole,\n  activeSubTab\n}) => {");

  // Replace subTab state
  f = f.replace(/const \[subTab, setSubTab\] = useState\<'TECH' \| 'ORDER' \| 'DOCS' \| 'FINANCE'\>\('TECH'\);/, "const subTab = activeSubTab || 'TECH';");

  // Remove the rendered subTabs (the div with buttons)
  // We'll just remove the buttons div and keep the filter div.
  const regex = /<div className="flex px-4 gap-4 border-b border-slate-200 overflow-x-auto custom-scrollbar">[\s\S]*?<\/div>\s*<div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 text-xs text-slate-600 flex-wrap"/;
  f = f.replace(regex, `<div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 text-xs text-slate-600 flex-wrap"`);

  fs.writeFileSync(filePath, f);
}

function patchCostPlanPage() {
  const filePath = 'web-admin/src/pages/ProjectCostPlanPage.tsx';
  let f = fs.readFileSync(filePath, 'utf8');

  // Change state type
  f = f.replace(/const \[activeTab, setActiveTab\] = useState\<'MATERIAL_PLAN' \| 'EXPENSE'\>\('MATERIAL_PLAN'\);/, "const [activeTab, setActiveTab] = useState<'TECH' | 'DOCS' | 'FINANCE' | 'EXPENSE'>('TECH');");

  // Change the tabs array
  const oldTabs = `[
            { id: 'MATERIAL_PLAN', label: 'Vật tư & Mua hàng', icon: 'list_alt', show: true },
            { id: 'EXPENSE', label: 'Chi Phí Công Trình', icon: 'receipt_long', show: user?.role !== 'engineer' },
            // { id: 'DOCUMENTS', label: 'Theo dõi chứng từ', icon: 'description', show: user?.role !== 'engineer' },
          ]`;
          
  const newTabs = `[
            { id: 'TECH', label: 'Đặt hàng', icon: 'list_alt', show: true },
            { id: 'DOCS', label: 'Chứng từ', icon: 'description', show: true },
            { id: 'FINANCE', label: 'Thanh toán', icon: 'payments', show: user?.role !== 'engineer' },
            { id: 'EXPENSE', label: 'Chi Phí Công Trình', icon: 'receipt_long', show: user?.role !== 'engineer' },
          ]`;
  f = f.replace(oldTabs, newTabs);

  // Change the activeTab logic for rendering
  // Old: {activeTab === "MATERIAL_PLAN" && (
  f = f.replace(/\{activeTab === "MATERIAL_PLAN" && \(/g, "{(activeTab === 'TECH' || activeTab === 'DOCS' || activeTab === 'FINANCE') && (");

  // Add the prop activeSubTab={activeTab} to MaterialAndPurchasingTab
  f = f.replace(/<MaterialAndPurchasingTab\s+selectedProject/g, "<MaterialAndPurchasingTab \n            activeSubTab={activeTab as any}\n            selectedProject");

  // Fix header condition: 
  // activeTab !== 'MATERIAL_PLAN' && activeTab !== 'PURCHASING' && !(activeTab === 'EXPENSE' && expenseSubTab === 'SUMMARY')
  f = f.replace(/activeTab !== 'MATERIAL_PLAN'/g, "activeTab !== 'TECH' && activeTab !== 'DOCS' && activeTab !== 'FINANCE'");

  // Fix export excel condition
  f = f.replace(/if \(activeTab === "MATERIAL_PLAN"\)/g, "if (activeTab === 'TECH' || activeTab === 'DOCS' || activeTab === 'FINANCE')");
  
  // Fix header text
  f = f.replace(/VẬT TƯ & CHI PHÍ DỰ ÁN/g, 'MUA HÀNG & CHI PHÍ');

  fs.writeFileSync(filePath, f);
}

patchMaterialTab();
patchCostPlanPage();
console.log("Done");
