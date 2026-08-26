const fs = require('fs');

// =============================================
// PATCH 1: FastDocModal - add onDelete prop and delete button
// =============================================
const fastDocFile = 'web-admin/src/pages/cost-plan/FastDocModal.tsx';
let fastDoc = fs.readFileSync(fastDocFile, 'utf8');

// Add onDelete to interface
fastDoc = fastDoc.replace(
  `onSubmit: (newModels: ModelEntry[]) => void;\n}`,
  `onSubmit: (newModels: ModelEntry[]) => void;\n  onDelete?: () => void;\n}`
);

// Add onDelete to destructured props
fastDoc = fastDoc.replace(
  `({ title, docType, initialModels, onClose, onSubmit })`,
  `({ title, docType, initialModels, onClose, onSubmit, onDelete })`
);

// Add delete button before Hủy button
const cancelBtn = `            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"
            >
              H\u1EE7y
            </button>`;

const deleteAndCancelBtn = `            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="rounded-lg px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                X\u00f3a ch\u1ee9ng t\u1eeb
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 transition"
            >
              H\u1EE7y
            </button>`;

fastDoc = fastDoc.replace(cancelBtn, deleteAndCancelBtn);

fs.writeFileSync(fastDocFile, fastDoc);
console.log('[1] Patched FastDocModal with onDelete');

// =============================================
// PATCH 2: MaterialAndPurchasingTab - make badges clickable to edit
// =============================================
const matFile = 'web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx';
let mat = fs.readFileSync(matFile, 'utf8');

// Replace badge spans with clickable buttons that call onBadgeClick
// CO badge
mat = mat.replace(
  `{plan.docCo && (
          <div className="flex flex-col items-center gap-1">
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">CO</span>`,
  `{plan.docCo && (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={(e) => { e.stopPropagation(); onBadgeClick(plan, 'CO'); }} className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 cursor-pointer transition">CO</button>`
);

// CQ badge
mat = mat.replace(
  `{plan.docCq && (
          <div className="flex flex-col items-center gap-1">
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">CQ</span>`,
  `{plan.docCq && (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={(e) => { e.stopPropagation(); onBadgeClick(plan, 'CQ'); }} className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 cursor-pointer transition">CQ</button>`
);

// PCCC badge
mat = mat.replace(
  `{plan.docFireInspection && (
          <div className="flex flex-col items-center gap-1">
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">PCCC</span>`,
  `{plan.docFireInspection && (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={(e) => { e.stopPropagation(); onBadgeClick(plan, 'PCCC'); }} className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 cursor-pointer transition">PCCC</button>`
);

// TKD badge
mat = mat.replace(
  `{hasDocFiles(plan, 'STAMP') && (
          <div className="flex flex-col items-center gap-1">
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">TKD</span>`,
  `{hasDocFiles(plan, 'STAMP') && (
          <div className="flex flex-col items-center gap-1">
            <button type="button" onClick={(e) => { e.stopPropagation(); onBadgeClick(plan, 'STAMP'); }} className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 cursor-pointer transition">TKD</button>`
);

// Add handleDeleteDoc function and pass onDelete to FastDocModal
// Find handleDocBadgeClick and add handleDeleteDoc after it
const handleDocBadge = `const handleDocBadgeClick = (plan: any, type: 'CO'|'CQ'|'PCCC'|'STAMP') => {`;
const handleDocBadgeAndDelete = `const handleDeleteDoc = (planId: string, docType: 'CO'|'CQ'|'PCCC'|'STAMP') => {
    const plan = data.find(p => p.id === planId);
    if (!plan) return;
    const models = decodeModels(plan.issueContent);
    // Remove all docs matching this type
    const newModels = models.map(m => ({
      ...m,
      docs: m.docs.filter(d => {
        const lower = (d.text || '').toLowerCase();
        if (docType === 'CO' && (lower.includes('co') || lower.includes('c/o'))) return false;
        if (docType === 'CQ' && (lower.includes('cq') || lower.includes('c/q'))) return false;
        if (docType === 'PCCC' && (lower.includes('pccc') || lower.includes('ph\u00f2ng ch\u00e1y'))) return false;
        if (docType === 'STAMP' && (lower.includes('tem') || lower.includes('ki\u1ec3m \u0111\u1ecbnh') || lower.includes('stamp') || lower.includes('tkd'))) return false;
        return true;
      })
    }));
    handleFastDocSubmit(newModels);
    setFastDocType(null);
  };

  const handleDocBadgeClick = (plan: any, type: 'CO'|'CQ'|'PCCC'|'STAMP') => {`;

mat = mat.replace(handleDocBadge, handleDocBadgeAndDelete);

// Pass onDelete to FastDocModal
mat = mat.replace(
  `onSubmit={handleFastDocSubmit}
        />`,
  `onSubmit={handleFastDocSubmit}
          onDelete={() => docModalPlanId && fastDocType && handleDeleteDoc(docModalPlanId, fastDocType)}
        />`
);

fs.writeFileSync(matFile, mat);
console.log('[2] Patched MaterialAndPurchasingTab with clickable badges and delete');

console.log('All done!');
