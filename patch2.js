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

const target1 = `    if (plan.parentId) {
      const parent = allPlans.find(p => p.id === plan.parentId);
      if (parent) {
        if (isSectionMarker(parent.stt, parent.notes)) return parent;
        return getSectionForMaterialPlan(parent, allPlans, visited);
      }
    }`;
const repl1 = `    let effectiveParentId = plan.parentId;
    if (plan.stt && plan.stt.includes('.')) {
      const parts = plan.stt.split('.');
      parts.pop();
      const parentStt = parts.join('.');
      const parentItem = allPlans.find(r => r.stt === parentStt);
      if (parentItem) effectiveParentId = parentItem.id;
    }

    if (effectiveParentId) {
      const parent = allPlans.find(p => p.id === effectiveParentId);
      if (parent) {
        if (isSectionMarker(parent.stt, parent.notes)) return parent;
        return getSectionForMaterialPlan(parent, allPlans, visited);
      }
    }`;
patchFile('web-admin/src/pages/ProjectCostPlanPage.tsx', target1, repl1);

const target2 = `        const findPurchasingParentId = (matParentId?: string): string | undefined => {
          if (!matParentId) return undefined;
          const parentMat = currentProjMaterialPlans.find(m => m.id === matParentId);
          if (!parentMat) return undefined;
          const match = currentProjPurchasing.find(p =>
            norm(p.stt) === norm(parentMat.stt) && norm(p.content) === norm(parentMat.jobContent)
          );
          return match ? match.id : undefined;
        };

        for (const plan of missingPlans) {
          if (isCancelled) break;
          
          syncingIdsRef.current.add(plan.id);
          const parentId = findPurchasingParentId(plan.parentId);`;
const repl2 = `        const findPurchasingParentId = (plan: ProjectMaterialPlan): string | undefined => {
          let matParentId = plan.parentId;
          if (plan.stt && plan.stt.includes('.')) {
            const parts = plan.stt.split('.');
            parts.pop();
            const parentStt = parts.join('.');
            const parentItem = currentProjMaterialPlans.find(r => r.stt === parentStt);
            if (parentItem) matParentId = parentItem.id;
          }
          if (!matParentId) return undefined;
          const parentMat = currentProjMaterialPlans.find(m => m.id === matParentId);
          if (!parentMat) return undefined;
          const match = currentProjPurchasing.find(p =>
            norm(p.stt) === norm(parentMat.stt) && norm(p.content) === norm(parentMat.jobContent)
          );
          return match ? match.id : undefined;
        };

        for (const plan of missingPlans) {
          if (isCancelled) break;
          
          syncingIdsRef.current.add(plan.id);
          const parentId = findPurchasingParentId(plan);`;
patchFile('web-admin/src/pages/ProjectCostPlanPage.tsx', target2, repl2);

console.log('Done patch2!');
