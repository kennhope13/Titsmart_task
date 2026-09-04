const fs = require('fs');
const file = 'src/pages/ProjectManagementPage.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/const \[newProjContractValue, setNewProjContractValue\] = useState\(''\);/g, "const [newProjCategory, setNewProjCategory] = useState('');");
content = content.replace(/const \[editProjContractValue, setEditProjContractValue\] = useState\(''\);/g, "const [editProjCategory, setEditProjCategory] = useState('');");

content = content.replace(/const contractValue = getImportedFieldValue\(data, \['gia tri hop dong', 'gia tri phu luc', 'tong gia tri'\]\);/g, "const category = getImportedFieldValue(data, ['hang muc', 'hạng mục', 'loai cong trinh', 'phan loai']);");
content = content.replace(/setNewProjContractValue\(contractValue\.replace\(\/\[\^0-9\]\/g, ''\)\);/g, "setNewProjCategory(category);");

content = content.replace(/contractValue: Number\(newProjContractValue\) \|\| undefined,/g, "notes: newProjCategory.trim() || undefined,");
content = content.replace(/setNewProjContractValue\(''\);/g, "setNewProjCategory('');");

content = content.replace(/setEditProjContractValue\(project\.contractValue \? String\(project\.contractValue\) : ''\);/g, "setEditProjCategory(project.notes || '');");
content = content.replace(/contractValue: Number\(editProjContractValue\) \|\| undefined,/g, "notes: editProjCategory.trim() || undefined,");

content = content.replace(/<label className="block font-bold text-slate-700 mb-1">Giá trị hợp đồng<\/label>\s*<input value=\{newProjContractValue\} onChange=\{\(event\) => setNewProjContractValue\(event\.target\.value\)\} inputMode="numeric"/g, `<label className="block font-bold text-slate-700 mb-1">Hạng mục</label><input value={newProjCategory} onChange={(event) => setNewProjCategory(event.target.value)}`);

content = content.replace(/<label className="block font-bold text-slate-700 mb-1">Giá trị hợp đồng<\/label>\s*<input value=\{editProjContractValue\} onChange=\{\(e\) => setEditProjContractValue\(e\.target\.value\)\} inputMode="numeric"/g, `<label className="block font-bold text-slate-700 mb-1">Hạng mục</label>\n              <input value={editProjCategory} onChange={(e) => setEditProjCategory(e.target.value)}`);

fs.writeFileSync(file, content, 'utf8');
console.log('Replacements done.');
