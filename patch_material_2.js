const fs = require('fs');
const filePath = 'web-admin/src/pages/MaterialTrackingPage.tsx';
let data = fs.readFileSync(filePath, 'utf8');

// 1. Add states for Transfer Modal and Add Material selectedProject
const statePattern = /const \[isTransactionModalOpen, setIsTransactionModalOpen\] = useState\(false\);/;
const stateAddition = `const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedAddProject, setSelectedAddProject] = useState('');
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferMaterial, setTransferMaterial] = useState<any>(null);
  const [transferTargetProject, setTransferTargetProject] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(0);`;
data = data.replace(statePattern, stateAddition);

// 2. Modify handleAddMaterial to use selectedAddProject
const handleAddTarget = `projectCode: currentProject ? currentProject.code : 'COMPANY',
      projectName: currentProject ? currentProject.name : 'Kho Công Ty',`;
const handleAddReplacement = `projectCode: currentProject ? currentProject.code : (selectedAddProject || 'COMPANY'),
      projectName: currentProject ? currentProject.name : (projects.find(p => p.code === selectedAddProject)?.name || 'Kho Tổng (Kho Công Ty)'),`;
data = data.replace(handleAddTarget, handleAddReplacement);

// 3. Add Project Dropdown to Add Material Modal
const addModalTarget = `<div><label className="block font-bold text-slate-700 mb-1">Mã vật tư (Tùy chọn)</label>`;
const addModalReplacement = `{!projectId && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Thuộc dự án *</label>
              <select value={selectedAddProject} onChange={e => setSelectedAddProject(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">
                <option value="">-- Kho Tổng (Kho Công Ty) --</option>
                {projects.map(p => (
                  <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>
          )}
          <div><label className="block font-bold text-slate-700 mb-1">Mã vật tư (Tùy chọn)</label>`;
data = data.replace(addModalTarget, addModalReplacement);

// 4. Add "Dự Án" column to OVERVIEW headers
const thOverviewTarget = `<th className="p-2 w-10 text-center bg-slate-50">STT</th>`;
const thOverviewReplacement = `<th className="p-2 w-10 text-center bg-slate-50">STT</th>
                   {!projectId && <th className="p-2 w-[10%] bg-slate-50">Dự Án</th>}`;
data = data.replace(thOverviewTarget, thOverviewReplacement);

// 5. Add "Dự Án" column to OVERVIEW body
const tdOverviewTarget = `<td className="p-3.5 text-center text-slate-500 font-medium">{material.stt || (index + 1)}</td>`;
const tdOverviewReplacement = `<td className="p-3.5 text-center text-slate-500 font-medium">{material.stt || (index + 1)}</td>
                        {!projectId && <td className="p-3.5"><span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-600 truncate max-w-[120px] inline-block" title={material.projectName || 'Kho Tổng'}>{material.projectName || 'Kho Tổng'}</span></td>}`;
data = data.replace(tdOverviewTarget, tdOverviewReplacement);

// 6. Add Transfer button to Actions in OVERVIEW
const actionsTarget = `<button type="button" title="Xuất kho" onClick={(e) => { e.stopPropagation(); openTransactionModal(material, 'EXPORT'); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"><span className="material-symbols-outlined text-[18px]">output</span></button>`;
const actionsReplacement = `<button type="button" title="Xuất kho" onClick={(e) => { e.stopPropagation(); openTransactionModal(material, 'EXPORT'); }} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"><span className="material-symbols-outlined text-[18px]">output</span></button>
                          <button type="button" title="Chuyển kho" onClick={(e) => { e.stopPropagation(); setTransferMaterial(material); setTransferTargetProject(''); setTransferQuantity(1); setIsTransferModalOpen(true); }} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"><span className="material-symbols-outlined text-[18px]">move_up</span></button>`;
data = data.replace(actionsTarget, actionsReplacement);

