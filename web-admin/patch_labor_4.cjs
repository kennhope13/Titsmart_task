const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

code = code.replace(
  /<input type="text" value=\{editingLabor\.bankAccount\} onChange=\{\(e\) => setEditingLabor\(\{\.\.\.editingLabor, bankAccount: e\.target\.value\}\)\} className="w-full border rounded-lg p-2 bg-white" \/>/,
  `<CustomSelect value={editingLabor.bankAccount} onChange={(e) => setEditingLabor({...editingLabor, bankAccount: e.target.value})} searchable={true} allowCustomInput={true} placeholder="" className="w-full border rounded-lg p-2 bg-white text-xs">{laborBankAccounts.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect>`
);

code = code.replace(
  /<input type="text" required value=\{editingLabor\.bankInfo\} onChange=\{\(e\) => setEditingLabor\(\{\.\.\.editingLabor, bankInfo: e\.target\.value\}\)\} className="w-full border rounded-lg p-2 font-bold bg-white" \/>/,
  `<CustomSelect value={editingLabor.bankInfo} onChange={(e) => setEditingLabor({...editingLabor, bankInfo: e.target.value})} searchable={true} allowCustomInput={true} placeholder="" className="w-full border rounded-lg p-2 bg-white font-bold text-xs">{laborBankInfos.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}</CustomSelect>`
);

fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
