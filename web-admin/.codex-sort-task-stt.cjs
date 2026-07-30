const fs = require('fs');
const p = 'src/pages/TaskManagementPage.tsx';
let s = fs.readFileSync(p, 'utf8');
const helperMarker = `const calculateAutoProgressPercent = (purchaseStatus?: string, constrStatus?: string) =>
  Math.round((purchaseProgressScore(purchaseStatus) * 0.5 + constructionProgressScore(constrStatus) * 0.5) * 100);

`;
const helper = `const calculateAutoProgressPercent = (purchaseStatus?: string, constrStatus?: string) =>
  Math.round((purchaseProgressScore(purchaseStatus) * 0.5 + constructionProgressScore(constrStatus) * 0.5) * 100);

const sttSortParts = (value?: string) => {
  const text = String(value || '').trim();
  if (!text) return [Number.POSITIVE_INFINITY];
  const parts = text.match(/\d+/g)?.map((part) => Number.parseInt(part, 10)) || [];
  return parts.length ? parts : [Number.POSITIVE_INFINITY];
};

const compareTaskStt = (a?: string, b?: string) => {
  const left = sttSortParts(a);
  const right = sttSortParts(b);
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    if (leftValue !== rightValue) return leftValue - rightValue;
  }
  return String(a || '').localeCompare(String(b || ''), 'vi', { numeric: true, sensitivity: 'base' });
};

`;
if (!s.includes(helperMarker)) throw new Error('helper marker not found');
s = s.replace(helperMarker, helper);
const oldGrouped = `  const groupedTasks = React.useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    const order: string[] = [];
    displayTasks.forEach((t) => {
      const sec = t.sectionName || 'Khác';
      if (!groups[sec]) {
        groups[sec] = [];
        order.push(sec);
      }
      groups[sec].push(t);
    });
    
    const flattened: Task[] = [];
    order.forEach((sec) => {
      groups[sec].sort((a, b) => {
        if (a.isSectionHeader && !b.isSectionHeader) return -1;
        if (!a.isSectionHeader && b.isSectionHeader) return 1;
        return 0;
      });
      flattened.push(...groups[sec]);
    });
    return flattened;
  }, [displayTasks]);`;
const newGrouped = `  const groupedTasks = React.useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    const order: string[] = [];
    displayTasks.forEach((t) => {
      const sec = t.sectionName || 'Khác';
      if (!groups[sec]) {
        groups[sec] = [];
        order.push(sec);
      }
      groups[sec].push(t);
    });

    order.sort((a, b) => {
      const leftHeader = groups[a].find((task) => task.isSectionHeader) || groups[a][0];
      const rightHeader = groups[b].find((task) => task.isSectionHeader) || groups[b][0];
      return compareTaskStt(leftHeader?.stt, rightHeader?.stt);
    });

    const flattened: Task[] = [];
    order.forEach((sec) => {
      groups[sec].sort((a, b) => {
        const sttCompare = compareTaskStt(a.stt, b.stt);
        if (sttCompare !== 0) return sttCompare;
        if (a.isSectionHeader && !b.isSectionHeader) return -1;
        if (!a.isSectionHeader && b.isSectionHeader) return 1;
        return a.name.localeCompare(b.name, 'vi', { numeric: true, sensitivity: 'base' });
      });
      flattened.push(...groups[sec]);
    });
    return flattened;
  }, [displayTasks]);`;
if (!s.includes(oldGrouped)) throw new Error('grouped block not found');
s = s.replace(oldGrouped, newGrouped);
fs.writeFileSync(p, s, 'utf8');
