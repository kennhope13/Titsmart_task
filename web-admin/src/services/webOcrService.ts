export type WebOcrField = {
  label: string;
  value: string;
};

export type WebOcrTableTask = {
  stt: string;
  name: string;
  volume: number;
  unit: string;
  notes?: string;
  isSectionHeader: boolean;
  sectionName: string;
  supplyScope?: 'contractor' | 'owner' | 'unknown';
  unitPrice?: number;
  vatRate?: number;
  vatAmount?: number;
  totalBeforeVat?: number;
  totalAmount?: number;
  techSpecModel?: string;
  techSpecOrigin?: string;
};

export type WebOcrExtractedData = {
  fields: WebOcrField[];
  tableTasks?: WebOcrTableTask[];
  projectItem: string;
  taskName: string;
  projectName: string;
  location: string;
  dueDate: string;
  quantity: string;
  unit: string;
  phone: string;
  materialCode: string;
  materialName: string;
  note: string;
  rawText: string;
  sourceFileName?: string;
  sourceFileType?: string;
};

export type WebOcrProgress = {
  status: string;
  progress: number;
};

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

    const colonIndex = line.indexOf(':');
    const dashIndex = line.indexOf('-');
    const separatorIndex = colonIndex >= 0 ? colonIndex : dashIndex;
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

const pushField = (fields: WebOcrField[], label: string, value?: string) => {
  const cleanValue = compactSpaces(value || '');
  if (!cleanValue) return;
  if (fields.some((field) => normalizeLookupText(field.label) === normalizeLookupText(label))) return;
  fields.push({ label, value: cleanValue });
};

const cleanCSVArtifacts = (val: string) => {
  if (!val) return '';
  return val
    .replace(/^["'\s,]+|["'\s,]+$/g, '')
    .trim();
};


const parseNumberValue = (value: unknown) => {
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
};

const parseCsvLine = (line: string) => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === ',' && !inQuotes) {
      cells.push(cleanCSVArtifacts(current));
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(cleanCSVArtifacts(current));
  return cells;
};

const splitTableLine = (line: string) => {
  if (line.includes('	')) return line.split('	').map(cleanCSVArtifacts);
  const csvParts = parseCsvLine(line);
  if (csvParts.length >= 3) return csvParts;
  return line.split(/\s{2,}|\s*[|;]\s*/).map(cleanCSVArtifacts).filter(Boolean);
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

type SupplyScope = 'contractor' | 'owner' | 'unknown';

const hasContractorSupplySignal = (text: string) =>
  text.includes('nha thau') ||
  text.includes('ben b') ||
  text.includes('nt cung cap') ||
  text.includes('nha thau cung cap') ||
  text.includes('don vi thi cong cung cap');

const hasOwnerSupplySignal = (text: string) =>
  text.includes('chu dau tu') ||
  text.includes('cdt') ||
  text.includes('ben a') ||
  text.includes('c/dt') ||
  text.includes('chu dau tu cap') ||
  text.includes('chu dau tu cung cap');

const detectSupplyScope = (value: unknown): SupplyScope => {
  const text = normalizeLookupText(String(value || ''));
  if (!text) return 'unknown';
  const owner = hasOwnerSupplySignal(text);
  const contractor = hasContractorSupplySignal(text);
  if (owner && !contractor) return 'owner';
  if (contractor && !owner) return 'contractor';
  return 'unknown';
};

const toRoman = (num: number): string => {
  if (num <= 0) return 'I';
  const lookup: [string, number][] = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]
  ];
  let roman = '';
  for (const i of lookup) {
    while (num >= i[1]) {
      roman += i[0];
      num -= i[1];
    }
  }
  return roman;
};

