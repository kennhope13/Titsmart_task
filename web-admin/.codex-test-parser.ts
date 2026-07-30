import XLSX from 'xlsx';
import path from 'node:path';
import { extractWebOcrData } from './src/services/webOcrService.ts';
const file = path.resolve('..', 'documents', '2.Phụ lục 01 Bảng giá HĐ TSM_HGP - TBA 110kV Phước Lý.xlsx');
const wb = XLSX.readFile(file);
const text = wb.SheetNames.map((sheetName) => {
  const sheet = wb.Sheets[sheetName];
  const csv = XLSX.utils.sheet_to_csv(sheet, { FS: '\t' });
  return [`Sheet: ${sheetName}`, csv].join('\n');
}).join('\n\n');
const data = extractWebOcrData(text, { name: path.basename(file), type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } as File);
console.log(JSON.stringify({ projectName: data.projectName, projectItem: data.projectItem, location: data.location, taskName: data.taskName, fields: data.fields, tableTasks: data.tableTasks?.slice(0, 8), count: data.tableTasks?.length }, null, 2));
