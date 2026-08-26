const fs = require('fs');
let code = fs.readFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', 'utf8');

// The file currently has a corrupted MultiDocSelect component. 
// We will replace everything from 'const MultiDocSelect = ' down to 'export const MaterialAndPurchasingTab'

const startTarget = 'const MultiDocSelect = ({ plan, onBadgeClick, disabled }';
let startIndex = code.indexOf(startTarget);
if (startIndex === -1) {
  startIndex = code.indexOf('const MultiDocSelect = ({ plan, onUpdate, disabled }');
}

const endIndex = code.indexOf('export const MaterialAndPurchasingTab: React.FC<MaterialAndPurchasingTabProps> =');

if (startIndex !== -1 && endIndex !== -1) {
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
          <div className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 group-hover/docs:text-slate-600 transition-colors">
            <div className="p-0.5 hover:bg-slate-200 rounded flex items-center justify-center">
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
};

`;

  const oldChunk = code.substring(startIndex, endIndex);
  code = code.replace(oldChunk, newMultiDocSelectStr);
  fs.writeFileSync('web-admin/src/pages/cost-plan/MaterialAndPurchasingTab.tsx', code);
  console.log("Successfully fixed corrupted MultiDocSelect");
} else {
  console.log("Could not find bounds");
}