const parseTableTasks = (lines: string[]): WebOcrTableTask[] => {
  const rows = lines.map(splitTableLine);
  const headerIndex = rows.findIndex((cells, index) => index < 80 && isLikelyTableHeader(cells));
  if (headerIndex < 0) return [];

  const header = rows[headerIndex];
  const sttCol = getTableColumnIndex(header, ['stt', 'tt'], 0);
  const nameCol = getTableColumnIndex(header, ['noi dung', 'hang muc', 'dien giai', 'mo ta'], 1);
  const volumeCol = getTableColumnIndex(header, ['khoi luong', 'so luong'], 2);
  const unitCol = getTableColumnIndex(header, ['don vi tinh', 'don vi', 'dvt'], 3);
  const unitPriceCol = getTableColumnIndex(header, ['don gia'], 4);
  const preTaxCol = getTableColumnIndex(header, ['thanh tien truoc thue', 'thanh tien'], unitPriceCol + 1);
  const vatRateCol = getTableColumnIndex(header, ['thue vat', 'vat'], preTaxCol + 1);
  const vatAmountCol = vatRateCol + 1;
  const totalCol = getTableColumnIndex(header, ['tong tien', 'thanh tien sau thue'], vatAmountCol + 1);
  const notesCol = getTableColumnIndex(header, ['ghi chu'], -1);
  const supplyCol = getTableColumnIndex(header, ['nguon cung cap', 'ben cung cap', 'don vi cung cap', 'cung cap', 'phan cung cap', 'nha thau', 'chu dau tu'], -1);
  const modelCol = getTableColumnIndex(header, ['ma hieu', 'model', 'ky ma hieu'], -1);
  const originCol = getTableColumnIndex(header, ['nguon san xuat', 'xuat xu', 'hang san xuat'], -1);
  const fullTableText = normalizeLookupText(lines.join(' '));
  const workbookHasSupplySplit = hasOwnerSupplySignal(fullTableText) && hasContractorSupplySignal(fullTableText);
  const parsedTasks: WebOcrTableTask[] = [];
  let currentSection = '';
  let currentSupplyScope: SupplyScope = 'unknown';

  const isMainSectionName = (nameStr: string): boolean => {
    const norm = nameStr.toLowerCase();
    return norm.includes('phần vttb') || 
           norm.includes('cung cấp') || 
           norm.includes('chủ đầu tư') || 
           norm.includes('nhà thầu') || 
           norm.startsWith('phần ');
  };

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const cells = rows[index];
    if (!cells.length) continue;

    const firstCell = String(cells[0] || '').trim();
    if (parsedTasks.length > 0 && normalizeLookupText(firstCell).startsWith('sheet:')) break;
    if (parsedTasks.length > 0 && isLikelyTableHeader(cells)) break;

    const rowText = cells.map((cell) => String(cell || '')).join(' ');
    const stt = String(cells[sttCol] || '').trim();
    const name = String(cells[nameCol] || cells.find((cell, cellIndex) => cellIndex !== sttCol && normalizeLookupText(cell) !== 'stt') || '').trim();
    if (!name || isTotalOrNoiseRow(name)) continue;
    if (!/[a-zA-ZÀ-ỹ]/.test(name)) continue;
    if (normalizeLookupText(stt) === 'stt') continue;

    const volume = volumeCol >= 0 ? parseNumberValue(cells[volumeCol] || '') : 0;
    const unit = unitCol >= 0 ? String(cells[unitCol] || '').trim() : '';
    // Không import đơn giá, tiền thuế, thành tiền từ phụ lục dự án (vẫn lấy % thuế VAT)
    const unitPrice = 0;
    const totalBeforeVat = 0;
    const vatRate = vatRateCol >= 0 ? parseNumberValue(cells[vatRateCol] || '') : 0;
    const vatAmount = 0;
    const totalAmount = 0;
    const sttLookup = normalizeLookupText(stt).toUpperCase();
    const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|MUC\s+[A-Z0-9]+)$/i;
    const numericParentRegex = /^\d+$/;
    const decimalItemRegex = /^\d+(?:\.\d+)+$/;
    const hasValidStt = romanRegex.test(sttLookup) || numericParentRegex.test(sttLookup) || decimalItemRegex.test(sttLookup);
    
    // Bỏ qua các dòng không có STT hợp lệ (như dòng Thuế VAT, Tiền thuế...)
    if (!hasValidStt) continue;
    
    const cleanUnitVal = unit.replace(/^[-–—_.\s]+$/, '').trim();
    // A section header is ONLY a roman numeral if the file has roman numerals, OR if it has [section] in notes.
    const rawNotes = notesCol >= 0 ? String(cells[notesCol] || '').trim() : '';
    const isRomanSection = romanRegex.test(sttLookup) || normalizeLookupText(rawNotes).includes('section');
    const cleanStt = String(stt || '').trim().replace(/\.$/, '');
    const hasNoDot = !cleanStt.includes('.');
    const startsWithPhan = name.trim().toUpperCase().startsWith('PHẦN ') && !name.trim().toUpperCase().startsWith('PHẦN MỀM');
    const hasNoVolumeAndUnit = (volume === 0 || !volume) && (!cleanUnitVal || cleanUnitVal === '');
    const isSectionHeader = startsWithPhan || (hasNoDot && isMainSectionName(name)) || (hasNoDot && hasNoVolumeAndUnit && isRomanSection);
    const isLevel2Item = false; // Disable level 2 logic as it conflicts with section headers
    
    const explicitSupplyScope = supplyCol >= 0 ? detectSupplyScope(cells[supplyCol]) : 'unknown';
    const headerSupplyScope = isSectionHeader ? detectSupplyScope(rowText) : 'unknown';
    if (explicitSupplyScope !== 'unknown') currentSupplyScope = explicitSupplyScope;
    else if (headerSupplyScope !== 'unknown') currentSupplyScope = headerSupplyScope;
    const supplyScope = explicitSupplyScope !== 'unknown' ? explicitSupplyScope : currentSupplyScope;
    const cleanSectionName = stripSectionPrefix(name);
    
    // Find next valid row's STT to detect if this is a subfolder with children
    let isSubFolder = false;
    if (!isSectionHeader) {
      let nextSttVal = '';
      for (let nextIdx = index + 1; nextIdx < rows.length; nextIdx++) {
        const nextCells = rows[nextIdx];
        if (!nextCells || !nextCells.length) continue;
        const nextStt = String(nextCells[sttCol] || '').trim();
        const nextSttLookup = normalizeLookupText(nextStt).toUpperCase();
        const nextHasValidStt = romanRegex.test(nextSttLookup) || numericParentRegex.test(nextSttLookup) || decimalItemRegex.test(nextSttLookup);
        if (nextHasValidStt) {
          nextSttVal = nextStt;
          break;
        }
      }
      if (nextSttVal && nextSttVal.startsWith(stt + '.')) {
        isSubFolder = true;
      }
    }

    const sectionName = isSectionHeader ? cleanSectionName : currentSection;

    if (isSectionHeader) currentSection = sectionName;

    const effectiveSupplyScope = supplyScope === 'unknown' && !workbookHasSupplySplit ? 'contractor' : supplyScope;
    const supplyNote = effectiveSupplyScope === 'owner'
      ? 'Ch\u1ee7 \u0111\u1ea7u t\u01b0 cung c\u1ea5p'
      : effectiveSupplyScope === 'contractor'
        ? 'Nh\u00e0 th\u1ea7u cung c\u1ea5p'
        : '';

    let effectiveStt = stt;

    const techSpecModel = modelCol >= 0 ? String(cells[modelCol] || '').trim() : '';
    const techSpecOrigin = originCol >= 0 ? String(cells[originCol] || '').trim() : '';

    parsedTasks.push({
      stt: isSectionHeader ? effectiveStt : stt,
      name,
      volume: isSectionHeader ? 0 : volume,
      unit: isSectionHeader ? '' : unit,
      notes: [rawNotes, supplyNote].filter(Boolean).join(' | '),
      techSpecModel: isSectionHeader ? '' : techSpecModel,
      techSpecOrigin: isSectionHeader ? '' : techSpecOrigin,
      isSectionHeader,
      sectionName,
      supplyScope: effectiveSupplyScope,
      unitPrice: isSectionHeader ? 0 : unitPrice,
      vatRate: isSectionHeader ? 0 : vatRate,
      vatAmount: isSectionHeader ? 0 : vatAmount,
      totalBeforeVat: isSectionHeader ? 0 : totalBeforeVat,
      totalAmount: isSectionHeader ? 0 : totalAmount,
      // We temporarily store a flag to help with STT post-processing
      _isLevel2: isLevel2Item
    } as any);
  }

  const hasDottedStt = parsedTasks.some(t => t.stt && String(t.stt).includes('.'));

  if (!hasDottedStt) {
    // POST-PROCESSING: Generate hierarchical STTs for non-header items
    let currentLevel2 = 0;
    let currentLevel3 = 0;
    let lastSection = '';
    
    for (const task of parsedTasks) {
      if (task.isSectionHeader) {
        currentLevel2 = 0;
        currentLevel3 = 0;
        lastSection = task.sectionName;
        continue;
      }
      
      // If we changed sections implicitly (shouldn't happen but just in case)
      if (task.sectionName !== lastSection) {
        currentLevel2 = 0;
        currentLevel3 = 0;
        lastSection = task.sectionName;
      }
      
      const anyTask = task as any;
      if (anyTask._isLevel2) {
        currentLevel2++;
        currentLevel3 = 0;
        task.stt = String(currentLevel2);
      } else {
        currentLevel3++;
        // If there was no level 2 before this, just use the item counter
        if (currentLevel2 === 0) {
          task.stt = String(currentLevel3);
        } else {
          task.stt = `${currentLevel2}.${currentLevel3}`;
        }
      }
      delete anyTask._isLevel2;
    }
  } else {
    for (const task of parsedTasks) {
      const anyTask = task as any;
      delete anyTask._isLevel2;
    }
  }

  return parsedTasks;
};

