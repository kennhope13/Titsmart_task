const fs = require('fs');

const path = 'web-admin/src/pages/ProjectCostPlanPage.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `const isContractorMaterialPlan = (plan: ProjectMaterialPlan) => {
  const notes = String(plan.notes || '').toLowerCase();
  const content = String(plan.jobContent || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  return plan.supplyScope === 'contractor' || notes.includes('[contractor]') || notes.includes('nha thau') || content.includes('nha thau cung cap');
};`;

const replStr = `const isContractorMaterialPlan = (plan: ProjectMaterialPlan) => {
  const notes = String(plan.notes || '').toLowerCase();
  const content = String(plan.jobContent || '').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
  
  if (plan.supplyScope === 'owner' || notes.includes('[owner]') || content.includes('chu dau tu') || content.includes('nha dau tu') || content.includes('ben a')) {
    return false;
  }
  
  return true;
};`;

function normalize(s) { return s.replace(/\r\n/g, '\n'); }

if (normalize(content).includes(normalize(targetStr))) {
  content = normalize(content).replace(normalize(targetStr), normalize(replStr));
  if (fs.readFileSync(path, 'utf8').includes('\r\n')) {
    content = content.replace(/\n/g, '\r\n');
  }
  fs.writeFileSync(path, content, 'utf8');
  console.log('Patched isContractorMaterialPlan successfully!');
} else {
  console.error('Target not found!');
}
