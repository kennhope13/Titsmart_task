const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add States
const stateInsert = `  const [subTab, setSubTab] = useState<'TECH' | 'ORDER' | 'DOCS'>('TECH');
  const [filterParent, setFilterParent] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterProgress, setFilterProgress] = useState('all');
  const [filterOrder, setFilterOrder] = useState('all');
  const [filterConstruction, setFilterConstruction] = useState('all');

  const parentOptions = useMemo(() => {
    const parents = data.filter(p => {
      const stt = String(p.stt || '').trim();
      const notes = String(p.notes || '').toLowerCase();
      return notes.includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(stt);
    });
    return [{ id: 'all', label: 'Tất cả' }, ...parents.map(p => ({ id: p.id, label: p.jobContent }))];
  }, [data]);
  
  const unitOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.unit).filter(Boolean)))], [data]);
  const progressOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.progressStatus).filter(Boolean)))], [data]);
  const orderOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.orderedStatus).filter(Boolean)))], [data]);
  const constructionOptions = useMemo(() => ['all', ...Array.from(new Set(data.map(p => p.techSpecStatus).filter(Boolean)))], [data]);
`;
content = content.replace(/  const \[subTab, setSubTab\] = useState<'TECH' \| 'ORDER' \| 'DOCS'>\('TECH'\);/g, stateInsert);

// 2. Add Toolbar UI
const toolbarUI = `      <div className="flex flex-col border-b border-slate-200 sticky top-0 z-10 bg-slate-50">
        <div className="flex px-4 gap-4 border-b border-slate-200">
          <button
            onClick={() => setSubTab('TECH')}
            className={\`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap \${subTab === 'TECH' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}\`}
          >
            Kỹ thuật & tiến độ
          </button>
          <button
            onClick={() => setSubTab('ORDER')}
            className={\`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap \${subTab === 'ORDER' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}\`}
          >
            Đặt hàng & vướng mắc
          </button>
          <button
            onClick={() => setSubTab('DOCS')}
            className={\`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap \${subTab === 'DOCS' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}\`}
          >
            Chứng từ & giao hàng
          </button>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-white text-xs text-slate-600 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-slate-500 whitespace-nowrap">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
            Lọc chi tiết:
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select value={filterParent} onChange={e => setFilterParent(e.target.value)} className="appearance-none border border-slate-200 rounded px-2.5 py-1.5 pr-7 bg-white hover:border-slate-300 focus:outline-primary min-w-[140px] truncate max-w-[200px]">
                {parentOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.id === 'all' ? 'Dau muc cha: Tat ca' : opt.label}</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-base absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
            </div>
            
            <div className="relative">
              <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className="appearance-none border border-slate-200 rounded px-2.5 py-1.5 pr-7 bg-white hover:border-slate-300 focus:outline-primary min-w-[120px]">
                {unitOptions.map(opt => (
                  <option key={opt} value={opt}>{opt === 'all' ? 'ĐVT: Tất cả' : opt}</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-base absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
            </div>

            <div className="relative">
              <select value={filterProgress} onChange={e => setFilterProgress(e.target.value)} className="appearance-none border border-slate-200 rounded px-2.5 py-1.5 pr-7 bg-white hover:border-slate-300 focus:outline-primary min-w-[120px]">
                {progressOptions.map(opt => (
                  <option key={opt} value={opt}>{opt === 'all' ? 'Tien do: Tat ca' : opt}</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-base absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
            </div>

            <div className="relative">
              <select value={filterOrder} onChange={e => setFilterOrder(e.target.value)} className="appearance-none border border-slate-200 rounded px-2.5 py-1.5 pr-7 bg-white hover:border-slate-300 focus:outline-primary min-w-[120px]">
                {orderOptions.map(opt => (
                  <option key={opt} value={opt}>{opt === 'all' ? 'Mua hang: Tat ca' : opt}</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-base absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
            </div>

            <div className="relative">
              <select value={filterConstruction} onChange={e => setFilterConstruction(e.target.value)} className="appearance-none border border-slate-200 rounded px-2.5 py-1.5 pr-7 bg-white hover:border-slate-300 focus:outline-primary min-w-[120px]">
                {constructionOptions.map(opt => (
                  <option key={opt} value={opt}>{opt === 'all' ? 'Thi cong: Tat ca' : opt}</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-base absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
            </div>
          </div>
        </div>
      </div>
`;

content = content.replace(
  /<div className="flex border-b border-slate-200 px-4 bg-slate-50 gap-4 sticky top-0 z-10">[\s\S]*?<\/div>\s*<div className="w-full max-w-full min-h-0 flex-1 overflow-x-auto custom-scrollbar">/m,
  toolbarUI + '\n      <div className="w-full max-w-full min-h-0 flex-1 overflow-x-auto custom-scrollbar">'
);

// 3. Add Filter execution logic
const filterExecution = `
    const resolveParentId = (plan: ProjectMaterialPlan): string | undefined => {
      if (plan.stt && plan.stt.includes('.')) {
        const parts = plan.stt.split('.');
        parts.pop();
        const parentStt = parts.join('.');
        const parentItem = filtered.find(r => r.stt === parentStt);
        if (parentItem) return parentItem.id;
      }
      return plan.parentId;
    };

    if (filterParent !== 'all') {
      filtered = filtered.filter(p => {
        if (p.id === filterParent) return true;
        let currentParentId = resolveParentId(p);
        let safety = 0;
        while (currentParentId && safety < 100) {
          safety++;
          if (currentParentId === filterParent) return true;
          const parentItem = data.find(x => x.id === currentParentId);
          currentParentId = parentItem ? (parentItem.parentId || undefined) : undefined;
        }
        return false;
      });
    }
    if (filterUnit !== 'all') {
      filtered = filtered.filter(p => p.unit === filterUnit || isParentRow(p));
    }
    if (filterProgress !== 'all') {
      filtered = filtered.filter(p => p.progressStatus === filterProgress || isParentRow(p));
    }
    if (filterOrder !== 'all') {
      filtered = filtered.filter(p => p.orderedStatus === filterOrder || isParentRow(p));
    }
    if (filterConstruction !== 'all') {
      filtered = filtered.filter(p => p.techSpecStatus === filterConstruction || isParentRow(p));
    }
`;

content = content.replace(
  /    const resolveParentId = \(plan: ProjectMaterialPlan\): string \| undefined => \{[\s\S]*?return plan.parentId;\s*\};/m,
  filterExecution
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched MaterialPlanTab.tsx completely');