export const extractWebOcrData = (value: string, file?: File): WebOcrExtractedData => {
  const text = normalizeVietnameseText(value || '');
  const rawLines = text
    .split('\n')
    .map((line) => normalizeVietnameseText(line))
    .filter(Boolean);
  const lines = rawLines.map(compactSpaces);
  const flatText = lines.join('\n');
  const tableTasks = parseTableTasks(rawLines);

  const projectName = cleanCSVArtifacts(getLineAfterLabel(lines, ['Công trình', 'Tên công trình', 'Công trình xây dựng', 'Tên dự án', 'Dự án']));
  const projectItem = cleanCSVArtifacts(getLineAfterLabel(lines, ['Hạng mục', 'Tên hạng mục', 'Gói thầu', 'Tên gói thầu']));
  const location = cleanCSVArtifacts(getLineAfterLabel(lines, ['Địa điểm công trình', 'Địa điểm xây dựng công trình', 'Địa điểm xây dựng', 'Địa điểm thi công', 'Địa điểm lắp đặt', 'Địa điểm', 'Vị trí công trình', 'Vị trí', 'Nơi thi công', 'Nơi xây dựng', 'Địa chỉ công trình', 'Địa chỉ thi công', 'Địa chỉ lắp đặt', 'Địa chỉ']));
  const taskName = cleanCSVArtifacts(getLineAfterLabel(lines, ['Nội dung công việc', 'Công việc', 'Yêu cầu công việc']));
  const materialName = cleanCSVArtifacts(getLineAfterLabel(lines, ['Vật tư', 'Thiết bị', 'Tên hàng', 'Tên vật tư', 'Tên thiết bị']));
  const materialCode = cleanCSVArtifacts(getLineAfterLabel(lines, ['Mã vật tư', 'Mã hàng', 'Mã số', 'Mã thiết bị']));
  const quantity = cleanCSVArtifacts(getLineAfterLabel(lines, ['Số lượng', 'Khối lượng', 'SL']) ||
    getFirstMatch(flatText, [/\b(?:SL|Số lượng|Khối lượng)\s*[:\-]?\s*([0-9.,]+)/i]));
  const unit = cleanCSVArtifacts(getLineAfterLabel(lines, ['Đơn vị', 'DVT', 'ĐVT']) ||
    getFirstMatch(flatText, [/\b(?:DVT|ĐVT|Đơn vị)\s*[:\-]?\s*([A-Za-zÀ-ỹ]+)/i]));
  const dueDate = cleanCSVArtifacts(getLineAfterLabel(lines, ['Hạn hoàn thành', 'Ngày giao', 'Ngày hẹn', 'Deadline', 'Ngày']) ||
    getFirstMatch(flatText, [/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/]));
  const phone = cleanCSVArtifacts(getFirstMatch(flatText, [/\b((?:0|\+84)[0-9 .-]{8,13})\b/]));
  const note = cleanCSVArtifacts(getLineAfterLabel(lines, ['Ghi chú', 'Mô tả']));

  const fields: WebOcrField[] = [];
  const defaultTaskName = taskName || materialName;
  pushField(fields, 'Công việc', defaultTaskName);
  pushField(fields, 'Dự án/Công trình', projectName);
  pushField(fields, 'Hạng mục', projectItem);
  pushField(fields, 'Địa điểm', location);
  pushField(fields, 'Hạn/Ngày', dueDate);
  pushField(fields, 'Mã vật tư', materialCode);
  pushField(fields, 'Vật tư', materialName);
  pushField(fields, 'Số lượng', quantity);
  pushField(fields, 'Đơn vị', unit);
  pushField(fields, 'Số điện thoại', phone);
  pushField(fields, 'Ghi chú', note);

  return {
    fields,
    tableTasks,
    projectItem,
    taskName: defaultTaskName,
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
    sourceFileName: file?.name,
    sourceFileType: file?.type,
  };
};

