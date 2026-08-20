const fs = require('fs');
const path = 'web-admin/src/pages/cost-plan/MaterialPlanTab.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add State
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

// 2. Add Filtering Logic
const filterInsert = `    const resolveParentId = (plan: ProjectMaterialPlan): string | undefined => {
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
        while (currentParentId) {
          if (currentParentId === filterParent) return true;
          const parentItem = data.find(x => x.id === currentParentId);
          currentParentId = parentItem ? (parentItem.parentId || undefined) : undefined;
        }
        return false;
      });
    }
    if (filterUnit !== 'all') {
      filtered = filtered.filter(p => p.unit === filterUnit || (filterParent === 'all' && isParentRow(p)));
    }
    if (filterProgress !== 'all') {
      filtered = filtered.filter(p => p.progressStatus === filterProgress || (filterParent === 'all' && isParentRow(p)));
    }
    if (filterOrder !== 'all') {
      filtered = filtered.filter(p => p.orderedStatus === filterOrder || (filterParent === 'all' && isParentRow(p)));
    }
    if (filterConstruction !== 'all') {
      filtered = filtered.filter(p => p.techSpecStatus === filterConstruction || (filterParent === 'all' && isParentRow(p)));
    }
`;
// Need to insert this inside useMemo, right before romanToInt
content = content.replace(/    const romanToInt =/g, filterInsert + '\n    const romanToInt =');
// Wait, `resolveParentId` is already defined inside the useMemo!
// I must be careful not to redefine it, or I can redefine and remove the old one.`;

fs.writeFileSync(path, content, 'utf8');
console.log('Prepared to patch logic');
