const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// First remove the old group-hover dropdown logic
const oldDocs = `{/* Dropdown Menu Toggle */}
                                  {userRole !== 'engineer' && (
                                    <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/docs:opacity-100 transition-opacity">
                                      <div className="relative group/dropdown">
                                        <button type="button" className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 flex items-center justify-center border border-slate-200 bg-white shadow-sm">
                                          <span className="material-symbols-outlined text-[14px]">arrow_drop_down</span>
                                        </button>
                                        <div className="absolute top-full right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 hidden group-hover/dropdown:block z-50 text-left">
                                          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docCo} onChange={(e) => onUpdateMaterial(plan.id, { ...plan, docCo: e.target.checked })} />
                                            CO
                                          </label>
                                          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docCq} onChange={(e) => onUpdateMaterial(plan.id, { ...plan, docCq: e.target.checked })} />
                                            CQ
                                          </label>
                                          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docFireInspection} onChange={(e) => onUpdateMaterial(plan.id, { ...plan, docFireInspection: e.target.checked })} />
                                            PCCC
                                          </label>
                                          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700">
                                            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docStamp} onChange={(e) => onUpdateMaterial(plan.id, { ...plan, docStamp: e.target.checked })} />
                                            Tem kiểm định
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                  )}`;

if (code.includes(oldDocs)) {
  code = code.replace(oldDocs, '');
} else {
  console.log("Could not find old docs logic");
}

// Add MultiDocSelect component
const multiDocSelectComp = `
const MultiDocSelect = ({ plan, onUpdate, disabled }: { plan: any, onUpdate: (id: string, data: any) => void, disabled: boolean }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full h-full" ref={containerRef}>
      <div 
        className={\`flex flex-row flex-wrap gap-x-2 gap-y-2 p-1.5 w-full items-center justify-center min-h-[34px] h-full \${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-slate-50'}\`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {plan.docCo && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">CO</span>
        )}
        {plan.docCq && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">CQ</span>
        )}
        {plan.docFireInspection && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">PCCC</span>
        )}
        {plan.docStamp && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">Tem KĐ</span>
        )}
        {!plan.docCo && !plan.docCq && !plan.docFireInspection && !plan.docStamp && (
          <span className="text-slate-400 text-xs italic">--</span>
        )}
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-36 bg-white rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.12)] border border-slate-200 py-1 z-50 text-left">
          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700" onClick={e => e.stopPropagation()}>
            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docCo} onChange={(e) => onUpdate(plan.id, { ...plan, docCo: e.target.checked })} />
            CO
          </label>
          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700" onClick={e => e.stopPropagation()}>
            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docCq} onChange={(e) => onUpdate(plan.id, { ...plan, docCq: e.target.checked })} />
            CQ
          </label>
          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700" onClick={e => e.stopPropagation()}>
            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docFireInspection} onChange={(e) => onUpdate(plan.id, { ...plan, docFireInspection: e.target.checked })} />
            PCCC
          </label>
          <label className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-xs font-bold text-slate-700" onClick={e => e.stopPropagation()}>
            <input type="checkbox" className="rounded border-slate-300 text-primary focus:ring-primary h-3 w-3" checked={!!plan.docStamp} onChange={(e) => onUpdate(plan.id, { ...plan, docStamp: e.target.checked })} />
            Tem kiểm định
          </label>
        </div>
      )}
    </div>
  );
};
`;

if (!code.includes('const MultiDocSelect')) {
  // Find where to inject it. Before MaterialAndPurchasingTab declaration.
  const injectTarget = 'export const MaterialAndPurchasingTab: React.FC<MaterialAndPurchasingTabProps> =';
  code = code.replace(injectTarget, multiDocSelectComp + '\n' + injectTarget);
}

// Replace the inside of the cell
const oldCellInner = `<div className="flex flex-row flex-wrap gap-x-2 gap-y-2 p-1.5 w-full items-center justify-center cursor-pointer min-h-[34px]">
                                  {plan.docCo && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">CO</span>
                                  )}
                                  {plan.docCq && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">CQ</span>
                                  )}
                                  {plan.docFireInspection && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">PCCC</span>
                                  )}
                                  {plan.docStamp && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded border bg-emerald-100 text-emerald-700 border-emerald-300">Tem KĐ</span>
                                  )}
                                  {!plan.docCo && !plan.docCq && !plan.docFireInspection && !plan.docStamp && (
                                    <span className="text-slate-400 text-xs italic group-hover/docs:opacity-0 transition-opacity">--</span>
                                  )}
                                  
                                  
                                </div>`;

const newCellInner = `<MultiDocSelect plan={plan} onUpdate={onUpdateMaterial} disabled={userRole === 'engineer'} />`;

if (code.includes(oldCellInner)) {
  code = code.replace(oldCellInner, newCellInner);
} else {
  console.log("Could not find inner cell to replace");
}

fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', code);
console.log('Done MultiDocSelect patch');
