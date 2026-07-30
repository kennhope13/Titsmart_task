const fs = require('fs');
const p = 'src/services/webOcrService.ts';
let s = fs.readFileSync(p, 'utf8');
s = s.replace('export type WebOcrField = {\n  label: string;\n  value: string;\n};', `export type WebOcrField = {\n  label: string;\n  value: string;\n};\n\nexport type WebOcrTableTask = {\n  stt: string;\n  name: string;\n  volume: number;\n  unit: string;\n  notes?: string;\n  isSectionHeader: boolean;\n  sectionName: string;\n};`);
s = s.replace('  fields: WebOcrField[];\n  taskName: string;', '  fields: WebOcrField[];\n  tableTasks?: WebOcrTableTask[];\n  taskName: string;');
const helpers = String.raw`
const parseNumberValue = (value: unknown) => {
  const raw = String(value ?? '').replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

const splitTableLine = (line: string) => {
  const csvParts = line.split(',').map(cleanCSVArtifacts);
  if (csvParts.length >= 3) return csvParts;
  return line.split(/\t+|\s{2,}|\s*[|;]\s*/).map(cleanCSVArtifacts).filter(Boolean);
};

const getTableColumnIndex = (header: string[], candidates: string[], fallback: number) => {
  const normalized = header.map(normalizeLookupText);
  const found = normalized.findIndex((cell) => candidates.some((candidate) => cell.includes(candidate)));
  return found >= 0 ? found : fallback;
};

const isLikelyTableHeader = (cells: string[]) => {
  const normalized = cells.map(normalizeLookupText);
  const hasStt = normalized.some((cell) => cell === 'stt' || cell === 'tt' || cell.includes('stt'));
  const hasContent = normalized.some((cell) => cell.includes('noi dung') || cell.includes('hang muc') || cell.includes('dien giai') || cell.includes('mo ta'));
  const hasQuantity = normalized.some((cell) => cell.includes('khoi luong') || cell.includes('so luong') || cell.includes('don vi') || cell.includes('dvt'));
  return hasStt && hasContent && hasQuantity;
};

const isTotalOrNoiseRow = (name: string) => {
  const lookup = normalizeLookupText(name).trim();
  if (!lookup) return true;
  return lookup.includes('tong cong') || lookup === 'cong' || lookup.includes('bang chi tiet gia tri hop dong') || lookup.includes('gia tri hop dong');
};

const stripSectionPrefix = (value: string) =>
  cleanCSVArtifacts(String(value || '').replace(/^\s*(?:[IVXLCDM]+|MUC\s+[A-Z0-9]+)\s*[.)\-:]?\s*/i, ''));

const parseTableTasks = (lines: string[]): WebOcrTableTask[] => {
  const rows = lines.map(splitTableLine);
  const headerIndex = rows.findIndex((cells, index) => index < 80 && isLikelyTableHeader(cells));
  if (headerIndex < 0) return [];

  const header = rows[headerIndex];
  const sttCol = getTableColumnIndex(header, ['stt', 'tt'], 0);
  const nameCol = getTableColumnIndex(header, ['noi dung', 'hang muc', 'dien giai', 'mo ta'], 1);
  const volumeCol = getTableColumnIndex(header, ['khoi luong', 'so luong'], 2);
  const unitCol = getTableColumnIndex(header, ['don vi tinh', 'don vi', 'dvt'], 3);
  const notesCol = getTableColumnIndex(header, ['ghi chu'], -1);
  const parsedTasks: WebOcrTableTask[] = [];
  let currentSection = '';

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const cells = rows[index];
    if (!cells.length) continue;

    const stt = String(cells[sttCol] || '').trim();
    const name = String(cells[nameCol] || cells.find((cell, cellIndex) => cellIndex !== sttCol && normalizeLookupText(cell) !== 'stt') || '').trim();
    if (!name || isTotalOrNoiseRow(name)) continue;
    if (normalizeLookupText(stt) === 'stt') continue;

    const volume = volumeCol >= 0 ? parseNumberValue(cells[volumeCol] || '') : 0;
    const unit = unitCol >= 0 ? String(cells[unitCol] || '').trim() : '';
    const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|MUC\s+[A-Z0-9]+)$/i;
    const isSectionHeader = romanRegex.test(normalizeLookupText(stt).toUpperCase());
    const cleanSectionName = stripSectionPrefix(name);
    const sectionName = isSectionHeader ? cleanSectionName : currentSection;

    if (isSectionHeader) currentSection = sectionName;

    parsedTasks.push({
      stt: isSectionHeader ? '' : (stt || String(parsedTasks.length + 1)),
      name,
      volume: isSectionHeader ? 0 : volume,
      unit: isSectionHeader ? '' : unit,
      notes: notesCol >= 0 ? String(cells[notesCol] || '').trim() : '',
      isSectionHeader,
      sectionName,
    });
  }

  return parsedTasks;
};
`;
s = s.replace('export const extractWebOcrData = (value: string, file?: File): WebOcrExtractedData => {', helpers + '\nexport const extractWebOcrData = (value: string, file?: File): WebOcrExtractedData => {');
s = s.replace('  const flatText = lines.join(\'\\n\');\n\n  const projectName', '  const flatText = lines.join(\'\\n\');\n  const tableTasks = parseTableTasks(lines);\n\n  const projectName');
s = s.replace('    fields,\n    taskName: defaultTaskName,', '    fields,\n    tableTasks,\n    taskName: defaultTaskName,');
s = s.replace('  const pages: string[] = [];', '  const textPages: string[] = [];\n  const pageRefs: any[] = [];');
s = s.replace(`    onProgress?.({ status: \`?ang ??c PDF trang \${pageNumber}/\${pdf.numPages}\`, progress: Math.round((pageNumber / pdf.numPages) * 100) });
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str || '').filter(Boolean).join(' ');
    pages.push(pageText);
  }

  return pages.join('\\n\\n');`, `    onProgress?.({ status: \`?ang ??c text PDF trang \${pageNumber}/\${pdf.numPages}\`, progress: Math.round((pageNumber / pdf.numPages) * 45) });
    const page = await pdf.getPage(pageNumber);
    pageRefs.push(page);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str || '').filter(Boolean).join(' ');
    textPages.push(pageText);
  }

  const textLayerContent = textPages.join('\\n\\n').trim();
  if (textLayerContent.length >= 20) return textLayerContent;

  const ocrPages: string[] = [];
  for (let index = 0; index < pageRefs.length; index += 1) {
    const pageNumber = index + 1;
    const page = pageRefs[index];
    onProgress?.({ status: \`PDF kh?ng c? text, ?ang render trang \${pageNumber}/\${pdf.numPages}\`, progress: Math.round(45 + (index / pdf.numPages) * 10) });
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
    ocrPages.push(await ocrCanvas(canvas, pageNumber, pdf.numPages, onProgress));
  }

  return ocrPages.join('\\n\\n');`);
const ocrCanvas = String.raw`
const ocrCanvas = async (
  canvas: HTMLCanvasElement,
  pageNumber: number,
  totalPages: number,
  onProgress?: (progress: WebOcrProgress) => void,
) => {
  const { recognize } = await import('tesseract.js');
  const result = await recognize(canvas, 'vie+eng', {
    logger: (message) => {
      const pageStart = ((pageNumber - 1) / totalPages) * 100;
      const pageShare = 100 / totalPages;
      const ocrProgress = typeof message.progress === 'number' ? message.progress : 0;
      onProgress?.({
        status: ` + '`?ang OCR PDF scan trang ${pageNumber}/${totalPages}`' + `,
        progress: Math.min(99, Math.round(pageStart + ocrProgress * pageShare)),
      });
    },
  });
  return result.data.text || '';
};
`;
s = s.replace('const extractSpreadsheetText = async (file: File) => {', ocrCanvas + '\nconst extractSpreadsheetText = async (file: File) => {');
fs.writeFileSync(p, s, 'utf8');
