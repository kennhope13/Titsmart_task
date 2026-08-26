const fs = require('fs');

// PATCH FAST DOC MODAL
let fastDocModal = fs.readFileSync('web-admin/src/pages/cost-plan/FastDocModal.tsx', 'utf8');

// 1. Interface
fastDocModal = fastDocModal.replace(
  `docType: 'CO' | 'CQ' | 'PCCC' | 'STAMP';`,
  `docType: string;`
);

// 2. Matching logic in useEffect
const useEffectMatch = `(docType === 'STAMP' && (lowerText.includes('tem') || lowerText.includes('kim \`<nh') || lowerText.includes('stamp') || lowerText.includes('tkd')))`;
const useEffectMatchFallback = `(docType === 'STAMP' && (lowerText.includes('tem') || lowerText.includes('kiểm định') || lowerText.includes('stamp') || lowerText.includes('tkd')))`;
const customMatch = ` || (!['CO', 'CQ', 'PCCC', 'STAMP'].includes(docType) && d.text === docType)`;

if (fastDocModal.includes(useEffectMatch)) {
  fastDocModal = fastDocModal.replace(useEffectMatch, useEffectMatch + customMatch);
} else if (fastDocModal.includes(useEffectMatchFallback)) {
  fastDocModal = fastDocModal.replace(useEffectMatchFallback, useEffectMatchFallback + customMatch);
} else {
  // Try regex replace for matching block in useEffect and handleSubmit
  fastDocModal = fastDocModal.replace(/\|\| lowerText\.includes\('tkd'\)\)\)/g, "|| lowerText.includes('tkd'))) || (!['CO', 'CQ', 'PCCC', 'STAMP'].includes(docType) && d.text === docType)");
}

// 3. Fallback logic in useEffect
const fallbackText = `if (docType === 'STAMP') setText('TKD: ');`;
const customFallback = `if (docType === 'STAMP') setText('TKD: ');
      if (!['CO', 'CQ', 'PCCC', 'STAMP'].includes(docType)) setText(docType);`;
fastDocModal = fastDocModal.replace(fallbackText, customFallback);

fs.writeFileSync('web-admin/src/pages/cost-plan/FastDocModal.tsx', fastDocModal);
console.log('[1] Patched FastDocModal.tsx');


// PATCH MATERIAL AND PURCHASING TAB
let materialTab = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// 1. Add getCustomDocs helper
const renderAutoStart = `const renderAutoFilesByType = (plan: ProjectMaterialPlan, type:`;
const getCustomDocsHelper = `const getCustomDocs = (plan: ProjectMaterialPlan): string[] => {
  if (!plan.issueContent || !plan.issueContent.includes('[DOC-DATA]')) return [];
  try {
    const models = decodeModels(plan.issueContent);
    const customTypes = new Set<string>();
    models.forEach(m => {
      m.docs.forEach(d => {
        if (!d.fileUrls || d.fileUrls.length === 0) return;
        const lower = (d.text || '').toLowerCase();
        const isCO = lower.includes('co') || lower.includes('c/o');
        const isCQ = lower.includes('cq') || lower.includes('c/q');
        const isPCCC = lower.includes('pccc') || lower.includes('ph\u00f2ng ch\u00e1y');
        const isSTAMP = lower.includes('tem') || lower.includes('ki\u1ec3m \u0111\u1ecbnh') || lower.includes('stamp') || lower.includes('tkd');
        if (!isCO && !isCQ && !isPCCC && !isSTAMP && d.text) {
          customTypes.add(d.text);
        }
      });
    });
    return Array.from(customTypes);
  } catch { return []; }
};

`;
if (!materialTab.includes('getCustomDocs = ')) {
  materialTab = materialTab.replace(renderAutoStart, getCustomDocsHelper + renderAutoStart);
}

// 2. Change renderAutoFilesByType signature and logic
materialTab = materialTab.replace(
  `type: 'CO' | 'CQ' | 'PCCC' | 'STAMP',`,
  `type: string,`
);

