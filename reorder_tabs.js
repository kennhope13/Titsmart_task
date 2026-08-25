const fs = require('fs');

function updateSidebar() {
  let f = fs.readFileSync('web-admin/src/components/layout/Sidebar.tsx', 'utf8');
  
  // Find the block:
  // const projectItems = [ ... ];
  // if (...) { projectItems.push(...) }
  const regex = /const projectItems = \[\s*\{[\s\S]*?\];\s*if \([^)]+\) \{\s*projectItems\.push\([^)]+\);\s*\}/;
  
  const replacement = `const baseProjectItems = [
          { label: 'Tiến độ Công việc', path: \`/projects/\${currentProject.id}/tasks\`, icon: 'fact_check' },
          { label: 'Vật tư & Chi phí', path: \`/projects/\${currentProject.id}/cost-plan\`, icon: 'account_balance_wallet' },
          { label: 'Theo dõi Hồ sơ', path: \`/projects/\${currentProject.id}/documents\`, icon: 'file_present', requireAdmin: true },
          { label: 'Kho Dự án', path: \`/projects/\${currentProject.id}/inventory\`, icon: 'inventory_2' },
          { label: 'Nhật ký Hiện trường', path: \`/projects/\${currentProject.id}/field-logs\`, icon: 'add_a_photo' }
        ];

        const projectItems = baseProjectItems.filter(item => {
          if (item.requireAdmin && (role === 'staff' || role === 'engineer')) return false;
          return true;
        });`;
        
  f = f.replace(regex, replacement);
  fs.writeFileSync('web-admin/src/components/layout/Sidebar.tsx', f);
}

function updateProjectDetailPage() {
  let f = fs.readFileSync('web-admin/src/pages/ProjectDetailPage.tsx', 'utf8');
  
  // Find the block: const tabs = [ ... ];
  // It might also have conditional pushing for "Theo dõi Hồ sơ".
  const regexTabs = /const tabs = \[\s*\{[\s\S]*?\];/;
  
  const replacementTabs = `const baseTabs = [
      { label: 'Tiến độ Công việc', path: \`/projects/\${project.id}/tasks\`, icon: 'fact_check' },
      { label: 'Vật tư & Chi phí', path: \`/projects/\${project.id}/cost-plan\`, icon: 'account_balance_wallet' },
      { label: 'Theo dõi Hồ sơ', path: \`/projects/\${project.id}/documents\`, icon: 'file_present', requireAdmin: true },
      { label: 'Kho Dự án', path: \`/projects/\${project.id}/inventory\`, icon: 'inventory_2' },
      { label: 'Nhật ký Hiện trường', path: \`/projects/\${project.id}/field-logs\`, icon: 'add_a_photo' }
    ];

    const tabs = baseTabs.filter(tab => {
      if (tab.requireAdmin && (role === 'staff' || role === 'engineer')) return false;
      return true;
    });`;
    
  f = f.replace(regexTabs, replacementTabs);
  
  // Need to handle the fact that we might have had:
  // if (role !== 'staff' && role !== 'engineer') { tabs.push(...) }
  // So let's just remove that if statement.
  const regexPush = /if\s*\([^)]+\)\s*\{\s*tabs\.push\([^)]+\);\s*\}/;
  f = f.replace(regexPush, '');
  
  fs.writeFileSync('web-admin/src/pages/ProjectDetailPage.tsx', f);
}

try {
  updateSidebar();
  updateProjectDetailPage();
  console.log('Success');
} catch(e) {
  console.error(e);
}
