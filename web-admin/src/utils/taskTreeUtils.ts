import { Task } from '../types';

export const toRoman = (num: number): string => {
  if (num <= 0) return 'I';
  const lookup: [string, number][] = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
  ];
  let roman = '';
  let n = num;
  for (const [letter, value] of lookup) {
    while (n >= value) {
      roman += letter;
      n -= value;
    }
  }
  return roman;
};

export const fromRoman = (roman: string): number => {
  const values: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };

  return roman
    .toUpperCase()
    .split('')
    .reduce((total, char, index, chars) => {
      const value = values[char] || 0;
      const nextValue = values[chars[index + 1]] || 0;
      return total + (value < nextValue ? -value : value);
    }, 0);
};

export const extractLeadingRomanNumber = (text: string): number | null => {
  const match = text.trim().match(/^([IVXLCDM]+)(?:[\s.)-]|$)/i);
  if (!match) return null;

  const roman = match[1].toUpperCase();
  return toRoman(fromRoman(roman)) === roman ? fromRoman(roman) : null;
};

const sttSortParts = (value?: string) => {
  const text = String(value || '').trim();
  if (!text) return [Number.POSITIVE_INFINITY];
  const parts = text.match(/\d+/g)?.map((part) => Number.parseInt(part, 10)) || [];
  return parts.length ? parts : [Number.POSITIVE_INFINITY];
};

export const compareTaskStt = (a?: string, b?: string) => {
  const textA = String(a || '').trim();
  const textB = String(b || '').trim();
  
  const romanA = extractLeadingRomanNumber(textA);
  const romanB = extractLeadingRomanNumber(textB);

  // 1. If both are valid Roman numerals, compare their numerical value (III=3 < XI=11)
  if (romanA !== null && romanB !== null) {
    if (romanA !== romanB) return romanA - romanB;
  }

  // 2. Single/Double Letter headers (A, B, C, AA, BB) get priority if not Roman
  const isLetterA = /^[A-Z]{1,2}$/i.test(textA) && romanA === null;
  const isLetterB = /^[A-Z]{1,2}$/i.test(textB) && romanB === null;

  if (isLetterA && isLetterB) return textA.localeCompare(textB, 'en', { sensitivity: 'base' });
  if (isLetterA && !isLetterB) return -1;
  if (!isLetterA && isLetterB) return 1;
  
  if (romanA !== null && romanB === null) {
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