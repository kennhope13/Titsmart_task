const fs = require('fs');
const path = 'web-admin/src/services/realtimeStore.ts';
let content = fs.readFileSync(path, 'utf8');

let success = false;
content = content.replace(/updatePurchasingPlan:\s*async\s*\(id,\s*fields\)\s*=>\s*\{[\s\S]*?get\(\)\.logActivity\('C.*?p nh.*?t.*?mua s.*?m: '\s*\+\s*\(updated\.content\s*\|\|\s*id\),\s*'COMPANY'\);/g, (match) => {
    success = true;
    return `updatePurchasingPlan: async (id, fields) => {
      try {
        const oldPlan = get().purchasingPlans.find((p) => p.id === id);
        const updated = normalizePurchasingPlan(await api.accounting.updatePurchasing(id, fields));
        set((state) => {
          const nextPurs = state.purchasingPlans.map((p) => (p.id === id ? updated : p));
          
          let changes = [];
          if (oldPlan) {
            if (oldPlan.stt !== updated.stt) changes.push(\`STT: "\${oldPlan.stt || ''}" -> "\${updated.stt || ''}"\`);
            if (oldPlan.content !== updated.content) changes.push(\`Nội dung: "\${oldPlan.content || ''}" -> "\${updated.content || ''}"\`);
            if (oldPlan.volumeContract !== updated.volumeContract) changes.push(\`KL: "\${oldPlan.volumeContract || ''}" -> "\${updated.volumeContract || ''}"\`);
            if (oldPlan.unit !== updated.unit) changes.push(\`ĐVT: "\${oldPlan.unit || ''}" -> "\${updated.unit || ''}"\`);
            if (oldPlan.unitPrice !== updated.unitPrice) changes.push(\`Đơn giá: "\${oldPlan.unitPrice || ''}" -> "\${updated.unitPrice || ''}"\`);
            if (oldPlan.notes !== updated.notes) changes.push(\`Ghi chú: "\${oldPlan.notes || ''}" -> "\${updated.notes || ''}"\`);
          }
          const detailStr = changes.length > 0 ? \` |Detail:Dự án \${updated.projectCode}, Đầu mục \${updated.stt}: \${changes.join(', ')}\` : '';
          
          get().logActivity('Cập nhật Mua hàng nhà thầu: ' + (updated.content || id) + detailStr, updated.projectCode || 'COMPANY');`;
});

if (success) {
  fs.writeFileSync(path, content, 'utf8');
  console.log('Patched updatePurchasingPlan');
} else {
  console.log('Regex failed');
}
