const fs = require('fs');

const filePath = 'web-admin/src/pages/DocumentTrackingPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

// 1. Add filter state
const statePattern = /const \[filterPaymentStatus, setFilterPaymentStatus\] = useState\('all'\);/;
data = data.replace(statePattern, "const [filterPaymentStatus, setFilterPaymentStatus] = useState('all');\n  const [filterDocType, setFilterDocType] = useState('all');");

// 2. Add filtering logic
const filterLogicPattern = /if \(filterPaymentStatus !== 'all' && track\.paymentStatus !== filterPaymentStatus\) return false;/;
data = data.replace(filterLogicPattern, "if (filterPaymentStatus !== 'all' && track.paymentStatus !== filterPaymentStatus) return false;\n      if (filterDocType !== 'all' && (track.docType || 'Giao') !== filterDocType) return false;");

// 3. Add filter UI
const filterUIPattern = /<div className="flex items-center gap-1\.5 shrink-0">\s*<label className="text-\[11px\] font-bold text-slate-500 whitespace-nowrap">Thanh toán:<\/label>\s*<CustomSelect\s*value=\{filterPaymentStatus\}\s*onChange=\{e => setFilterPaymentStatus\(e\.target\.value\)\}\s*className="min-w-\[100px\] border border-slate-200 rounded px-1\.5 py-0\.5 bg-white text-xs truncate"\s*>\s*<option value="all">Tất cả<\/option>\s*\{paymentStatusOptions\.map\(opt => \(\s*<option key=\{opt\} value=\{opt\}>\{opt\}<\/option>\s*\)\)\}\s*<\/CustomSelect>\s*<\/div>/;
const newFilterUI = `<div className="flex items-center gap-1.5 shrink-0">
                <label className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Phân loại:</label>
                <CustomSelect
                  value={filterDocType}
                  onChange={e => setFilterDocType(e.target.value)}
                  className="min-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs truncate"
                >
                  <option value="all">Tất cả</option>
                  <option value="Giao">Giao hồ sơ</option>
                  <option value="Nhận">Nhận hồ sơ</option>
                </CustomSelect>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <label className="text-[11px] font-bold text-slate-500 whitespace-nowrap">Thanh toán:</label>
                <CustomSelect
                  value={filterPaymentStatus}
                  onChange={e => setFilterPaymentStatus(e.target.value)}
                  className="min-w-[100px] border border-slate-200 rounded px-1.5 py-0.5 bg-white text-xs truncate"
                >
                  <option value="all">Tất cả</option>
                  {paymentStatusOptions.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </CustomSelect>
              </div>`;
data = data.replace(filterUIPattern, newFilterUI);

