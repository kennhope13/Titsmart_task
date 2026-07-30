const fs = require('fs');
const p = 'src/services/webOcrService.ts';
let s = fs.readFileSync(p, 'utf8');

// Add project item field to extracted data.
s = s.replace('  tableTasks?: WebOcrTableTask[];\n  taskName: string;', '  tableTasks?: WebOcrTableTask[];\n  projectItem: string;\n  taskName: string;');
s = s.replace('    tableTasks,\n    taskName: defaultTaskName,', '    tableTasks,\n    projectItem,\n    taskName: defaultTaskName,');

// Replace splitTableLine with tab-first and quote-aware CSV parser.
s = s.replace(/const splitTableLine = \(line: string\) => \{[\s\S]*?\n\};\n\nconst getTableColumnIndex/, `const parseCsvLine = (line: string) => {
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
  if (line.includes('\t')) return line.split('\t').map(cleanCSVArtifacts);
  const csvParts = parseCsvLine(line);
  if (csvParts.length >= 3) return csvParts;
  return line.split(/\s{2,}|\s*[|;]\s*/).map(cleanCSVArtifacts).filter(Boolean);
};

const getTableColumnIndex`);

// Improve section header detection.
s = s.replace(
  `    const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|MUC\\s+[A-Z0-9]+)$/i;\n    const isSectionHeader = romanRegex.test(normalizeLookupText(stt).toUpperCase());`,
  `    const sttLookup = normalizeLookupText(stt).toUpperCase();\n    const romanRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X|XI|XII|XIII|XIV|XV|XVI|XVII|XVIII|XIX|XX|MUC\\s+[A-Z0-9]+)$/i;\n    const numericParentRegex = /^\\d+$/;\n    const isSectionHeader = romanRegex.test(sttLookup) || (numericParentRegex.test(sttLookup) && volume === 0 && !unit);`
);

// Improve field extraction block.
s = s.replace(
  `  const projectName = cleanCSVArtifacts(getLineAfterLabel(lines, ['Dự án', 'Công trình', 'Hạng mục', 'Tên công trình']));\n  const location = cleanCSVArtifacts(getLineAfterLabel(lines, ['Địa điểm', 'Vị trí', 'Nơi thi công', 'Địa chỉ']));\n  const taskName = cleanCSVArtifacts(getLineAfterLabel(lines, ['Nội dung', 'Công việc', 'Yêu cầu', 'Hạng mục', 'Diễn giải']));`,
  `  const projectName = cleanCSVArtifacts(getLineAfterLabel(lines, ['Công trình', 'Tên công trình', 'Công trình xây dựng', 'Tên dự án', 'Dự án']));\n  const projectItem = cleanCSVArtifacts(getLineAfterLabel(lines, ['Hạng mục', 'Tên hạng mục', 'Gói thầu', 'Tên gói thầu']));\n  const location = cleanCSVArtifacts(getLineAfterLabel(lines, ['Địa điểm công trình', 'Địa điểm xây dựng công trình', 'Địa điểm xây dựng', 'Địa điểm thi công', 'Địa điểm lắp đặt', 'Địa điểm', 'Vị trí công trình', 'Vị trí', 'Nơi thi công', 'Nơi xây dựng', 'Địa chỉ công trình', 'Địa chỉ thi công', 'Địa chỉ lắp đặt', 'Địa chỉ']));\n  const taskName = cleanCSVArtifacts(getLineAfterLabel(lines, ['Nội dung công việc', 'Công việc', 'Yêu cầu công việc']));`
);
s = s.replace('  const note = cleanCSVArtifacts(getLineAfterLabel(lines, [\'Ghi chú\', \'Mô tả\', \'Diễn giải\']));', "  const note = cleanCSVArtifacts(getLineAfterLabel(lines, ['Ghi chú', 'Mô tả']));");
s = s.replace('  const defaultTaskName = taskName || materialName || cleanCSVArtifacts(lines[0]);\n  pushField(fields, \'Công việc\', defaultTaskName);', "  const defaultTaskName = taskName || materialName;\n  pushField(fields, 'Công việc', defaultTaskName);");
s = s.replace("  pushField(fields, 'Dự án/Công trình', projectName);", "  pushField(fields, 'Dự án/Công trình', projectName);\n  pushField(fields, 'Hạng mục', projectItem);");

// Emit TSV for spreadsheets so commas inside descriptions do not break columns.
s = s.replace('    const csv = XLSX.utils.sheet_to_csv(sheet);', "    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: '\\t' });");

fs.writeFileSync(p, s, 'utf8');
