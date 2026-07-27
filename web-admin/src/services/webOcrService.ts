export type WebOcrField = {
  label: string;
  value: string;
};

export type WebOcrExtractedData = {
  fields: WebOcrField[];
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

export const extractWebOcrData = (value: string, file?: File): WebOcrExtractedData => {
  const text = normalizeVietnameseText(value || '');
  const lines = text
    .split('\n')
    .map(compactSpaces)
    .filter(Boolean);
  const flatText = lines.join('\n');

  const projectName = cleanCSVArtifacts(getLineAfterLabel(lines, ['Dự án', 'Công trình', 'Hạng mục', 'Tên công trình']));
  const location = cleanCSVArtifacts(getLineAfterLabel(lines, ['Địa điểm', 'Vị trí', 'Nơi thi công', 'Địa chỉ']));
  const taskName = cleanCSVArtifacts(getLineAfterLabel(lines, ['Nội dung', 'Công việc', 'Yêu cầu', 'Hạng mục', 'Diễn giải']));
  const materialName = cleanCSVArtifacts(getLineAfterLabel(lines, ['Vật tư', 'Thiết bị', 'Tên hàng', 'Tên vật tư', 'Tên thiết bị']));
  const materialCode = cleanCSVArtifacts(getLineAfterLabel(lines, ['Mã vật tư', 'Mã hàng', 'Mã số', 'Mã thiết bị']));
  const quantity = cleanCSVArtifacts(getLineAfterLabel(lines, ['Số lượng', 'Khối lượng', 'SL']) ||
    getFirstMatch(flatText, [/\b(?:SL|Số lượng|Khối lượng)\s*[:\-]?\s*([0-9.,]+)/i]));
  const unit = cleanCSVArtifacts(getLineAfterLabel(lines, ['Đơn vị', 'DVT', 'ĐVT']) ||
    getFirstMatch(flatText, [/\b(?:DVT|ĐVT|Đơn vị)\s*[:\-]?\s*([A-Za-zÀ-ỹ]+)/i]));
  const dueDate = cleanCSVArtifacts(getLineAfterLabel(lines, ['Hạn hoàn thành', 'Ngày giao', 'Ngày hẹn', 'Deadline', 'Ngày']) ||
    getFirstMatch(flatText, [/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\b/]));
  const phone = cleanCSVArtifacts(getFirstMatch(flatText, [/\b((?:0|\+84)[0-9 .-]{8,13})\b/]));
  const note = cleanCSVArtifacts(getLineAfterLabel(lines, ['Ghi chú', 'Mô tả', 'Diễn giải']));

  const fields: WebOcrField[] = [];
  const defaultTaskName = taskName || materialName || cleanCSVArtifacts(lines[0]);
  pushField(fields, 'Công việc', defaultTaskName);
  pushField(fields, 'Dự án/Công trình', projectName);
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

const extractSpreadsheetText = async (file: File) => {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
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
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    onProgress?.({ status: `Đang đọc PDF trang ${pageNumber}/${pdf.numPages}`, progress: Math.round((pageNumber / pdf.numPages) * 100) });
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str || '').filter(Boolean).join(' ');
    pages.push(pageText);
  }

  return pages.join('\n\n');
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