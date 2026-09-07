const extractLeadingRomanNumber = (text) => {
  const match = text.trim().match(/^([IVXLCDM]+)(?:[\s.)-]|$)/i);
  if (!match) return null;
  const roman = match[1].toUpperCase();
  return roman;
};

const sttSortParts = (value) => {
  const text = String(value || '').trim();
  if (!text) return [Number.POSITIVE_INFINITY];
  const parts = text.match(/\d+/g)?.map((part) => Number.parseInt(part, 10)) || [];
  return parts.length ? parts : [Number.POSITIVE_INFINITY];
};

const compareTaskStt = (a, b) => {
  const textA = String(a || '').trim();
  const textB = String(b || '').trim();
  
  const left = sttSortParts(textA);
  const right = sttSortParts(textB);
  console.log('left parts:', textA, left);
  console.log('right parts:', textB, right);
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    if (leftValue !== rightValue) return leftValue - rightValue;
  }
  return textA.localeCompare(textB, 'vi', { numeric: true, sensitivity: 'base' });
};

console.log('Compare 34 vs A:', compareTaskStt('34', 'A'));
