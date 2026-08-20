const fs = require('fs');

function patchFile(path, replacements) {
  let content = fs.readFileSync(path, 'utf8');
  for (const { target, replacement } of replacements) {
    if (content.includes(target)) {
      content = content.replace(target, replacement);
    } else {
      console.warn('Target not found in', path, ':\n', target);
    }
  }
  fs.writeFileSync(path, content, 'utf8');
}

patchFile('web-admin/src/pages/ProjectCostPlanPage.tsx', [
  {
    target: "const isContractorMaterialPlan = (plan: ProjectMaterialPlan) => {\n  const notes = String(plan.notes || '').toLowerCase();\n  const content = String(plan.jobContent || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n  \n  if (plan.supplyScope === 'owner' || notes.includes('[owner]') || content.includes('chu dau tu') || content.includes('nha dau tu') || content.includes('ben a')) {\n    return false;\n  }",
    replacement: "const isContractorMaterialPlan = (plan: ProjectMaterialPlan) => {\n  const notes = String(plan.notes || '').toLowerCase();\n  const content = String(plan.jobContent || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');\n  \n  if (plan.supplyScope === 'owner' || notes.includes('[owner]') || content.includes('chu dau tu') || content.includes('nha dau tu') || content.includes('ben a') || content.includes('ban a')) {\n    return false;\n  }"
  },
  {
    target: "currentSectionSupplyScope = (normalizeImportText(content).includes('nha thau') || normalizeImportText(content).includes('ben b')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu') || normalizeImportText(content).includes('nha dau tu') || normalizeImportText(content).includes('ben a')) ? 'owner' : 'unknown';",
    replacement: "currentSectionSupplyScope = (normalizeImportText(content).includes('nha thau') || normalizeImportText(content).includes('ben b')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu') || normalizeImportText(content).includes('nha dau tu') || normalizeImportText(content).includes('ben a') || normalizeImportText(content).includes('ban a')) ? 'owner' : 'unknown';"
  },
  {
    target: "const rowSupplyScope = (normalizeImportText(content).includes('nha thau') || normalizeImportText(content).includes('ben b')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu') || normalizeImportText(content).includes('nha dau tu') || normalizeImportText(content).includes('ben a')) ? 'owner' : 'unknown';",
    replacement: "const rowSupplyScope = (normalizeImportText(content).includes('nha thau') || normalizeImportText(content).includes('ben b')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu') || normalizeImportText(content).includes('nha dau tu') || normalizeImportText(content).includes('ben a') || normalizeImportText(content).includes('ban a')) ? 'owner' : 'unknown';"
  },
  {
    target: "if (content.includes('chu dau tu') || content.includes('nha dau tu') || content.includes('ben a')) {",
    replacement: "if (content.includes('chu dau tu') || content.includes('nha dau tu') || content.includes('ben a') || content.includes('ban a')) {"
  }
]);

patchFile('web-admin/src/pages/TaskManagementPage.tsx', [
  {
    target: "normalizeVn(sectionInMaterial.jobContent || '').includes('chu dau tu') || normalizeVn(sectionInMaterial.jobContent || '').includes('nha dau tu') || normalizeVn(sectionInMaterial.jobContent || '').includes('ben a')",
    replacement: "normalizeVn(sectionInMaterial.jobContent || '').includes('chu dau tu') || normalizeVn(sectionInMaterial.jobContent || '').includes('nha dau tu') || normalizeVn(sectionInMaterial.jobContent || '').includes('ben a') || normalizeVn(sectionInMaterial.jobContent || '').includes('ban a')"
  },
  {
    target: "normalizeVn(finalSectionName).includes('chu dau tu') || normalizeVn(finalSectionName).includes('nha dau tu') || normalizeVn(finalSectionName).includes('ben a')",
    replacement: "normalizeVn(finalSectionName).includes('chu dau tu') || normalizeVn(finalSectionName).includes('nha dau tu') || normalizeVn(finalSectionName).includes('ben a') || normalizeVn(finalSectionName).includes('ban a')"
  }
]);

console.log('Patched ban a references!');
