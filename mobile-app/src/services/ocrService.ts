import { NativeModules, Platform } from 'react-native';

export type OcrBounds = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type OcrBlock = {
  text: string;
  bounds?: OcrBounds;
};

export type OcrLine = {
  text: string;
  blockIndex: number;
  lineIndex: number;
  bounds: OcrBounds;
};

export type OcrExtractedField = {
  label: string;
  value: string;
};

export type OcrExtractedData = {
  fields: OcrExtractedField[];
  taskName?: string;
  projectName?: string;
  location?: string;
  dueDate?: string;
  quantity?: string;
  unit?: string;
  phone?: string;
  materialCode?: string;
  materialName?: string;
  note?: string;
  rawText: string;
};

export type OcrResult = {
  text: string;
  formattedText?: string;
  imageUri: string;
  language?: string;
  blocks: OcrBlock[];
  lines?: OcrLine[];
  extracted?: OcrExtractedData;
};

type VietnameseOcrModule = {
  captureAndRecognize: () => Promise<OcrResult>;
};

const nativeModule = NativeModules.VietnameseOcr as VietnameseOcrModule | undefined;

const normalizeVietnameseText = (value: string) =>
  value
    .normalize('NFC')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+$/gm, '')
    .trim();

const normalizeLookupText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u0111\u0110]/g, 'd')
    .toLowerCase();

const applyCasePattern = (source: string, replacement: string) => {
  if (source.toUpperCase() === source) return replacement.toUpperCase();
  if (source[0]?.toUpperCase() === source[0]) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
};

const fixKimKimToken = (token: string, context: string) => {
  const match = token.match(/^([^A-Za-z\u00C0-\u1EF9]*)([A-Za-z\u00C0-\u1EF9]+)([^A-Za-z\u00C0-\u1EF9]*)$/);
  if (!match) return token;

  const [, prefix, word, suffix] = match;
  const lookupWord = normalizeLookupText(word);
  if (!/^(kim|kiim|k1m|kimh)$/.test(lookupWord)) return token;

  const lookupContext = normalizeLookupText(context);
  const pliersContext = /\b(bam|cat|tuot|dien|nhon|mo|kep|cos|cot|cap|day|luc|cong|cheo|bang)\b/.test(lookupContext);
  const needleContext = /\b(tiem|khau|may|chi|dong\s*ho|la\s*ban)\b/.test(lookupContext);

  if (pliersContext && !needleContext) {
    return `${prefix}${applyCasePattern(word, 'k\u00ecm')}${suffix}`;
  }

  if (needleContext && !pliersContext) {
    return `${prefix}${applyCasePattern(word, 'kim')}${suffix}`;
  }

  return token;
};

const fixTechnicalOcrToken = (token: string, previousToken = '', nextToken = '') => {
  let fixed = token;
  const context = normalizeLookupText(`${previousToken} ${token} ${nextToken}`);
  const cableContext = /\b(cap|cable|day|ma\s*so|loai|module|modul|rack|khay)\b/.test(context);

  if (cableContext || /[a-zA-Z]/.test(previousToken) || /[a-zA-Z]/.test(nextToken)) {
    fixed = fixed.replace(/\b([1-9])0\b/g, '$1U');
  }

  fixed = fixed
    .replace(/\b([A-Za-z])0([A-Za-z])\b/g, '$1O$2')
    .replace(/\b([1-9])O\b/g, '$1U')
    .replace(/\b([1-9])u\b/g, '$1U')
    .replace(/\bI([Uu])\b/g, '1U')
    .replace(/\bl([Uu])\b/g, '1U');

  fixed = fixKimKimToken(fixed, context);

  return fixed;
};

export const fixTechnicalOcrText = (value: string) =>
  value
    .split('\n')
    .map((line) => {
      const parts = line.split(/(\s+)/);
      return parts
        .map((part, index) => {
          if (/^\s+$/.test(part)) return part;
          const previous = [...parts.slice(0, index)].reverse().find((item) => !/^\s+$/.test(item)) || '';
          const next = parts.slice(index + 1).find((item) => !/^\s+$/.test(item)) || '';
          return fixTechnicalOcrToken(part, previous, next);
        })
        .join('');
    })
    .join('\n');

