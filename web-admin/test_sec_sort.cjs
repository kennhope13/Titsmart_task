const romanToInt = (s) => {
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const upper = s.toUpperCase();
  let total = 0;
  for (let i = 0; i < upper.length; i++) {
    const cur = map[upper[i]] ?? 0;
    const nxt = map[upper[i + 1]] ?? 0;
    total += cur < nxt ? -cur : cur;
  }
  return total;
};

const numericSttParts = (stt) => {
  const text = String(stt || '').trim();
  if (!text) return [Infinity];
  return text.split(/[.\-]/).map(p => { const n = parseInt(p, 10); return isNaN(n) ? Infinity : n; });
};

const sectionSortKey = (r) => {
  const stt = String(r.stt || '').trim();
  const isLetter = /^[A-Z]{1,2}$/i.test(stt);
  if (isLetter) return [0, stt.charCodeAt(0)];
  if (/^[IVXLCDM]+$/i.test(stt)) return [1, romanToInt(stt)];
  return [2, ...numericSttParts(stt)];
};

const secs = [{ stt: 'A' }, { stt: '34' }, { stt: '35' }, { stt: 'B' }, { stt: '37' }];
secs.sort((a, b) => {
  const ka = sectionSortKey(a), kb = sectionSortKey(b);
  for (let i = 0; i < Math.max(ka.length, kb.length); i++) {
    const diff = (ka[i] ?? Infinity) - (kb[i] ?? Infinity);
    if (diff !== 0) return diff;
  }
  return 0;
});
console.log('Secs sorted:', secs.map(s => s.stt));
