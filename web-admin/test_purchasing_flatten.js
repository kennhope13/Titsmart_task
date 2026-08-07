
const data = [
  { id: '1', stt: 'I', notes: '[section] | [owner] | [order:00150]' },
  { id: '2', stt: 'II', notes: '[section] | [contractor] | [order:00151]' },
  { id: '4', stt: '4.19.1', notes: '[contractor] | [order:00153]' }
];
const isSectionRow = (pur) => String(pur.notes || '').toLowerCase().includes('[section]') || /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX)$/i.test(String(pur.stt || '').trim());
const orderTagValue = (notes) => { const m = String(notes || '').match(/\[order:([\d.]+)\]/); return m ? parseFloat(m[1]) : null; };
const originalOrderMap = new Map(data.map((r, i) => [r.id, orderTagValue(r.notes) ?? (1000000 - i)]));

const groups = {};
const order = [];
let currentSectionKey = '__orphaned__';
data.forEach(t => {
  if (isSectionRow(t)) {
    currentSectionKey = t.id;
    if (!groups[currentSectionKey]) { groups[currentSectionKey] = []; order.push(currentSectionKey); }
    groups[currentSectionKey].unshift({ ...t, _isHeader: true });
  } else {
    let targetSection = currentSectionKey;
    if (t.parentId && groups[t.parentId]) { targetSection = t.parentId; }
    if (!groups[targetSection]) { groups[targetSection] = []; order.push(targetSection); }
    groups[targetSection].push({ ...t, _isHeader: false });
  }
});

const flattened = [];
const flattenTree = (nodes, depth, parentStt = '', secKey = '') => {
  nodes.forEach((node, index) => {
    let computedStt = node.stt || '';
    flattened.push({ ...node, depth, computedStt, isSec: false, _sectionKey: secKey });
    if (node.children) flattenTree(node.children, depth + 1, computedStt, secKey);
  });
};

order.forEach(secKey => {
  const items = groups[secKey].filter(t => !t._isHeader);
  const sectionHeader = groups[secKey].find(t => t._isHeader);
  const map = new Map();
  const roots = [];
  items.forEach(t => map.set(t.id, { ...t, children: [] }));
  items.forEach(t => {
    if (t.parentId && t.parentId !== secKey && map.has(t.parentId)) { map.get(t.parentId).children.push(map.get(t.id)); } else { roots.push(map.get(t.id)); }
  });
  if (sectionHeader) flattened.push({ ...sectionHeader, depth: 0, computedStt: sectionHeader.stt, isSec: true, _sectionKey: secKey });
  flattenTree(roots, sectionHeader ? 1 : 0, '', secKey);
});

console.log('flattened:', flattened.map(f => f.stt + ' (secKey: ' + f._sectionKey + ')'));

