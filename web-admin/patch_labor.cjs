const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

const useMemos = `
  const laborWorkerNames = useMemo(() => {
    const names = new Set<string>();
    labors.forEach(l => { if (l.workerName?.trim()) names.add(l.workerName.trim()); });
    return Array.from(names);
  }, [labors]);

  const laborContents = useMemo(() => {
    const contents = new Set<string>();
    labors.forEach(l => { if (l.content?.trim()) contents.add(l.content.trim()); });
    return Array.from(contents);
  }, [labors]);

  const laborDescriptions = useMemo(() => {
    const desc = new Set<string>();
    labors.forEach(l => { if (l.description?.trim()) desc.add(l.description.trim()); });
    return Array.from(desc);
  }, [labors]);

  const laborUnits = useMemo(() => {
    const units = new Set<string>();
    labors.forEach(l => { if (l.unit?.trim()) units.add(l.unit.trim()); });
    return Array.from(units);
  }, [labors]);

  const laborBankAccounts = useMemo(() => {
    const accounts = new Set<string>();
    labors.forEach(l => { if (l.bankAccount?.trim()) accounts.add(l.bankAccount.trim()); });
    return Array.from(accounts);
  }, [labors]);

  const laborBankInfos = useMemo(() => {
    const infos = new Set<string>();
    labors.forEach(l => { if (l.bankInfo?.trim()) infos.add(l.bankInfo.trim()); });
    return Array.from(infos);
  }, [labors]);
`;

code = code.replace(
  "// ----------------------------------------------------",
  useMemos + "\n  // ----------------------------------------------------"
);

// We need to replace the standard <input type="text"> for the following fields in newLaborData and editingLabor:
// - workerName
// - content
// - description
// - unit
// - bankAccount
// - bankInfo

const createSelect = (valueVar, setter, optionsArray, placeholder = "") => {
  return `<CustomSelect value={${valueVar}} onChange={(e) => ${setter}} searchable={true} allowCustomInput={true} placeholder="${placeholder}" className="w-full border rounded-lg p-2 bg-white font-bold text-xs">
    {${optionsArray}.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
  </CustomSelect>`;
};
const createSelectNonBold = (valueVar, setter, optionsArray, placeholder = "") => {
  return `<CustomSelect value={${valueVar}} onChange={(e) => ${setter}} searchable={true} allowCustomInput={true} placeholder="${placeholder}" className="w-full border rounded-lg p-2 bg-white text-xs">
    {${optionsArray}.map((opt, i) => (<option key={i} value={opt}>{opt}</option>))}
  </CustomSelect>`;
};

// 1. newLaborData substitutions
code = code.replace(
  /<input type="text" value=\{newLaborData\.content\}.*?\/>/,
  createSelectNonBold("newLaborData.content", "setNewLaborData({...newLaborData, content: e.target.value})", "laborContents")
);
code = code.replace(
  /<input type="text" required placeholder="VD: Nguy[\\s\\S]*?V[\\s\\S]*?A" value=\{\(newLaborData as any\)\.workerName \|\| ''\} onChange=\{\(e\) => setNewLaborData\(\{\.\.\.newLaborData, workerName: e\.target\.value\} as any\)\} className="w-full border rounded-lg p-2 font-bold bg-white" \/>/,
  createSelect("newLaborData.workerName || ''", "setNewLaborData({...newLaborData, workerName: e.target.value} as any)", "laborWorkerNames", "VD: Nguyễn Văn A")
);
code = code.replace(
  /<input type="text" required placeholder="VD: L[\\s\\S]*?ng th[\\s\\S]*?[\\s\\S]*?i[\\s\\S]*?n, L[\\s\\S]*?ng ph[\\s\\S]*? h[\\s\\S]*?" value=\{newLaborData\.description\} onChange=\{\(e\) => setNewLaborData\(\{\.\.\.newLaborData, description: e\.target\.value\}\)\} className="w-full border rounded-lg p-2 bg-white" \/>/,
  createSelectNonBold("newLaborData.description", "setNewLaborData({...newLaborData, description: e.target.value})", "laborDescriptions", "VD: Lương thợ điện, Lương phụ hồ...")
);
code = code.replace(
  /<input type="text" value=\{newLaborData\.unit\}.*?\/>/,
  createSelectNonBold("newLaborData.unit", "setNewLaborData({...newLaborData, unit: e.target.value})", "laborUnits")
);
code = code.replace(
  /<input type="text" placeholder="0919996466 - BIDV" value=\{newLaborData\.bankAccount\}.*?\/>/,
  createSelectNonBold("newLaborData.bankAccount", "setNewLaborData({...newLaborData, bankAccount: e.target.value})", "laborBankAccounts", "0919996466 - BIDV")
);
code = code.replace(
  /<input type="text" placeholder="VD: Nguy[\\s\\S]*?n Ch[\\s\\S]*? C[\\s\\S]*?ng" value=\{newLaborData\.bankInfo\}.*?\/>/,
  createSelect("newLaborData.bankInfo", "setNewLaborData({...newLaborData, bankInfo: e.target.value})", "laborBankInfos", "VD: Nguyễn Chí Công")
);

