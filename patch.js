const fs = require('fs');

function patchFile(path, replacements) {
  let content = fs.readFileSync(path, 'utf8');
  let normalizedContent = content.replace(/\r\n/g, '\n');
  
  for (let { target, replacement } of replacements) {
    target = target.replace(/\r\n/g, '\n');
    replacement = replacement.replace(/\r\n/g, '\n');
    
    if (!normalizedContent.includes(target)) {
      console.error('Target not found in ' + path + ': ' + target.substring(0, 50));
    }
    normalizedContent = normalizedContent.replace(target, replacement);
  }
  
  // Write back keeping the original line endings if it was CRLF
  if (content.includes('\r\n')) {
    normalizedContent = normalizedContent.replace(/\n/g, '\r\n');
  }
  
  fs.writeFileSync(path, normalizedContent, 'utf8');
}

patchFile('web-admin/src/pages/cost-plan/PurchasingTab.tsx', [
  {
    target: `  const resolveParentId = (pur: ProjectPurchasing): string | undefined => {
    if (pur.parentId) return pur.parentId;
    if (!pur.stt || !pur.stt.includes('.')) return undefined;
    const parts = pur.stt.split('.');
    parts.pop();
    const parentStt = parts.join('.');
    const parentItem = data.find(r => r.stt === parentStt);
    return parentItem?.id;
  };`,
    replacement: `  const resolveParentId = (pur: ProjectPurchasing): string | undefined => {
    if (pur.stt && pur.stt.includes('.')) {
      const parts = pur.stt.split('.');
      parts.pop();
      const parentStt = parts.join('.');
      const parentItem = data.find(r => r.stt === parentStt);
      if (parentItem) return parentItem.id;
    }
    return pur.parentId;
  };`
  }
]);

patchFile('web-admin/src/pages/cost-plan/MaterialPlanTab.tsx', [
  {
    target: `    const getSectionIndexForItem = (plan: ProjectMaterialPlan, visited = new Set<string>()): number => {
      if (visited.has(plan.id)) return Infinity;
      visited.add(plan.id);

      if (isParentRow(plan)) return sectionOrder.get(plan.id) ?? Infinity;
      
      if (plan.parentId) {
        if (sectionOrder.has(plan.parentId)) return sectionOrder.get(plan.parentId)!;
        
        const parentItem = filtered.find(r => r.id === plan.parentId);
        if (parentItem) {
          const parentSecIdx = getSectionIndexForItem(parentItem, visited);
          if (parentSecIdx !== -1) return parentSecIdx;
        }
      }`,
    replacement: `    const resolveParentId = (plan: ProjectMaterialPlan): string | undefined => {
      if (plan.stt && plan.stt.includes('.')) {
        const parts = plan.stt.split('.');
        parts.pop();
        const parentStt = parts.join('.');
        const parentItem = filtered.find(r => r.stt === parentStt);
        if (parentItem) return parentItem.id;
      }
      return plan.parentId;
    };

    const getSectionIndexForItem = (plan: ProjectMaterialPlan, visited = new Set<string>()): number => {
      if (visited.has(plan.id)) return Infinity;
      visited.add(plan.id);

      if (isParentRow(plan)) return sectionOrder.get(plan.id) ?? Infinity;
      
      const resolvedParentId = resolveParentId(plan);
      if (resolvedParentId) {
        if (sectionOrder.has(resolvedParentId)) return sectionOrder.get(resolvedParentId)!;
        
        const parentItem = filtered.find(r => r.id === resolvedParentId);
        if (parentItem) {
          const parentSecIdx = getSectionIndexForItem(parentItem, visited);
          if (parentSecIdx !== -1) return parentSecIdx;
        }
      }`
  },
  {
    target: `                } else {
                  let targetSection = currentSectionKey;
                  if (t.parentId && groups[t.parentId]) {
                    targetSection = t.parentId;
                  }`,
    replacement: `                } else {
                  let targetSection = currentSectionKey;
                  const resolvedParentId = resolveParentId(t);
                  if (resolvedParentId && groups[resolvedParentId]) {
                    targetSection = resolvedParentId;
                  } else if (getSectionIndexForItem(t) !== Infinity) {
                    targetSection = currentSectionKey;
                  }`
  },
  {
    target: `                items.forEach((t: any) => {
                  if (t.parentId && t.parentId !== secKey && map.has(t.parentId)) {
                    map.get(t.parentId)!.children.push(map.get(t.id));
                  } else {
                    roots.push(map.get(t.id));
                  }
                });`,
    replacement: `                items.forEach((t: any) => {
                  const resolvedParentId = resolveParentId(t);
                  if (resolvedParentId && resolvedParentId !== secKey && map.has(resolvedParentId)) {
                    map.get(resolvedParentId)!.children.push(map.get(t.id));
                  } else {
                    roots.push(map.get(t.id));
                  }
                });`
  }
]);

patchFile('web-admin/src/pages/ProjectCostPlanPage.tsx', [
  {
    target: `    if (plan.parentId) {
      const parent = allPlans.find(p => p.id === plan.parentId);
      if (parent) {
        if (isSectionMarker(parent.stt, parent.notes)) return parent;
        return getSectionForMaterialPlan(parent, allPlans, visited);
      }
    }`,
    replacement: `    let effectiveParentId = plan.parentId;
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
    }`
  },
  {
    target: `        const findPurchasingParentId = (matParentId?: string): string | undefined => {
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
          const parentId = findPurchasingParentId(plan.parentId);`,
    replacement: `        const findPurchasingParentId = (plan: ProjectMaterialPlan): string | undefined => {
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
          const parentId = findPurchasingParentId(plan);`
  }
]);

console.log('Done patch!');
