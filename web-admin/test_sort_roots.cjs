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
  
  const isLetterA = /^[A-Z]{1,2}$/i.test(textA);
  const isLetterB = /^[A-Z]{1,2}$/i.test(textB);

  const romanA = extractLeadingRomanNumber(textA);
  const romanB = extractLeadingRomanNumber(textB);

  if (isLetterA && isLetterB) return textA.localeCompare(textB, 'en', { sensitivity: 'base' });
  if (isLetterA && !isLetterB) return -1;
  if (!isLetterA && isLetterB) return 1;
  
  if (romanA !== null && romanB !== null) {
    if (romanA !== romanB) return romanA - romanB;
  } else if (romanA !== null && romanB === null) {
    return -1;
  } else if (romanA === null && romanB !== null) {
    return 1;
  }

  const left = sttSortParts(textA);
  const right = sttSortParts(textB);
  const max = Math.max(left.length, right.length);
  for (let index = 0; index < max; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    if (leftValue !== rightValue) return leftValue - rightValue;
  }
  return textA.localeCompare(textB, 'vi', { numeric: true, sensitivity: 'base' });
};

const roots = ['A', 'B', '34', '35', '37'];
roots.sort(compareTaskStt);
console.log('Roots after sort:', roots);