const matchLogic = `else if (type === 'STAMP' && (lower.includes('tem') || lower.includes('ki?m d?nh') || lower.includes('kiểm định') || lower.includes('stamp') || lower.includes('tkd'))) docTypeMatches = true;`;
const customMatchLogic = `else if (!['CO', 'CQ', 'PCCC', 'STAMP'].includes(type) && d.text === type) docTypeMatches = true;`;
// Wait, regex might be safer to append to the STAMP condition
materialTab = materialTab.replace(
  /else if \(type === 'STAMP'.*?docTypeMatches = true;/g,
  `$&
        else if (!['CO', 'CQ', 'PCCC', 'STAMP'].includes(type) && d.text === type) docTypeMatches = true;`
);

// 3. MultiDocSelect props
materialTab = materialTab.replace(
  `onBadgeClick: (plan: any, type: 'CO'|'CQ'|'PCCC'|'STAMP') => void`,
  `onBadgeClick: (plan: any, type: string) => void`
);
materialTab = materialTab.replace(
  `handleOptionClick = (type: 'CO'|'CQ'|'PCCC'|'STAMP') => {`,
  `handleOptionClick = (type: string) => {`
);

// 4. MultiDocSelect render custom docs
const emptyCheck = `{!plan.docCo && !plan.docCq && !plan.docFireInspection && !hasDocFiles(plan, 'STAMP') && (`;
const renderCustomDocs = `
        {getCustomDocs(plan).map(customType => (
          <div key={customType} className="flex flex-col items-center gap-1">
            <button type="button" onClick={(e) => { e.stopPropagation(); onBadgeClick(plan, customType); }} className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 cursor-pointer transition max-w-[60px] truncate" title={customType}>{customType}</button>
            {renderAutoFilesByType(plan, customType, onFileClick)}
          </div>
        ))}
        
        {!plan.docCo && !plan.docCq && !plan.docFireInspection && !hasDocFiles(plan, 'STAMP') && getCustomDocs(plan).length === 0 && (`;
materialTab = materialTab.replace(emptyCheck, renderCustomDocs);

// 5. Change "THÊM CHỨNG TỪ" to input
const oldHeader = `<div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">Th\u00eam ch\u1ee9ng t\u1eeb</div>`;
const fallbackHeader = `<div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">ThAm chcng t</div>`;
const newHeader = `<div className="px-2 py-1.5 border-b border-slate-100 mb-1">
            <input
              type="text"
              placeholder="Nhập tên chứng từ..."
              className="w-full text-xs px-2 py-1 border rounded focus:outline-none focus:border-primary"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  e.stopPropagation();
                  handleOptionClick(e.currentTarget.value.trim());
                }
              }}
            />
          </div>`;
if (materialTab.includes(oldHeader)) {
  materialTab = materialTab.replace(oldHeader, newHeader);
} else if (materialTab.includes(fallbackHeader)) {
  materialTab = materialTab.replace(fallbackHeader, newHeader);
} else {
  // Regex fallback
  materialTab = materialTab.replace(/<div className="px-3 py-1 text-\[10px\] font-bold text-slate-400 uppercase">.*?<\/div>/, newHeader);
}

// 6. FastDocType state
materialTab = materialTab.replace(
  `const [fastDocType, setFastDocType] = useState<'CO'|'CQ'|'PCCC'|'STAMP'|null>(null);`,
  `const [fastDocType, setFastDocType] = useState<string | null>(null);`
);

// 7. handleDocBadgeClick signature
materialTab = materialTab.replace(
  `const handleDocBadgeClick = (plan: any, type: 'CO'|'CQ'|'PCCC'|'STAMP') => {`,
  `const handleDocBadgeClick = (plan: any, type: string) => {`
);

// 8. handleDeleteDoc signature and logic
materialTab = materialTab.replace(
  `const handleDeleteDoc = (planId: string, docType: 'CO'|'CQ'|'PCCC'|'STAMP') => {`,
  `const handleDeleteDoc = (planId: string, docType: string) => {`
);

materialTab = materialTab.replace(
  /if \(docType === 'STAMP'.*?return false;/g,
  `$&
        if (!['CO', 'CQ', 'PCCC', 'STAMP'].includes(docType) && d.text === docType) return false;`
);


fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', materialTab);
console.log('[2] Patched MaterialAndPurchasingTab.tsx');
