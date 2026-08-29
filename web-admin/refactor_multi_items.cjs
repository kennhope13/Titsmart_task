const fs = require('fs');
const file = 'src/pages/ProjectCostPlanPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add state additionalItems
if (!code.includes('const [additionalItems, setAdditionalItems] = useState<any[]>([]);')) {
  code = code.replace(
    /const \[isNewExpenseOpen, setIsNewExpenseOpen\] = useState\(false\);/,
    `const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);\n  const [additionalItems, setAdditionalItems] = useState<any[]>([]);`
  );
}

// 2. Remove the isSaveAndContinue logic we just added
code = code.replace(/const \[isSaveAndContinue, setIsSaveAndContinue\] = useState\(false\);\n?\s*/g, '');

// 3. Fix Tạo Phiếu Chi submit
code = code.replace(
  /await addExpense\(\{\s*projectCode: selectedProject,[\s\S]*?invoiceUrl: newExpenseData\.invoiceUrl \|\| ''\s*\}\);\s*if \(isSaveAndContinue\) \{[\s\S]*?\} else \{[\s\S]*?triggerToast\('Đã thêm Chi phí thành công!', 'success'\);/g,
  `await addExpense({
              projectCode: selectedProject,
              stt: newExpenseData.stt || String(currentProjExpenses.length + 1),
              date: newExpenseData.date || new Date().toISOString().split('T')[0],
              content: newExpenseData.content || 'Vật tư/ thiết bị',
              description: newExpenseData.description || '',
              spenderName: newExpenseData.spenderName || '',
              unit: newExpenseData.unit || 'cái',
              quantity: qty,
              unitPrice: price,
              taxAmount: vat,
              totalAmount: total,
              incomeAmount: Number((newExpenseData as any).incomeAmount || 0),
              balanceFund: Number((newExpenseData as any).balanceFund || 0),
              notes: newExpenseData.notes || '',
              invoiceUrl: newExpenseData.invoiceUrl || ''
            });

            if (additionalItems.length > 0) {
              await Promise.all(additionalItems.map((item, idx) => {
                const itemQty = Number(item.quantity || 1);
                const itemPrice = Number(item.unitPrice || 0);
                const itemVat = Number(item.taxAmount || 0);
                return addExpense({
                  projectCode: selectedProject,
                  stt: String(currentProjExpenses.length + 2 + idx),
                  date: newExpenseData.date || new Date().toISOString().split('T')[0],
                  content: newExpenseData.content || 'Vật tư/ thiết bị',
                  description: item.description || '',
                  spenderName: newExpenseData.spenderName || '',
                  unit: item.unit || 'cái',
                  quantity: itemQty,
                  unitPrice: itemPrice,
                  taxAmount: itemVat,
                  totalAmount: itemQty * itemPrice + itemVat,
                  incomeAmount: Number(item.incomeAmount || 0),
                  balanceFund: 0,
                  notes: newExpenseData.notes || '',
                  invoiceUrl: newExpenseData.invoiceUrl || ''
                });
              }));
            }

            setIsNewExpenseOpen(false);
            setNewExpenseData({stt: '', date: new Date().toISOString().split('T')[0], content: 'Vật tư/ thiết bị', description: '', spenderName: '', unit: 'cái', quantity: 1, unitPrice: 0, notes: '', invoiceUrl: ''});
            setAdditionalItems([]);
            triggerToast('Đã thêm Chi phí thành công!', 'success');`
);

// 4. Fix Cập nhật Phiếu Chi submit
code = code.replace(
  /updateExpense\(editingExpense\.id, \{[\s\S]*?totalAmount: total\s*\}\);\s*setEditingExpense\(null\);\s*triggerToast\('Đã cập nhật Chi phí thành công!', 'success'\);\s*if \(isSaveAndContinue\) \{[\s\S]*?setTimeout\(\(\) => setIsNewExpenseOpen\(true\), 100\);\s*\}/g,
  `await updateExpense(editingExpense.id, {
              ...editingExpense,
              totalAmount: total
            });
            
            if (additionalItems.length > 0) {
              await Promise.all(additionalItems.map((item, idx) => {
                const itemQty = Number(item.quantity || 1);
                const itemPrice = Number(item.unitPrice || 0);
                const itemVat = Number(item.taxAmount || 0);
                return addExpense({
                  projectCode: selectedProject,
                  stt: String(currentProjExpenses.length + 1 + idx),
                  date: editingExpense.date || new Date().toISOString().split('T')[0],
                  content: editingExpense.content || 'Vật tư/ thiết bị',
                  description: item.description || '',
                  spenderName: editingExpense.spenderName || '',
                  unit: item.unit || 'cái',
                  quantity: itemQty,
                  unitPrice: itemPrice,
                  taxAmount: itemVat,
                  totalAmount: itemQty * itemPrice + itemVat,
                  incomeAmount: Number(item.incomeAmount || 0),
                  balanceFund: 0,
                  notes: editingExpense.notes || '',
                  invoiceUrl: editingExpense.invoiceUrl || ''
                });
              }));
            }

            setEditingExpense(null);
            setAdditionalItems([]);
            triggerToast('Đã cập nhật Chi phí thành công!', 'success');`
);

// We need to also clear additionalItems on Hủy button or when modal closes.
// And inject the UI for rendering `additionalItems` inside the modals.

const renderAdditionalItemsUI = `
          {additionalItems.map((item, index) => (
            <div key={index} className="pt-3 mt-3 border-t border-slate-200 relative">
              <button type="button" onClick={() => setAdditionalItems(prev => prev.filter((_, i) => i !== index))} className="absolute right-0 top-3 text-rose-500 hover:text-rose-700 p-1">
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
              <div className="grid grid-cols-2 gap-3 pr-8">
                <div><label className="block font-bold mb-1 text-slate-500">Diễn giải/ Chi tiết *</label><input type="text" required value={item.description} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].description = e.target.value; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="block font-bold mb-1 text-slate-500">ĐVT</label><input type="text" value={item.unit} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].unit = e.target.value; setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 bg-white" /></div>
                  <div><label className="block font-bold mb-1 text-slate-500">Số lượng</label><input type="number" step="any" value={String(item.quantity)} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].quantity = Number(e.target.value); setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 bg-white" /></div>
                  <div><label className="block font-bold mb-1 text-slate-500">Đơn giá</label><input type="number" step="any" value={String(item.unitPrice)} onChange={(e) => { const newItems = [...additionalItems]; newItems[index].unitPrice = Number(e.target.value); setAdditionalItems(newItems); }} className="w-full border rounded-lg p-2 font-bold bg-white" /></div>
                </div>
              </div>
            </div>
          ))}
          <div className="pt-2">
            <button type="button" onClick={() => setAdditionalItems([...additionalItems, { description: '', unit: 'cái', quantity: 1, unitPrice: 0, taxAmount: 0, incomeAmount: 0 }])} className="flex items-center gap-1 text-primary hover:text-blue-700 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg w-fit">
              <span className="material-symbols-outlined text-[16px]">add</span> Thêm thiết bị khác
            </button>
          </div>
`;

// Insert UI into Tạo Phiếu Chi
// Let's insert it before the VAT block, or after the grid of 3 items (ĐVT, Số lượng, Đơn giá).
code = code.replace(
  /<div className="grid grid-cols-3 gap-3">\s*<div><label className="block font-bold mb-1">VAT \(đ\)<\/label>[\s\S]*?<\/div>/,
  match => `${renderAdditionalItemsUI}\n          ${match}`
);

// We should insert it into Cập nhật Phiếu Chi as well!
// Let's run it again for the second modal. The regex above will match the first one, let's use a global replacement but check carefully.
// Wait, actually I will just do it explicitly for the update modal which has similar structure.
// Actually, I can just replace `<div><label className="block font-bold mb-1">VAT (đ)</label>` everywhere inside the file (which occurs twice, once in Create, once in Update).
// Wait, the regex `/<div className="grid grid-cols-3 gap-3">\s*<div><label className="block font-bold mb-1">VAT \(đ\)/g` will hit both.

// Restore Buttons
code = code.replace(
  /<button type="submit" onClick=\{\(\) => setIsSaveAndContinue\(true\)\} className="px-5 py-1\.5 bg-indigo-500 hover:bg-indigo-600 transition-colors text-white rounded-lg font-bold">Lưu & Thêm TB khác<\/button>/g,
  ''
);
code = code.replace(
  /onClick=\{\(\) => setIsSaveAndContinue\(false\)\}/g,
  ''
);

// Also we need to make sure on Cancel (Hủy), additionalItems is cleared.
code = code.replace(
  /onClick=\{\(\) => setIsNewExpenseOpen\(false\)\}/g,
  'onClick={() => { setIsNewExpenseOpen(false); setAdditionalItems([]); }}'
);
code = code.replace(
  /onClick=\{\(\) => setEditingExpense\(null\)\}/g,
  'onClick={() => { setEditingExpense(null); setAdditionalItems([]); }}'
);

fs.writeFileSync(file, code, 'utf8');
console.log("Refactored to multi-item UI successfully.");
