const fs = require('fs');
let code = fs.readFileSync('src/pages/ProjectCostPlanPage.tsx', 'utf8');

const replacement = `
            {/* 1. BẢNG TỔNG QUAN */}
            <div className="shrink-0 w-full overflow-x-auto">
              <CostPlanSummaryTable 
                expenses={currentProjExpenses} 
                labors={currentProjLabor} 
                onAllocateFund={(name, amount) => {
                  if (name === 'KHÁC') return;
                  
                  let targetName = name;
                  let currentTotalFund = 0;
                  let personExpenses: any[] = [];
                  let title = '';
                  
                  if (name === '__PROJECT__') {
                    personExpenses = currentProjExpenses.filter(e => e.spenderName === 'DỰ ÁN' && e.content === 'Quỹ Công Trình');
                    currentTotalFund = currentProjExpenses.reduce((acc, curr) => acc + (curr.incomeAmount || 0), 0);
                    title = 'Quỹ Tổng Công Trình';
                    targetName = 'DỰ ÁN';
                  } else {
                    if (!targetName) {
                      const inputName = window.prompt('Nhập tên người muốn cấp quỹ:');
                      if (!inputName || !inputName.trim()) return;
                      targetName = inputName.trim();
                    }
                    personExpenses = currentProjExpenses.filter(e => e.spenderName === targetName);
                    currentTotalFund = personExpenses.reduce((acc, curr) => acc + (curr.incomeAmount || 0), 0);
                    title = \`Tổng Quỹ cho [\${targetName.toUpperCase()}]\`;
                  }
                  
                  let newTotal = 0;
                  
                  if (amount !== undefined) {
                    newTotal = amount;
                  } else {
                    const input = window.prompt(\`Cập nhật \${title}:\\n(Nhập số tiền, hiện tại là: \${currentTotalFund.toLocaleString('vi-VN')})\`, currentTotalFund.toString());
                    if (input === null) return;
                    
                    newTotal = parseInt(input.replace(/[,.]/g, ''), 10);
                    if (isNaN(newTotal)) {
                      triggerToast('Số tiền không hợp lệ', 'warning');
                      return;
                    }
                  }
                  
                  const diff = newTotal - currentTotalFund;
                  if (diff === 0) return;
                  
                  const adjustmentContent = name === '__PROJECT__' ? 'Quỹ Công Trình' : 'Cấp quỹ';
                  const adjustmentRecord = personExpenses.find(e => e.content === adjustmentContent && (e.totalAmount || 0) === 0);
                  
                  if (adjustmentRecord) {
                    updateExpense(adjustmentRecord.id, {
                      ...adjustmentRecord,
                      incomeAmount: (adjustmentRecord.incomeAmount || 0) + diff,
                      balanceFund: (adjustmentRecord.balanceFund || 0) + diff
                    });
                  } else {
                    addExpense({
                      projectCode: selectedProject,
                      spenderName: targetName,
                      content: adjustmentContent,
                      description: name === '__PROJECT__' ? 'Khởi tạo Quỹ Công Trình' : \`Cấp quỹ cho \${targetName}\`,
                      date: new Date().toISOString().split('T')[0],
                      quantity: 0,
                      unitPrice: 0,
                      taxAmount: 0,
                      totalAmount: 0,
                      incomeAmount: diff,
                      balanceFund: diff
                    } as any);
                  }
                  triggerToast(\`Đã cập nhật \${title.toLowerCase()}\`, 'success');
                }}
              />
            </div>

            {/* CHI TIẾT PHIẾU CHI */}
`;

const blockRegex = /\{\/\* 1\. TỔNG HỢP QUỸ \*\/\}[\s\S]*?\{\/\* 2\. CHI TIẾT PHIẾU CHI \*\/\}/;
code = code.replace(blockRegex, replacement);

code = code.replace(/<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 flex flex-col">/, '<div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">');

fs.writeFileSync('src/pages/ProjectCostPlanPage.tsx', code);
