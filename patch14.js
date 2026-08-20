const fs = require('fs');

const path = 'web-admin/src/services/realtimeStore.ts';
let content = fs.readFileSync(path, 'utf8');

const regex = /updateMaterialPlan: async \(id, fields\) => \{[\s\S]*?try \{[\s\S]*?const updated = normalizeMaterialPlan\(await api.accounting.updateMaterialPlan\(id, fields\)\);[\s\S]*?set\(\(state\) => \{[\s\S]*?const nextPlans = state.materialPlans.map\(\(p\) => \(p.id === id \? updated : p\)\);[\s\S]*?get\(\)\.logActivity\('Cập nhật kế hoạch vật tư: ' \+ \(updated.jobContent \|\| id\), 'COMPANY'\);[\s\S]*?persistAndNotify\(\{ materialPlans: nextPlans \}\);[\s\S]*?return \{ materialPlans: nextPlans \};[\s\S]*?\}\);/g;

// Fallback to simpler replacement if precise regex fails due to character encoding
const target = `updateMaterialPlan: async (id, fields) => {
      try {
        const updated = normalizeMaterialPlan(await api.accounting.updateMaterialPlan(id, fields));
        set((state) => {
          const nextPlans = state.materialPlans.map((p) => (p.id === id ? updated : p));
          get().logActivity('Cập nhật kế hoạch vật tư: ' + (updated.jobContent || id), 'COMPANY');
          persistAndNotify({ materialPlans: nextPlans });
          return { materialPlans: nextPlans };
        });`;

const replacement = `updateMaterialPlan: async (id, fields) => {
      try {
        const oldPlan = get().materialPlans.find((p) => p.id === id);
        const updated = normalizeMaterialPlan(await api.accounting.updateMaterialPlan(id, fields));
        set((state) => {
          const nextPlans = state.materialPlans.map((p) => (p.id === id ? updated : p));
          
          let changes = [];
          if (oldPlan) {
            if (oldPlan.stt !== updated.stt) changes.push(\`STT: "\${oldPlan.stt}" -> "\${updated.stt}"\`);
            if (oldPlan.jobContent !== updated.jobContent) changes.push(\`Nội dung: "\${oldPlan.jobContent}" -> "\${updated.jobContent}"\`);
            if (oldPlan.contractVolume !== updated.contractVolume) changes.push(\`Khối lượng: "\${oldPlan.contractVolume}" -> "\${updated.contractVolume}"\`);
            if (oldPlan.unit !== updated.unit) changes.push(\`ĐVT: "\${oldPlan.unit}" -> "\${updated.unit}"\`);
            if (oldPlan.supplyScope !== updated.supplyScope) changes.push(\`Phạm vi cc: "\${oldPlan.supplyScope}" -> "\${updated.supplyScope}"\`);
            if (oldPlan.notes !== updated.notes) changes.push(\`Ghi chú: "\${oldPlan.notes}" -> "\${updated.notes}"\`);
          }
          const detailStr = changes.length > 0 ? \` |Detail:\${updated.projectCode} (STT \${updated.stt}): \${changes.join(', ')}\` : '';
          
          get().logActivity('Cập nhật Kế hoạch vật tư: ' + (updated.jobContent || id) + detailStr, updated.projectCode || 'COMPANY');
          persistAndNotify({ materialPlans: nextPlans });
          return { materialPlans: nextPlans };
        });`;

let success = false;
// Since we don't know the exact string, let's use a robust replace
content = content.replace(/updateMaterialPlan:\s*async\s*\(id,\s*fields\)\s*=>\s*\{[\s\S]*?get\(\)\.logActivity\('C.*?p nh.*?t.*?v.*?t t.*?: '\s*\+\s*\(updated\.jobContent\s*\|\|\s*id\),\s*'COMPANY'\);/g, (match) => {
    success = true;
    return `updateMaterialPlan: async (id, fields) => {
      try {
        const oldPlan = get().materialPlans.find((p) => p.id === id);
        const updated = normalizeMaterialPlan(await api.accounting.updateMaterialPlan(id, fields));
        set((state) => {
          const nextPlans = state.materialPlans.map((p) => (p.id === id ? updated : p));
          
          let changes = [];
          if (oldPlan) {
            if (oldPlan.stt !== updated.stt) changes.push(\`STT: "\${oldPlan.stt || ''}" -> "\${updated.stt || ''}"\`);
            if (oldPlan.jobContent !== updated.jobContent) changes.push(\`Nội dung: "\${oldPlan.jobContent || ''}" -> "\${updated.jobContent || ''}"\`);
            if (oldPlan.contractVolume !== updated.contractVolume) changes.push(\`Khối lượng: "\${oldPlan.contractVolume || ''}" -> "\${updated.contractVolume || ''}"\`);
            if (oldPlan.unit !== updated.unit) changes.push(\`ĐVT: "\${oldPlan.unit || ''}" -> "\${updated.unit || ''}"\`);
            if (oldPlan.supplyScope !== updated.supplyScope) changes.push(\`Phạm vi: "\${oldPlan.supplyScope || ''}" -> "\${updated.supplyScope || ''}"\`);
            if (oldPlan.notes !== updated.notes) changes.push(\`Ghi chú: "\${oldPlan.notes || ''}" -> "\${updated.notes || ''}"\`);
          }
          const detailStr = changes.length > 0 ? \` |Detail:Dự án \${updated.projectCode}, Đầu mục \${updated.stt}: \${changes.join(', ')}\` : '';
          
          get().logActivity('Cập nhật Kế hoạch vật tư: ' + (updated.jobContent || id) + detailStr, updated.projectCode || 'COMPANY');`;
});

if (success) {
  fs.writeFileSync(path, content, 'utf8');
  console.log('Patched updateMaterialPlan');
} else {
  console.log('Regex failed');
}