// 4. Update newDoc state
const newDocPattern = /const \[newDoc, setNewDoc\] = useState<Partial<DocumentTrack>>\(\{/;
data = data.replace(newDocPattern, "const [newDoc, setNewDoc] = useState<Partial<DocumentTrack>>({\n    docType: 'Giao',");

// 5. Update Add Form and Edit Form
data = data.replace('<label className="block font-bold mb-1 truncate">Dự án *</label>', `<label className="block font-bold mb-1 truncate">Phân loại hồ sơ *</label>
              <CustomSelect required value={newDoc.docType || 'Giao'} onChange={(e) => setNewDoc({...newDoc, docType: e.target.value})} className="w-full border rounded-lg p-2 bg-white font-bold mb-3">
                <option value="Giao">Giao hồ sơ (Gửi đi)</option>
                <option value="Nhận">Nhận hồ sơ (Nhận về)</option>
              </CustomSelect>
              <label className="block font-bold mb-1 truncate">Dự án *</label>`);
              
data = data.replace('<label className="block font-bold mb-1 truncate">Dự án *</label>', `<label className="block font-bold mb-1 truncate">Phân loại hồ sơ *</label>
              <CustomSelect required value={editingDoc?.docType || 'Giao'} onChange={(e) => setEditingDoc(prev => prev ? {...prev, docType: e.target.value} : null)} className="w-full border rounded-lg p-2 bg-white font-bold mb-3">
                <option value="Giao">Giao hồ sơ (Gửi đi)</option>
                <option value="Nhận">Nhận hồ sơ (Nhận về)</option>
              </CustomSelect>
              <label className="block font-bold mb-1 truncate">Dự án *</label>`);

// Now, split into tables and replace for EACH table specifically
const parts = data.split('table-fixed text-left border-collapse');
if (parts.length === 5) {
  // parts[1]: overview
  // parts[2]: delivery
  // parts[3]: finance
  // parts[4]: completion

  // Fix overview
  parts[1] = parts[1].replace(
    /<col style=\{\{ width: '13%' \}\} \/>\n\s*<col style=\{\{ width: '13%' \}\} \/>\n\s*<col style=\{\{ width: '22%' \}\} \/>/,
    `<col style={{ width: '13%' }} />\n                <col style={{ width: '10%' }} />\n                {!projectId && <col style={{ width: '13%' }} />}\n                <col style={{ width: !projectId ? '19%' : '32%' }} />`
  );
  parts[1] = parts[1].replace(
    '<th className="px-2 py-2">Dự án</th>', 
    '<th className="px-2 py-2 text-center">Loại</th>\n                   {!projectId && <th className="px-2 py-2">Dự án</th>}'
  );
  parts[1] = parts[1].replace(
    '<td className="px-2 py-2 text-[13px] font-bold text-slate-600 truncate">{projects.find', 
    '<td className="px-2 py-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${(track.docType || \'Giao\') === \'Giao\' ? \'bg-indigo-50 text-indigo-600\' : \'bg-amber-50 text-amber-600\'}`}>{track.docType || \'Giao\'}</span></td>\n                    {!projectId && <td className="px-2 py-2 text-[13px] font-bold text-slate-600 truncate">{projects.find'
  );
  // Add closing tag for td
  parts[1] = parts[1].replace(
    ' track.projectCode || \'-\'}</td>', 
    ' track.projectCode || \'-\'}</td>}'
  );

  // Fix delivery
  parts[2] = parts[2].replace(
    /<col style=\{\{ width: '11%' \}\} \/>\n\s*<col style=\{\{ width: '10%' \}\} \/>\n\s*<col style=\{\{ width: '10%' \}\} \/>/,
    `<col style={{ width: '11%' }} />\n                <col style={{ width: '7%' }} />\n                {!projectId && <col style={{ width: '10%' }} />}\n                <col style={{ width: !projectId ? '10%' : '20%' }} />`
  );
  parts[2] = parts[2].replace(
    '<th className="px-2 py-2">Dự án</th>', 
    '<th className="px-2 py-2 text-center">Loại</th>\n                   {!projectId && <th className="px-2 py-2">Dự án</th>}'
  );
  parts[2] = parts[2].replace(
    '<td className="px-2 py-2 text-[13px] font-bold text-slate-600 truncate">{projects.find', 
    '<td className="px-2 py-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${(track.docType || \'Giao\') === \'Giao\' ? \'bg-indigo-50 text-indigo-600\' : \'bg-amber-50 text-amber-600\'}`}>{track.docType || \'Giao\'}</span></td>\n                    {!projectId && <td className="px-2 py-2 text-[13px] font-bold text-slate-600 truncate">{projects.find'
  );
  parts[2] = parts[2].replace(
    ' track.projectCode || \'-\'}</td>', 
    ' track.projectCode || \'-\'}</td>}'
  );

  // Fix finance
  parts[3] = parts[3].replace(
    /<col style=\{\{ width: '11%' \}\} \/>\n\s*<col style=\{\{ width: '13%' \}\} \/>\n\s*<col style=\{\{ width: '12%' \}\} \/>/,
    `<col style={{ width: '11%' }} />\n                <col style={{ width: '7%' }} />\n                {!projectId && <col style={{ width: '13%' }} />}\n                <col style={{ width: !projectId ? '12%' : '25%' }} />`
  );
  parts[3] = parts[3].replace(
    '<th className="px-2 py-2">Dự án</th>', 
    '<th className="px-2 py-2 text-center">Loại</th>\n                   {!projectId && <th className="px-2 py-2">Dự án</th>}'
  );
  parts[3] = parts[3].replace(
    '<td className="px-2 py-2 text-[13px] font-bold text-slate-600 truncate">{projects.find', 
    '<td className="px-2 py-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${(track.docType || \'Giao\') === \'Giao\' ? \'bg-indigo-50 text-indigo-600\' : \'bg-amber-50 text-amber-600\'}`}>{track.docType || \'Giao\'}</span></td>\n                    {!projectId && <td className="px-2 py-2 text-[13px] font-bold text-slate-600 truncate">{projects.find'
  );
  parts[3] = parts[3].replace(
    ' track.projectCode || \'-\'}</td>', 
    ' track.projectCode || \'-\'}</td>}'
  );

  // Fix completion
  parts[4] = parts[4].replace(
    /<col style=\{\{ width: '11%' \}\} \/>\n\s*<col style=\{\{ width: '15%' \}\} \/>\n\s*<col style=\{\{ width: '12%' \}\} \/>/,
    `<col style={{ width: '11%' }} />\n                <col style={{ width: '7%' }} />\n                {!projectId && <col style={{ width: '15%' }} />}\n                <col style={{ width: !projectId ? '12%' : '27%' }} />`
  );
  parts[4] = parts[4].replace(
    '<th className="px-2 py-2">Dự án</th>', 
    '<th className="px-2 py-2 text-center">Loại</th>\n                   {!projectId && <th className="px-2 py-2">Dự án</th>}'
  );
  parts[4] = parts[4].replace(
    '<td className="px-2 py-2 text-[13px] font-bold text-slate-600 truncate">{projects.find', 
    '<td className="px-2 py-2 text-center"><span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${(track.docType || \'Giao\') === \'Giao\' ? \'bg-indigo-50 text-indigo-600\' : \'bg-amber-50 text-amber-600\'}`}>{track.docType || \'Giao\'}</span></td>\n                    {!projectId && <td className="px-2 py-2 text-[13px] font-bold text-slate-600 truncate">{projects.find'
  );
  parts[4] = parts[4].replace(
    ' track.projectCode || \'-\'}</td>', 
    ' track.projectCode || \'-\'}</td>}'
  );

  data = parts.join('table-fixed text-left border-collapse');
}

fs.writeFileSync(filePath, data);
console.log('Fixed properly');
