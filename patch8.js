const fs = require('fs');

function patchFile(path, targetStr, replacementStr) {
  let content = fs.readFileSync(path, 'utf8');
  let normalizedContent = content.replace(/\r\n/g, '\n');
  let normalizedTarget = targetStr.replace(/\r\n/g, '\n');
  let normalizedReplacement = replacementStr.replace(/\r\n/g, '\n');

  if (!normalizedContent.includes(normalizedTarget)) {
    console.error('Target not found in ' + path);
  } else {
    normalizedContent = normalizedContent.replace(normalizedTarget, normalizedReplacement);
  }
  
  if (content.includes('\r\n')) {
    normalizedContent = normalizedContent.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(path, normalizedContent, 'utf8');
}

const target = `const isContractorMaterialPlan = (plan: ProjectMaterialPlan) => {
  const notes = String(plan.notes || '').toLowerCase();
  const content = String(plan.jobContent || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  
  if (plan.supplyScope === 'owner' || notes.includes('[owner]') || content.includes('chu dau tu') || content.includes('nha dau tu') || content.includes('ben a')) {
    return false;
  }
  
  return true;
};`;

const repl = `const isContractorMaterialPlan = (plan: ProjectMaterialPlan) => {
  const notes = String(plan.notes || '').toLowerCase();
  const content = String(plan.jobContent || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  
  if (plan.supplyScope === 'owner' || notes.includes('[owner]') || content.includes('chu dau tu') || content.includes('nha dau tu') || content.includes('ben a') || content.includes('ban a')) {
    return false;
  }
  
  return true;
};`;

patchFile('web-admin/src/pages/ProjectCostPlanPage.tsx', target, repl);
console.log('Done patch8!');
