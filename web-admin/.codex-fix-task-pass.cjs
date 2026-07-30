const fs = require('fs');
let s = fs.readFileSync('src/pages/TaskManagementPage.tsx', 'utf8');
s = s.replaceAll("useState('eng-1')", "useState(engineers[0]?.id || '')");
s = s.replaceAll("engineers[0]?.id || 'eng-1'", "engineers[0]?.id || ''");
s = s.replaceAll("t.assignedEngineerId || 'eng-1'", "t.assignedEngineerId || engineers[0]?.id || ''");
s = s.replace("status: (finalProgress >= 1 ? 'Done' : finalProgress > 0 ? 'In Progress' : 'Not Started'),", "status: (finalProgress >= 1 ? 'Hoàn thành' : finalProgress > 0 ? 'Đang làm' : 'Chưa làm'),");
s = s.replaceAll("'MỤC LA MÃ'", "'ĐẦU MỤC CHA'");
s = s.replaceAll('Mục La Mã', 'Đầu mục cha');
s = s.replaceAll('mục la mã', 'đầu mục cha');
s = s.replace("selectedRomanSection === 'all' ? 'Tất cả Đầu mục cha' : selectedRomanSection", "selectedRomanSection === 'all' ? 'Tất cả Đầu mục cha' : selectedRomanSection");
s = s.replace(/\n\s*<th className="py-2\.5 px-2\.5 w-\[9%\] border-b border-slate-200 whitespace-nowrap">KỸ SƯ<\/th>/, '');
s = s.replace(/\n\s*<td className="py-2 px-2\.5 border-b border-slate-100">[\s\S]*?value=\{t\.assignedEngineerId \|\| engineers\[0\]\?\.id \|\| ''\}[\s\S]*?<\/td>/, '');
s = s.replaceAll('colSpan={10}', 'colSpan={9}');
s = s.replaceAll('colSpan={9}', 'colSpan={8}');
fs.writeFileSync('src/pages/TaskManagementPage.tsx', s, 'utf8');

s = fs.readFileSync('src/services/webOcrService.ts', 'utf8');
s = s.replace('?ang OCR PDF scan', 'Đang OCR PDF scan');
fs.writeFileSync('src/services/webOcrService.ts', s, 'utf8');