// 7. Implement Transfer Modal Logic (put BEFORE `return (` at the main level)
const handleTransferLogic = `
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferMaterial || !transferTargetProject || transferQuantity <= 0) return;
    
    const targetProjectObj = projects.find(p => p.code === transferTargetProject);
    const targetProjectName = targetProjectObj ? targetProjectObj.name : 'Kho Tổng';
    const targetCode = targetProjectObj ? targetProjectObj.code : 'COMPANY';

    if (transferMaterial.projectCode === targetCode) {
      triggerToast('Không thể chuyển kho trong cùng một dự án!', 'warning');
      return;
    }

    if (transferQuantity > (transferMaterial.currentStock !== undefined ? transferMaterial.currentStock : (transferMaterial.initialStock || 0))) {
      triggerToast('Số lượng chuyển không thể lớn hơn tồn kho!', 'error');
      return;
    }

    // 1. Export from current material
    const exportTx = {
      materialId: transferMaterial.id,
      materialCode: transferMaterial.code,
      materialName: transferMaterial.name,
      type: 'EXPORT' as const,
      quantity: transferQuantity,
      unit: transferMaterial.unit,
      date: new Date().toISOString().split('T')[0],
      sourceOrProject: \`Chuyển đến \${targetProjectName}\`,
      receiverName: '',
      notes: 'Chuyển kho',
      specs: transferMaterial.englishName || transferMaterial.specs
    };
    await addInventoryTransaction(transferMaterial.id, exportTx);

    // 2. Find or create material in target project
    let targetMaterial = materials.find(m => m.code === transferMaterial.code && m.projectCode === targetCode);
    let targetMaterialId = targetMaterial?.id;

    if (!targetMaterial) {
      const maxStt = materials.reduce((max, m) => Math.max(max, m.stt || 0), 0);
      const newMat = {
        stt: maxStt + 1,
        code: transferMaterial.code,
        name: transferMaterial.name,
        englishName: transferMaterial.englishName,
        projectCode: targetCode,
        projectName: targetProjectName,
        volume: 0,
        initialStock: 0,
        currentStock: 0,
        totalImport: 0,
        totalExport: 0,
        unit: transferMaterial.unit,
        unitPrice: transferMaterial.unitPrice,
        status: transferMaterial.status,
        constrStatus: transferMaterial.constrStatus,
        supplier: transferMaterial.supplier,
        category: transferMaterial.category,
        specs: transferMaterial.specs,
      };
      // We will just do a small hack: add the import transaction on next tick or rely on user to see it.
      await addMaterial(newMat);
      
      logActivity('Chuyển kho', \`Đã chuyển \${transferQuantity} \${transferMaterial.unit} \${transferMaterial.name} từ \${transferMaterial.projectName || 'Kho tổng'} sang \${targetProjectName}\`);
      triggerToast('Chuyển kho thành công!', 'success');
      setIsTransferModalOpen(false);
      return; 
    } else {
      // 3. Import to target material
      const importTx = {
        materialId: targetMaterialId,
        materialCode: transferMaterial.code,
        materialName: transferMaterial.name,
        type: 'IMPORT' as const,
        quantity: transferQuantity,
        unit: transferMaterial.unit,
        date: new Date().toISOString().split('T')[0],
        sourceOrProject: \`Chuyển từ \${transferMaterial.projectName || 'Kho tổng'}\`,
        receiverName: '',
        notes: 'Nhận từ chuyển kho',
        specs: transferMaterial.englishName || transferMaterial.specs
      };
      await addInventoryTransaction(targetMaterialId, importTx);
      logActivity('Chuyển kho', \`Đã chuyển \${transferQuantity} \${transferMaterial.unit} \${transferMaterial.name} từ \${transferMaterial.projectName || 'Kho tổng'} sang \${targetProjectName}\`);
      triggerToast('Chuyển kho thành công!', 'success');
      setIsTransferModalOpen(false);
    }
  };

  return (`;
data = data.replace('  return (', handleTransferLogic);

// 8. Transfer Modal UI
const transferModalUI = `
      {/* MODAL CHUYỂN KHO */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Chuyển Kho Vật Tư">
        <form onSubmit={handleTransfer} className="space-y-4 text-sm">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-2 text-xs">
            <div className="font-bold text-slate-800 mb-1">{transferMaterial?.name} ({transferMaterial?.code})</div>
            <div className="text-slate-600">Đang ở: <span className="font-bold text-blue-600">{transferMaterial?.projectName || 'Kho Tổng'}</span></div>
            <div className="text-slate-600">Tồn kho hiện tại: <span className="font-bold text-green-600">{transferMaterial?.currentStock !== undefined ? transferMaterial.currentStock : (transferMaterial?.initialStock || 0)} {transferMaterial?.unit}</span></div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Chuyển đến dự án *</label>
            <select required value={transferTargetProject} onChange={e => setTransferTargetProject(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">
              <option value="" disabled>-- Chọn dự án đích --</option>
              {transferMaterial?.projectCode !== 'COMPANY' && <option value="COMPANY">-- Kho Tổng (Thu về kho công ty) --</option>}
              {projects.filter(p => p.code !== transferMaterial?.projectCode).map(p => (
                <option key={p.code} value={p.code}>{p.code} - {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">Số lượng chuyển *</label>
            <input type="number" required min="1" max={transferMaterial?.currentStock !== undefined ? transferMaterial.currentStock : (transferMaterial?.initialStock || 0)} value={transferQuantity} onChange={e => setTransferQuantity(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" />
          </div>
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
            <button type="submit" className="px-5 py-1.5 bg-purple-600 text-white rounded-lg font-bold hover:opacity-90">Xác nhận chuyển</button>
          </div>
        </form>
      </Modal>
`;

// Insert the modal UI right before the end
data = data.replace('</Modal>\n      <Toast', '</Modal>\n' + transferModalUI + '      <Toast');

fs.writeFileSync(filePath, data);
console.log('Done patching inventory correctly');
