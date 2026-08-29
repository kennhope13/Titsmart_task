const fs = require('fs');
const file = 'src/pages/ProjectCostPlanPage.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /setEditingExpense\(null\);\s*triggerToast\('Đã cập nhật Chi phí thành công!', 'success'\);/g,
  `setEditingExpense(null);
            triggerToast('Đã cập nhật Chi phí thành công!', 'success');
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
                taxAmount: 0,
                incomeAmount: 0,
                notes: editingExpense.notes || '',
                invoiceUrl: editingExpense.invoiceUrl || ''
              });
              setTimeout(() => setIsNewExpenseOpen(true), 100);
            }`
);

fs.writeFileSync(file, code, 'utf8');
console.log("Applied save and continue logic for editing.");
