const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const excelPath = path.join(__dirname, '../bảng theo dõi tiến độ.xlsx');
const workbook = XLSX.readFile(excelPath);

const parsedData = {};

workbook.SheetNames.forEach((sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  
  // Row 2 has project title
  const projectTitleRow = rows[1] ? rows[1][0] : sheetName;
  const projectTitle = projectTitleRow ? String(projectTitleRow).replace('DỰ ÁN: ', '').trim() : sheetName;

  // Header row is Row 9 (index 8)
  const headers = rows[8] || [];
  
  const items = [];
  for (let i = 9; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    
    const stt = r[0];
    const name = r[1];
    const volume = r[2];
    const unit = r[3];
    const progress = r[4];
    const purchaseStatus = r[5];
    const constrStatus = r[6];
    const issue = r[7];
    const issueStatus = r[8];
    const isDone = r[9];
    const notes = r[10];

    if (!name) continue;

    items.push({
      stt: stt !== undefined ? String(stt) : '',
      name: String(name).trim(),
      volume: typeof volume === 'number' ? volume : (parseFloat(volume) || 0),
      unit: unit ? String(unit).trim() : '',
      progress: typeof progress === 'number' ? progress : (parseFloat(progress) || 0),
      purchaseStatus: purchaseStatus ? String(purchaseStatus).trim() : 'Chưa đặt hàng',
      constrStatus: constrStatus ? String(constrStatus).trim() : 'Chưa thi công',
      issue: issue ? String(issue).trim() : '',
      issueStatus: issueStatus ? String(issueStatus).trim() : '',
      isDone: isDone === true || isDone === 'true' || progress === 1,
      notes: notes ? String(notes).trim() : '',
    });
  }

  parsedData[sheetName] = {
    code: sheetName,
    title: projectTitle,
    itemsCount: items.length,
    items: items,
  };
});

console.log('Parsed Projects Summary:');
Object.keys(parsedData).forEach(code => {
  console.log(`Project ${code} (${parsedData[code].title}): ${parsedData[code].items.length} items`);
  console.log('Sample item:', parsedData[code].items[0]);
});

fs.writeFileSync(path.join(__dirname, 'src/services/excelSeedData.json'), JSON.stringify(parsedData, null, 2));
console.log('Wrote parsed data to src/services/excelSeedData.json');
