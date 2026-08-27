const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

code = code.replace(
  /<input type="text" required placeholder="VD: Nguyễn Văn A" value=\{\(newLaborData as any\).workerName \|\| ''\} onChange=\{\(e\) => setNewLaborData\(\{\.\.\.newLaborData, workerName: e.target.value\} as any\)\} className="w-full border rounded-lg p-2 font-bold bg-white" \/>/,
  '<CustomSelect value={(newLaborData as any).workerName || \\'\\'} onChange={(e) => setNewLaborData({...newLaborData, workerName: e.target.value} as any)} searchable={true} allowCustomInput={true} placeholder="VD: Nguyễn Văn A" className="w-full border rounded-lg p-2 bg-white font-bold text-xs">{laborWorkerNames.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect>'
);

code = code.replace(
  /<input type="text" required placeholder="VD: Lương thợ điện, Lương phụ hồ\.\.\." value=\{newLaborData\.description\} onChange=\{\(e\) => setNewLaborData\(\{\.\.\.newLaborData, description: e\.target\.value\}\)\} className="w-full border rounded-lg p-2 bg-white" \/>/,
  '<CustomSelect value={newLaborData.description} onChange={(e) => setNewLaborData({...newLaborData, description: e.target.value})} searchable={true} allowCustomInput={true} placeholder="VD: Lương thợ điện, Lương phụ hồ..." className="w-full border rounded-lg p-2 bg-white text-xs">{laborDescriptions.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect>'
);

code = code.replace(
  /<input type="text" placeholder="VD: Nguyễn Chí Công" value=\{newLaborData\.bankInfo\} onChange=\{\(e\) => setNewLaborData\(\{\.\.\.newLaborData, bankInfo: e\.target\.value\}\)\} className="w-full border rounded-lg p-2 font-bold bg-white" \/>/,
  '<CustomSelect value={newLaborData.bankInfo} onChange={(e) => setNewLaborData({...newLaborData, bankInfo: e.target.value})} searchable={true} allowCustomInput={true} placeholder="VD: Nguyễn Chí Công" className="w-full border rounded-lg p-2 bg-white font-bold text-xs">{laborBankInfos.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect>'
);

code = code.replace(
  /<input type="text" required value=\{editingLabor\.workerName \|\| ''\} onChange=\{\(e\) => setEditingLabor\(\{\.\.\.editingLabor, workerName: e\.target\.value\}\)\} className="w-full border rounded-lg p-2 font-bold bg-white" \/>/,
  '<CustomSelect value={editingLabor.workerName || \\'\\'} onChange={(e) => setEditingLabor({...editingLabor, workerName: e.target.value})} searchable={true} allowCustomInput={true} placeholder="VD: Nguyễn Văn A" className="w-full border rounded-lg p-2 bg-white font-bold text-xs">{laborWorkerNames.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect>'
);

code = code.replace(
  /<input type="text" required value=\{editingLabor\.description\} onChange=\{\(e\) => setEditingLabor\(\{\.\.\.editingLabor, description: e\.target\.value\}\)\} className="w-full border rounded-lg p-2 bg-white" \/>/,
  '<CustomSelect value={editingLabor.description} onChange={(e) => setEditingLabor({...editingLabor, description: e.target.value})} searchable={true} allowCustomInput={true} placeholder="VD: Lương thợ điện, Lương phụ hồ..." className="w-full border rounded-lg p-2 bg-white text-xs">{laborDescriptions.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect>'
);

code = code.replace(
  /<input type="text" value=\{editingLabor\.bankInfo\} onChange=\{\(e\) => setEditingLabor\(\{\.\.\.editingLabor, bankInfo: e\.target\.value\}\)\} className="w-full border rounded-lg p-2 font-bold bg-white" \/>/,
  '<CustomSelect value={editingLabor.bankInfo} onChange={(e) => setEditingLabor({...editingLabor, bankInfo: e.target.value})} searchable={true} allowCustomInput={true} placeholder="VD: Nguyễn Chí Công" className="w-full border rounded-lg p-2 bg-white font-bold text-xs">{laborBankInfos.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect>'
);

fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
