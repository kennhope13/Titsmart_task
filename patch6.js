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
    target: "currentSectionSupplyScope = (normalizeImportText(content).includes('nha thau cung cap') || normalizeImportText(content).includes('ben b cung cap')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu cung cap') || normalizeImportText(content).includes('ben a cung cap')) ? 'owner' : 'unknown';",
    replacement: "currentSectionSupplyScope = (normalizeImportText(content).includes('nha thau') || normalizeImportText(content).includes('ben b')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu') || normalizeImportText(content).includes('nha dau tu') || normalizeImportText(content).includes('ben a')) ? 'owner' : 'unknown';"
  },
  {
    target: "const rowSupplyScope = (normalizeImportText(content).includes('nha thau cung cap') || normalizeImportText(content).includes('ben b cung cap')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu cung cap') || normalizeImportText(content).includes('ben a cung cap')) ? 'owner' : 'unknown';",
    replacement: "const rowSupplyScope = (normalizeImportText(content).includes('nha thau') || normalizeImportText(content).includes('ben b')) ? 'contractor' : (normalizeImportText(content).includes('chu dau tu') || normalizeImportText(content).includes('nha dau tu') || normalizeImportText(content).includes('ben a')) ? 'owner' : 'unknown';"
  },
  {
    target: "if (content.includes('chu dau tu cung cap') || content.includes('ben a cung cap')) {",
    replacement: "if (content.includes('chu dau tu') || content.includes('nha dau tu') || content.includes('ben a')) {"
  }
]);

patchFile('web-admin/src/pages/TaskManagementPage.tsx', [
  {
    target: "normalizeVn(sectionInMaterial.jobContent || '').includes('chu dau tu cung cap') || normalizeVn(sectionInMaterial.jobContent || '').includes('ben a cung cap')",
    replacement: "normalizeVn(sectionInMaterial.jobContent || '').includes('chu dau tu') || normalizeVn(sectionInMaterial.jobContent || '').includes('nha dau tu') || normalizeVn(sectionInMaterial.jobContent || '').includes('ben a')"
  },
  {
    target: "normalizeVn(finalSectionName).includes('chu dau tu cung cap') || normalizeVn(finalSectionName).includes('ben a cung cap')",
    replacement: "normalizeVn(finalSectionName).includes('chu dau tu') || normalizeVn(finalSectionName).includes('nha dau tu') || normalizeVn(finalSectionName).includes('ben a')"
  }
]);

console.log('Patched chu dau tu references!');