const fileExtension = (file: File) => file.name.split('.').pop()?.toLowerCase() || '';

const extractImageText = async (file: File, onProgress?: (progress: WebOcrProgress) => void) => {
  const { recognize } = await import('tesseract.js');
  const result = await recognize(file, 'vie+eng', {
    logger: (message) => {
      const progress = typeof message.progress === 'number' ? Math.round(message.progress * 100) : 0;
      onProgress?.({ status: message.status || 'Đang đọc chữ từ ảnh', progress });
    },
  });
  return result.data.text || '';
};


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
        status: `Đang OCR PDF scan trang ${pageNumber}/${totalPages}`,
        progress: Math.min(99, Math.round(pageStart + ocrProgress * pageShare)),
      });
    },
  });
  return result.data.text || '';
};

const extractSpreadsheetText = async (file: File) => {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: '\t' });
    return [`Sheet: ${sheetName}`, csv].join('\n');
  }).join('\n\n');
};

const extractDocxText = async (file: File) => {
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  return result.value || '';
};

const extractPdfText = async (file: File, onProgress?: (progress: WebOcrProgress) => void) => {
  const pdfjs = await import('pdfjs-dist');
  const worker = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();
  (pdfjs as any).GlobalWorkerOptions.workerSrc = worker;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const textPages: string[] = [];
  const pageRefs: any[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.({ status: `Đang đọc text PDF trang ${pageNumber}/${pdf.numPages}`, progress: Math.round((pageNumber / pdf.numPages) * 45) });
    const page = await pdf.getPage(pageNumber);
    pageRefs.push(page);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str || '').filter(Boolean).join(' ');
    textPages.push(pageText);
  }

  const textLayerContent = textPages.join('\n\n').trim();
  if (textLayerContent.length >= 20) return textLayerContent;

  const ocrPages: string[] = [];
  for (let index = 0; index < pageRefs.length; index += 1) {
    const pageNumber = index + 1;
    const page = pageRefs[index];
    onProgress?.({ status: `PDF không có text, đang render trang ${pageNumber}/${pdf.numPages}`, progress: Math.round(45 + (index / pdf.numPages) * 10) });
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
    ocrPages.push(await ocrCanvas(canvas, pageNumber, pdf.numPages, onProgress));
  }

  return ocrPages.join('\n\n');
};

export const extractTextFromFile = async (
  file: File,
  onProgress?: (progress: WebOcrProgress) => void,
) => {
  const extension = fileExtension(file);
  onProgress?.({ status: 'Đang đọc phụ lục', progress: 5 });

  if (file.type.startsWith('image/')) return extractImageText(file, onProgress);
  if (['xlsx', 'xls', 'csv'].includes(extension)) return extractSpreadsheetText(file);
  if (extension === 'docx') return extractDocxText(file);
  if (extension === 'pdf') return extractPdfText(file, onProgress);
  if (file.type.startsWith('text/') || ['txt', 'tsv'].includes(extension)) return file.text();

  throw new Error('Định dạng file này chưa hỗ trợ trích xuất. Hãy dùng ảnh, Excel/CSV, TXT, DOCX hoặc PDF có text.');
};

export const extractFileData = async (
  file: File,
  onProgress?: (progress: WebOcrProgress) => void,
) => {
  const text = normalizeVietnameseText(await extractTextFromFile(file, onProgress));
  onProgress?.({ status: 'Đã trích xuất xong', progress: 100 });
  return {
    text,
    extracted: extractWebOcrData(text, file),
  };
};