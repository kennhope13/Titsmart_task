
const romanToInt = (s) => {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const upper = String(s).toUpperCase();
  let total = 0;
  for (let i = 0; i < upper.length; i++) {
    const curr = map[upper[i]] || 0;
    const next = map[upper[i + 1]] || 0;
    if (curr < next) { total -= curr; } else { total += curr; }
  }
  return total;
};

const isSectionRow = (pur) => String(pur.notes || '').toLowerCase().includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(pur.stt || '').trim());

const numericSttParts = (stt) => {
  return String(stt || '').split('.').map(s => {
    const num = parseInt(s, 10);
    return isNaN(num) ? s : num;
  });
};

const data = [
  { id: '1', stt: 'I', notes: '[section] | [owner] | [order:00150]' },
  { id: '2', stt: 'II', notes: '[section] | [contractor] | [order:00151]' },
  { id: '3', stt: '4.19', notes: '[contractor] | [order:00152]' },
  { id: '4', stt: '4.19.1', notes: '[contractor] | [order:00153]' }
];

const sectionSortKey = (r) => {
  const stt = String(r.stt || '').trim();
  if (/^[IVXLCDM]+$/i.test(stt)) return [0, romanToInt(stt)];
  return [1, ...numericSttParts(stt)];
};

const sectionOrder = new Map();
[...data]
  .filter(r => isSectionRow(r))
  .sort((a, b) => {
    const ka = sectionSortKey(a), kb = sectionSortKey(b);
    for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
      const diff = (ka[i] ?? Infinity) - (kb[i] ?? Infinity);
      if (diff !== 0) return diff;
    }
    return 0;
  })
  .forEach((r, i) => sectionOrder.set(r.id, i));

const orderTagValue = (notes) => {
  const m = String(notes || '').match(/\[order:([\d.]+)\]/);
  return m ? parseFloat(m[1]) : null;
};
const originalOrderMap = new Map(data.map((r, i) => [r.id, orderTagValue(r.notes) ?? (1000000 - i)]));

const getSectionIndexForItem = (pur, visited = new Set()) => {
  if (isSectionRow(pur)) return sectionOrder.get(pur.id) ?? Infinity;
  
  if (pur.parentId) {
    if (sectionOrder.has(pur.parentId)) return sectionOrder.get(pur.parentId);
  }
  
  const hasOrderTag = /\[order:([\d.]+)\]/.test(String(pur.notes || ''));
  if (!hasOrderTag) return Infinity;

  const myPos = originalOrderMap.get(pur.id) ?? Infinity;
  let bestSecIdx = Infinity;
  let bestSecPos = -1;
  data.forEach(r => {
    if (isSectionRow(r)) {
      const secPos = originalOrderMap.get(r.id) ?? Infinity;
      if (secPos <= myPos && secPos > bestSecPos) {
        bestSecPos = secPos;
        bestSecIdx = sectionOrder.get(r.id) ?? -1;
      }
    }
  });
  return bestSecIdx === -1 ? Infinity : bestSecIdx;
};

const filteredData = [...data].sort((a, b) => {
    const secA = getSectionIndexForItem(a);
    const secB = getSectionIndexForItem(b);
    if (secA !== secB) return secA - secB;
    
    const aIsSec = isSectionRow(a) ? 0 : 1;
    const bIsSec = isSectionRow(b) ? 0 : 1;
    if (aIsSec !== bIsSec) return aIsSec - bIsSec;
    
    const ap = numericSttParts(a.stt), bp = numericSttParts(b.stt);
    for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
      const diff = (ap[i] ?? Infinity) - (bp[i] ?? Infinity);
      if (diff !== 0) return diff;
    }
    return 0;
});

console.log('originalOrderMap:', originalOrderMap);
console.log('sectionOrder:', sectionOrder);
data.forEach(d => console.log('getSectionIndexForItem', d.stt, getSectionIndexForItem(d)));
console.log('filteredData order:', filteredData.map(d => d.stt));