// 2. editingLabor substitutions
code = code.replace(
  /<input type="text" value=\{editingLabor\.content\}.*?\/>/,
  createSelectNonBold("editingLabor.content", "setEditingLabor({...editingLabor, content: e.target.value})", "laborContents")
);
code = code.replace(
  /<input type="text" required placeholder="VD: Nguy[\\s\\S]*?V[\\s\\S]*?A" value=\{\(editingLabor as any\)\.workerName \|\| ''\} onChange=\{\(e\) => setEditingLabor\(\{\.\.\.editingLabor, workerName: e\.target\.value\} as any\)\} className="w-full border rounded-lg p-2 font-bold bg-white" \/>/,
  createSelect("editingLabor.workerName || ''", "setEditingLabor({...editingLabor, workerName: e.target.value} as any)", "laborWorkerNames", "VD: Nguyễn Văn A")
);
code = code.replace(
  /<input type="text" required placeholder="VD: L[\\s\\S]*?ng th[\\s\\S]*?[\\s\\S]*?i[\\s\\S]*?n, L[\\s\\S]*?ng ph[\\s\\S]*? h[\\s\\S]*?" value=\{editingLabor\.description\} onChange=\{\(e\) => setEditingLabor\(\{\.\.\.editingLabor, description: e\.target\.value\}\)\} className="w-full border rounded-lg p-2 bg-white" \/>/,
  createSelectNonBold("editingLabor.description", "setEditingLabor({...editingLabor, description: e.target.value})", "laborDescriptions", "VD: Lương thợ điện, Lương phụ hồ...")
);
code = code.replace(
  /<input type="text" value=\{editingLabor\.unit\}.*?\/>/,
  createSelectNonBold("editingLabor.unit", "setEditingLabor({...editingLabor, unit: e.target.value})", "laborUnits")
);
code = code.replace(
  /<input type="text" placeholder="0919996466 - BIDV" value=\{editingLabor\.bankAccount\}.*?\/>/,
  createSelectNonBold("editingLabor.bankAccount", "setEditingLabor({...editingLabor, bankAccount: e.target.value})", "laborBankAccounts", "0919996466 - BIDV")
);
code = code.replace(
  /<input type="text" placeholder="VD: Nguy[\\s\\S]*?n Ch[\\s\\S]*? C[\\s\\S]*?ng" value=\{editingLabor\.bankInfo\}.*?\/>/,
  createSelect("editingLabor.bankInfo", "setEditingLabor({...editingLabor, bankInfo: e.target.value})", "laborBankInfos", "VD: Nguyễn Chí Công")
);

fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
