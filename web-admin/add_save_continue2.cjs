const fs = require('fs');
const file = 'src/pages/ProjectCostPlanPage.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add state isSaveAndContinue
if (!code.includes('const [isSaveAndContinue, setIsSaveAndContinue] = useState(false);')) {
  code = code.replace(
    /const \[isNewExpenseOpen, setIsNewExpenseOpen\] = useState\(false\);/,
    `const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);\n  const [isSaveAndContinue, setIsSaveAndContinue] = useState(false);`
  );
}

// 2. Modify Tạo Phiếu Chi onSubmit
code = code.replace(
  /setIsNewExpenseOpen\(false\);\s*setNewExpenseData\(\{stt: '', date:[^}]+\}\);\s*triggerToast\('Đã thêm Chi phí thành công!', 'success'\);/g,
  `if (isSaveAndContinue) {
              setNewExpenseData({
                ...newExpenseData,
                stt: String(Number(newExpenseData.stt || currentProjExpenses.length) + 1),
                description: '',
                unit: 'cái',
                quantity: 1,
                unitPrice: 0,
                taxAmount: 0,
                incomeAmount: 0
              });
              setIsSaveAndContinue(false);
            } else {
              setIsNewExpenseOpen(false);
              setNewExpenseData({stt: '', date: new Date().toISOString().split('T')[0], content: 'Vật tư/ thiết bị', description: '', spenderName: '', unit: 'cái', quantity: 1, unitPrice: 0, notes: '', invoiceUrl: ''});
            }
            triggerToast('Đã thêm Chi phí thành công!', 'success');`
);

// 3. Modify Tạo Phiếu Chi buttons
code = code.replace(
  /<div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick=\{\(\) => setIsNewExpenseOpen\(false\)\} className="px-4 py-1\.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy<\/button><button type="submit" className="px-5 py-1\.5 bg-primary text-white rounded-lg font-bold">Lưu phiếu chi<\/button><\/div>/g,
  `<div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setIsNewExpenseOpen(false)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" onClick={() => setIsSaveAndContinue(true)} className="px-5 py-1.5 bg-indigo-500 hover:bg-indigo-600 transition-colors text-white rounded-lg font-bold">Lưu & Thêm TB khác</button><button type="submit" onClick={() => setIsSaveAndContinue(false)} className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu phiếu chi</button></div>`
);

// 4. Modify Cập nhật Phiếu Chi onSubmit
code = code.replace(
  /setEditingExpense\(null\);\s*triggerToast\('Cập nhật thành công!', 'success'\);/g,
  `setEditingExpense(null);
            triggerToast('Cập nhật thành công!', 'success');
            if (isSaveAndContinue) {
              setIsSaveAndContinue(false);
              setNewExpenseData({
                stt: String(currentProjExpenses.length + 1),
                date: editingExpense.date || new Date().toISOString().split('T')[0],
                content: editingExpense.content || 'Vật tư/ thiết bị',
                description: '',
                spenderName: editingExpense.spenderName || '',
                unit: 'cái',
                quantity: 1,
                unitPrice: 0,
                notes: editingExpense.notes || '',
                invoiceUrl: editingExpense.invoiceUrl || ''
              });
              setTimeout(() => setIsNewExpenseOpen(true), 100);
            }`
);

// 5. Modify Cập nhật Phiếu Chi buttons
code = code.replace(
  /<div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick=\{\(\) => setEditingExpense\(null\)\} className="px-4 py-1\.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy<\/button><button type="submit" className="px-5 py-1\.5 bg-primary text-white rounded-lg font-bold">Lưu thay đổi<\/button><\/div>/g,
  `<div className="pt-3 border-t flex justify-end gap-2"><button type="button" onClick={() => setEditingExpense(null)} className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100">Hủy</button><button type="submit" onClick={() => setIsSaveAndContinue(true)} className="px-5 py-1.5 bg-indigo-500 hover:bg-indigo-600 transition-colors text-white rounded-lg font-bold">Lưu & Thêm TB khác</button><button type="submit" onClick={() => setIsSaveAndContinue(false)} className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold">Lưu thay đổi</button></div>`
);

fs.writeFileSync(file, code, 'utf8');
console.log("Applied save and continue logic using regex.");
