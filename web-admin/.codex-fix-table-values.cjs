const fs = require('fs');
const p = 'src/services/webOcrService.ts';
let s = fs.readFileSync(p, 'utf8');
s = s.replace(/const parseNumberValue = \(value: unknown\) => \{[\s\S]*?\n\};/, `const parseNumberValue = (value: unknown) => {
  const raw = String(value ?? '').trim().replace(/\s+/g, '');
  if (!raw) return 0;
  const numeric = raw.replace(/[^0-9,.-]/g, '');
  if (!numeric) return 0;

  let normalized = numeric;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(numeric)) {
    normalized = numeric.replace(/\./g, '').replace(',', '.');
  } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(numeric)) {
    normalized = numeric.replace(/,/g, '');
  } else if (numeric.includes(',') && !numeric.includes('.')) {
    normalized = numeric.replace(',', '.');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
};`);
s = s.replace(
  `    const sttLookup = normalizeLookupText(stt).toUpperCase();\n    const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|MUC\\s+[A-Z0-9]+)$/i;\n    const numericParentRegex = /^\\d+$/;\n    const isSectionHeader = romanRegex.test(sttLookup) || (numericParentRegex.test(sttLookup) && volume === 0 && !unit);`,
  `    const sttLookup = normalizeLookupText(stt).toUpperCase();\n    const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|MUC\\s+[A-Z0-9]+)$/i;\n    const numericParentRegex = /^\\d+$/;\n    const decimalItemRegex = /^\\d+(?:\\.\\d+)+$/;\n    const hasValidStt = romanRegex.test(sttLookup) || numericParentRegex.test(sttLookup) || decimalItemRegex.test(sttLookup);\n    if (!hasValidStt) continue;\n    const isSectionHeader = romanRegex.test(sttLookup) || (numericParentRegex.test(sttLookup) && volume === 0 && !unit);`
);
fs.writeFileSync(p, s, 'utf8');
