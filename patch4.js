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

// 1. Patch MaterialPlanTab.tsx
const matTarget = `    const getSectionIndexForItem = (plan: ProjectMaterialPlan, visited = new Set<string>()): number => {
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
      }

      const myPos = originalOrderMap.get(plan.id) ?? Infinity;
      let bestSecIdx = Infinity;
      let bestSecPos = -1;
      filtered.forEach(r => {
        if (isParentRow(r)) {
          const secPos = originalOrderMap.get(r.id) ?? Infinity;
          if (secPos <= myPos && secPos > bestSecPos) {
            bestSecPos = secPos;
            bestSecIdx = sectionOrder.get(r.id) ?? -1;
          }
        }
      });
      return bestSecIdx === -1 ? Infinity : bestSecIdx;
    };`;

const matRepl = `    const sectionIndexCache = new Map<string, number>();
    const getSectionIndexForItem = (plan: ProjectMaterialPlan, visited = new Set<string>()): number => {
      if (sectionIndexCache.has(plan.id)) return sectionIndexCache.get(plan.id)!;
      if (visited.has(plan.id)) return Infinity;
      visited.add(plan.id);

      if (isParentRow(plan)) {
        const res = sectionOrder.get(plan.id) ?? Infinity;
        sectionIndexCache.set(plan.id, res);
        return res;
      }
      
      const resolvedParentId = resolveParentId(plan);
      if (resolvedParentId) {
        if (sectionOrder.has(resolvedParentId)) {
          const res = sectionOrder.get(resolvedParentId)!;
          sectionIndexCache.set(plan.id, res);
          return res;
        }
        
        const parentItem = filtered.find(r => r.id === resolvedParentId);
        if (parentItem) {
          const parentSecIdx = getSectionIndexForItem(parentItem, visited);
          if (parentSecIdx !== -1) {
            sectionIndexCache.set(plan.id, parentSecIdx);
            return parentSecIdx;
          }
        }
      }

      const myPos = originalOrderMap.get(plan.id) ?? Infinity;
      let bestSecIdx = Infinity;
      let bestSecPos = -1;
      filtered.forEach(r => {
        if (isParentRow(r)) {
          const secPos = originalOrderMap.get(r.id) ?? Infinity;
          if (secPos <= myPos && secPos > bestSecPos) {
            bestSecPos = secPos;
            bestSecIdx = sectionOrder.get(r.id) ?? -1;
          }
        }
      });
      const finalRes = bestSecIdx === -1 ? Infinity : bestSecIdx;
      sectionIndexCache.set(plan.id, finalRes);
      return finalRes;
    };`;

patchFile('web-admin/src/pages/cost-plan/MaterialPlanTab.tsx', matTarget, matRepl);

// 2. Patch PurchasingTab.tsx
const purTarget = `  const getSectionIndexForItem = (pur: ProjectPurchasing, visited = new Set<string>()): number => {
    if (visited.has(pur.id)) return Infinity;
    visited.add(pur.id);

    if (isSectionRow(pur)) return sectionOrder.get(pur.id) ?? Infinity;
    
    const resolvedParentId = resolveParentId(pur);
    if (resolvedParentId) {
      if (sectionOrder.has(resolvedParentId)) return sectionOrder.get(resolvedParentId)!;
      
      const parentItem = data.find(r => r.id === resolvedParentId);
      if (parentItem) {
        const parentSecIdx = getSectionIndexForItem(parentItem, visited);
        if (parentSecIdx !== -1) return parentSecIdx;
      }
    }

    // Use originalOrderMap to find the closest preceding section
    // If it's a manually added item (no order tag), it stays at root (-1)
    const hasOrderTag = /\\[order:([\\d.]+)\\]/.test(String(pur.notes || ''));
    if (!hasOrderTag) return Infinity;

    const myPos = originalOrderMap.get(pur.id) ?? Infinity;
    let bestSecIdx = Infinity;
    let bestSecPos = -1;
    data.forEach(r => {
      if (isSectionRow(r)) {
        const secPos = originalOrderMap.get(r.id) ?? Infinity;
        if (secPos <= myPos && secPos > bestSecPos) {
          bestSecPos = secPos;
          bestSecIdx = sectionOrder.get(r.id) ?? -1;
        }
      }
    });
    return bestSecIdx === -1 ? Infinity : bestSecIdx;
  };`;

const purRepl = `  const sectionIndexCache = new Map<string, number>();
  const getSectionIndexForItem = (pur: ProjectPurchasing, visited = new Set<string>()): number => {
    if (sectionIndexCache.has(pur.id)) return sectionIndexCache.get(pur.id)!;
    if (visited.has(pur.id)) return Infinity;
    visited.add(pur.id);

    if (isSectionRow(pur)) {
      const res = sectionOrder.get(pur.id) ?? Infinity;
      sectionIndexCache.set(pur.id, res);
      return res;
    }
    
    const resolvedParentId = resolveParentId(pur);
    if (resolvedParentId) {
      if (sectionOrder.has(resolvedParentId)) {
        const res = sectionOrder.get(resolvedParentId)!;
        sectionIndexCache.set(pur.id, res);
        return res;
      }
      
      const parentItem = data.find(r => r.id === resolvedParentId);
      if (parentItem) {
        const parentSecIdx = getSectionIndexForItem(parentItem, visited);
        if (parentSecIdx !== -1) {
          sectionIndexCache.set(pur.id, parentSecIdx);
          return parentSecIdx;
        }
      }
    }

    // Use originalOrderMap to find the closest preceding section
    // If it's a manually added item (no order tag), it stays at root (-1)
    const hasOrderTag = /\\[order:([\\d.]+)\\]/.test(String(pur.notes || ''));
    if (!hasOrderTag) {
      sectionIndexCache.set(pur.id, Infinity);
      return Infinity;
    }

    const myPos = originalOrderMap.get(pur.id) ?? Infinity;
    let bestSecIdx = Infinity;
    let bestSecPos = -1;
    data.forEach(r => {
      if (isSectionRow(r)) {
        const secPos = originalOrderMap.get(r.id) ?? Infinity;
        if (secPos <= myPos && secPos > bestSecPos) {
          bestSecPos = secPos;
          bestSecIdx = sectionOrder.get(r.id) ?? -1;
        }
      }
    });
    const finalRes = bestSecIdx === -1 ? Infinity : bestSecIdx;
    sectionIndexCache.set(pur.id, finalRes);
    return finalRes;
  };`;

patchFile('web-admin/src/pages/cost-plan/PurchasingTab.tsx', purTarget, purRepl);

console.log('Done patch4!');
