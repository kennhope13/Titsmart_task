const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// 1. Update renderAutoFilesByType
const oldRenderAuto = `const renderAutoFilesByType = (plan: ProjectMaterialPlan, type: 'CO' | 'CQ' | 'PCCC') => {`;
const newRenderAuto = `const renderAutoFilesByType = (plan: ProjectMaterialPlan, type: 'CO' | 'CQ' | 'PCCC' | 'STAMP') => {`;
code = code.replace(oldRenderAuto, newRenderAuto);

const oldIfPccc = `else if (type === 'PCCC' && (lower.includes('pccc') || lower.includes('phòng cháy'))) docTypeMatches = true;`;
const newIfPccc = `else if (type === 'PCCC' && (lower.includes('pccc') || lower.includes('phòng cháy'))) docTypeMatches = true;
        else if (type === 'STAMP' && (lower.includes('tem') || lower.includes('kiểm định') || lower.includes('stamp'))) docTypeMatches = true;`;
code = code.replace(oldIfPccc, newIfPccc);

// 2. Update MultiDocSelect
const oldMultiDocSelectStart = `const MultiDocSelect = ({ plan, onUpdate, disabled }: { plan: any, onUpdate: (id: string, data: any) => void, disabled: boolean }) => {`;
const multiDocSelectEndStr = `};`;

let multiDocEndIdx = code.indexOf(multiDocSelectEndStr, code.indexOf(oldMultiDocSelectStart));
let oldMultiDocSelectStr = code.substring(code.indexOf(oldMultiDocSelectStart), multiDocEndIdx + 2);

const newMultiDocSelectStr = `const MultiDocSelect = ({ plan, onBadgeClick, disabled }: { plan: any, onBadgeClick: (plan: any, type: 'CO'|'CQ'|'PCCC'|'STAMP') => void, disabled: boolean }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOptionClick = (type: 'CO'|'CQ'|'PCCC'|'STAMP') => {
    setIsOpen(false);
    onBadgeClick(plan, type);
  };

  return (
    <div className="relative w-full h-full group/docs" ref={containerRef}>
      <div 
        className={\`flex flex-row flex-wrap gap-x-3 gap-y-2 p-1.5 pr-6 w-full items-start justify-center min-h-[34px] h-full \${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}\`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {plan.docCo && (
          <div className="flex flex-col items-center gap-1">
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">CO</span>
            {renderAutoFilesByType(plan, 'CO')}
          </div>
        )}
        {plan.docCq && (
          <div className="flex flex-col items-center gap-1">
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">CQ</span>
            {renderAutoFilesByType(plan, 'CQ')}
          </div>
        )}
        {plan.docFireInspection && (
          <div className="flex flex-col items-center gap-1">
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">PCCC</span>
            {renderAutoFilesByType(plan, 'PCCC')}
          </div>
        )}
        {plan.docStamp && (
          <div className="flex flex-col items-center gap-1">
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">Tem KĐ</span>
            {renderAutoFilesByType(plan, 'STAMP')}
          </div>
        )}
        {!plan.docCo && !plan.docCq && !plan.docFireInspection && !plan.docStamp && (
          <span className="text-slate-400 text-xs italic">--</span>
        )}

        {/* Dropdown Chevron */}
        {!disabled && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/docs:opacity-100 transition-opacity">
            <div className="p-0.5 hover:bg-slate-200 rounded text-slate-500 flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </div>
          </div>
        )}
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute top-full right-0 mt-1 w-36 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-50 text-left">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase">Thêm chứng từ</div>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleOptionClick('CO'); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs text-slate-700 text-left">
            <span className="material-symbols-outlined text-[14px] text-slate-400">upload_file</span> CO
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleOptionClick('CQ'); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs text-slate-700 text-left">
            <span className="material-symbols-outlined text-[14px] text-slate-400">upload_file</span> CQ
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleOptionClick('PCCC'); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs text-slate-700 text-left">
            <span className="material-symbols-outlined text-[14px] text-slate-400">upload_file</span> PCCC
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleOptionClick('STAMP'); }} className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs text-slate-700 text-left">
            <span className="material-symbols-outlined text-[14px] text-slate-400">upload_file</span> Tem kiểm định
          </button>
        </div>
      )}
    </div>
  );
};`;
code = code.replace(oldMultiDocSelectStr, newMultiDocSelectStr);

// 3. Update fastDocType state
const oldFastDocType = `const [fastDocType, setFastDocType] = useState<'CO'|'CQ'|'PCCC'|null>(null);`;
const newFastDocType = `const [fastDocType, setFastDocType] = useState<'CO'|'CQ'|'PCCC'|'STAMP'|null>(null);`;
code = code.replace(oldFastDocType, newFastDocType);

// 4. Update handleDocBadgeClick
const oldHandleBadge = `const handleDocBadgeClick = (plan: any, type: 'CO'|'CQ'|'PCCC') => {`;
const newHandleBadge = `const handleDocBadgeClick = (plan: any, type: 'CO'|'CQ'|'PCCC'|'STAMP') => {`;
code = code.replace(oldHandleBadge, newHandleBadge);

// 5. Update handleFastDocSubmit
const oldDocFire = `const docFireInspection = hasFileFor(['pccc', 'phòng cháy']);`;
const newDocFire = `const docFireInspection = hasFileFor(['pccc', 'phòng cháy']);
    const docStamp = hasFileFor(['tem', 'kiểm định', 'stamp']);`;
code = code.replace(oldDocFire, newDocFire);

const oldPayload = `docCo,
      docCq,
      docFireInspection,`;
const newPayload = `docCo,
      docCq,
      docFireInspection,
      docStamp,`;
code = code.replace(oldPayload, newPayload);

// 6. Update rendering inside table
const oldRenderMulti = `<MultiDocSelect plan={plan} onUpdate={onUpdateMaterial} disabled={userRole === 'engineer'} />`;
const newRenderMulti = `<MultiDocSelect plan={plan} onBadgeClick={handleDocBadgeClick} disabled={userRole === 'engineer'} />`;
if (code.includes(oldRenderMulti)) {
  code = code.replace(oldRenderMulti, newRenderMulti);
}

// 7. Update FastDocModal props in the JSX
const oldFastModalDocType = `docType={fastDocType}`;
const newFastModalDocType = `docType={fastDocType as any}`;
code = code.replace(oldFastModalDocType, newFastModalDocType);

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', code);
console.log("Successfully patched MaterialAndPurchasingTab");