const median = (values: number[]) => {
  if (!values.length) return 16;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] || 16;
};

export const formatOcrLinesAsForm = (lines?: OcrLine[]) => {
  const usableLines = (lines || [])
    .filter((line) => line.text.trim() && line.bounds)
    .sort((a, b) => (a.bounds.top - b.bounds.top) || (a.bounds.left - b.bounds.left));

  if (!usableLines.length) return '';

  const heights = usableLines.map((line) => Math.max(10, line.bounds.height));
  const rowTolerance = Math.max(10, Math.round(median(heights) * 0.65));
  const rows: OcrLine[][] = [];

  for (const line of usableLines) {
    const row = rows.find((candidate) => Math.abs(candidate[0].bounds.top - line.bounds.top) <= rowTolerance);
    if (row) row.push(line);
    else rows.push([line]);
  }

  const minLeft = Math.min(...usableLines.map((line) => line.bounds.left));
  const charWidths = usableLines
    .map((line) => line.text.trim().length ? line.bounds.width / line.text.trim().length : 0)
    .filter((width) => width >= 3 && width <= 28);
  const charWidth = Math.max(6, Math.min(18, median(charWidths)));

  return rows
    .map((row) => {
      const sortedRow = row.sort((a, b) => a.bounds.left - b.bounds.left);
      let output = '';
      let cursor = 0;

      for (const line of sortedRow) {
        const text = fixTechnicalOcrText(normalizeVietnameseText(line.text));
        const column = Math.max(0, Math.round((line.bounds.left - minLeft) / charWidth));
        const spaces = Math.max(1, column - cursor);
        output += ' '.repeat(spaces) + text;
        cursor = output.length;
      }

      return output.trimEnd();
    })
    .join('\n')
    .trim();
};

const compactSpaces = (value: string) => normalizeVietnameseText(value).replace(/[ \t]+/g, ' ');

const getFirstMatch = (text: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = compactSpaces(match?.[1] || '');
    if (value) return value;
  }
  return '';
};

const getLineAfterLabel = (lines: string[], labels: string[]) => {
  const normalizedLabels = labels.map(normalizeLookupText);
  for (const line of lines) {
    const lookupLine = normalizeLookupText(line);
    const matchedLabel = normalizedLabels.find((label) => lookupLine.startsWith(label));
    if (!matchedLabel) continue;

    const separatorIndex = Math.max(line.indexOf(':'), line.indexOf('-'));
    if (separatorIndex >= 0) {
      const value = compactSpaces(line.slice(separatorIndex + 1));
      if (value) return value;
    }

    for (const label of labels) {
      const value = compactSpaces(line.replace(new RegExp(`^\\s*${label}\\s*`, 'i'), ''));
      if (value && normalizeLookupText(value) !== normalizeLookupText(line)) return value;
    }
  }
  return '';
};

const pushField = (fields: OcrExtractedField[], label: string, value?: string) => {
  const cleanValue = compactSpaces(value || '');
  if (!cleanValue) return;
  if (fields.some((field) => normalizeLookupText(field.label) === normalizeLookupText(label))) return;
  fields.push({ label, value: cleanValue });
};

export const extractOcrData = (value: string): OcrExtractedData => {
  const text = normalizeVietnameseText(fixTechnicalOcrText(value || ''));
  const lines = text
    .split('\n')
    .map(compactSpaces)
    .filter(Boolean);
  const flatText = lines.join('\n');

  const projectName = getLineAfterLabel(lines, ['D\u1ef1 \u00e1n', 'C\u00f4ng tr\u00ecnh', 'H\u1ea1ng m\u1ee5c']);
  const location = getLineAfterLabel(lines, ['\u0110\u1ecba \u0111i\u1ec3m', 'V\u1ecb tr\u00ed', 'N\u01a1i thi c\u00f4ng', '\u0110\u1ecba ch\u1ec9']);
  const taskName = getLineAfterLabel(lines, ['N\u1ed9i dung', 'C\u00f4ng vi\u1ec7c', 'Y\u00eau c\u1ea7u', 'H\u1ea1ng m\u1ee5c']);
  const materialName = getLineAfterLabel(lines, ['V\u1eadt t\u01b0', 'Thi\u1ebft b\u1ecb', 'T\u00ean h\u00e0ng', 'T\u00ean v\u1eadt t\u01b0']);
  const materialCode = getLineAfterLabel(lines, ['M\u00e3 v\u1eadt t\u01b0', 'M\u00e3 h\u00e0ng', 'M\u00e3 s\u1ed1']);
  const quantity = getLineAfterLabel(lines, ['S\u1ed1 l\u01b0\u1ee3ng', 'Kh\u1ed1i l\u01b0\u1ee3ng', 'SL']) ||
    getFirstMatch(flatText, [/\b(?:SL|S\u1ed1 l\u01b0\u1ee3ng|Kh\u1ed1i l\u01b0\u1ee3ng)\s*[:\-]?\s*([0-9.,]+)/i]);
  const unit = getLineAfterLabel(lines, ['\u0110\u01a1n v\u1ecb', 'DVT', '\u0110VT']) ||
    getFirstMatch(flatText, [/\b(?:DVT|\u0110VT|\u0110\u01a1n v\u1ecb)\s*[:\-]?\s*([A-Za-z\u00c0-\u1ef9]+)/i]);
  const dueDate = getLineAfterLabel(lines, ['H\u1ea1n ho\u00e0n th\u00e0nh', 'Ng\u00e0y giao', 'Ng\u00e0y h\u1eb9n', 'Deadline']) ||
    getFirstMatch(flatText, [/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/]);
  const phone = getFirstMatch(flatText, [/\b((?:0|\+84)[0-9 .-]{8,13})\b/]);
  const note = getLineAfterLabel(lines, ['Ghi ch\u00fa', 'M\u00f4 t\u1ea3', 'Di\u1ec5n gi\u1ea3i']);

  const fields: OcrExtractedField[] = [];
  pushField(fields, 'C\u00f4ng vi\u1ec7c', taskName || materialName || lines[0]);
  pushField(fields, 'D\u1ef1 \u00e1n/C\u00f4ng tr\u00ecnh', projectName);
  pushField(fields, '\u0110\u1ecba \u0111i\u1ec3m', location);
  pushField(fields, 'H\u1ea1n/Ng\u00e0y', dueDate);
  pushField(fields, 'M\u00e3 v\u1eadt t\u01b0', materialCode);
  pushField(fields, 'V\u1eadt t\u01b0', materialName);
  pushField(fields, 'S\u1ed1 l\u01b0\u1ee3ng', quantity);
  pushField(fields, '\u0110\u01a1n v\u1ecb', unit);
  pushField(fields, 'S\u1ed1 \u0111i\u1ec7n tho\u1ea1i', phone);
  pushField(fields, 'Ghi ch\u00fa', note);

  return {
    fields,
    taskName: taskName || materialName || lines[0],
    projectName,
    location,
    dueDate,
    quantity,
    unit,
    phone,
    materialCode,
    materialName,
    note,
    rawText: text,
  };
};

export const captureVietnameseText = async () => {
  if (Platform.OS !== 'android') {
    throw new Error('Ch\u1ee9c n\u0103ng OCR hi\u1ec7n \u0111\u01b0\u1ee3c tri\u1ec3n khai cho Android.');
  }

  if (!nativeModule?.captureAndRecognize) {
    throw new Error('Native module OCR ch\u01b0a s\u1eb5n s\u00e0ng. H\u00e3y rebuild app Android sau khi th\u00eam module.');
  }

  const result = await nativeModule.captureAndRecognize();
  const formattedText = fixTechnicalOcrText(formatOcrLinesAsForm(result.lines));
  const text = fixTechnicalOcrText(normalizeVietnameseText(result.text || ''));
  const bestText = formattedText || text;

  return {
    ...result,
    text,
    formattedText: bestText,
    extracted: extractOcrData(bestText),
  };
};
