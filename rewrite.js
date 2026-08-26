const fs = require('fs');
let code = fs.readFileSync('temp_expense.tsx', 'utf8');

// The code starts with:
//         {/* EXPENSE TAB */}
//         {activeTab === 'EXPENSE' && (
//           <div className="h-full flex flex-col min-h-0">
//             <div className="flex border-b border-slate-200 shrink-0 bg-white sticky top-0 z-20 px-4 gap-2">
//               <button ...>
//               <button ...>
//               <button ...>
//             </div>
//             
//             {expenseSubTab === 'SUMMARY' && (
//               <div className="p-4 flex-1 overflow-auto custom-scrollbar">
//                 <CostPlanSummaryTable ...
//               </div>
//             )}
// ...

const summaryRegex = /\{expenseSubTab === 'SUMMARY' && \(\s*<div className=\"[^\"]*\">\s*<CostPlanSummaryTable([\s\S]*?)<\/div>\s*\)\}/;
const detailRegex = /\{expenseSubTab === 'DETAIL' && \(\s*<div className=\"[^\"]*\">\s*([\s\S]*?)<\/div>\s*\)\s*\}\s*\{\/\* LABOR TAB \*\/\}/;
const laborRegex = /\{expenseSubTab === 'LABOR' && \(\s*<div className=\"[^\"]*\">\s*([\s\S]*?)<\/div>\s*\)\}/;

const summaryMatch = code.match(summaryRegex);
const detailMatch = code.match(detailRegex);
const laborMatch = code.match(laborRegex);

if (!summaryMatch || !detailMatch || !laborMatch) {
    console.error('Failed to match one of the sections', !!summaryMatch, !!detailMatch, !!laborMatch);
    process.exit(1);
}

const summaryContent = '<CostPlanSummaryTable' + summaryMatch[1];
let detailContent = detailMatch[1];
let laborContent = laborMatch[1];

// Make tables not scroll internally, let them flow so the main wrapper scrolls them.
// Replace the wrapper flex-1 overflow-auto with overflow-x-auto so they can grow vertically.
detailContent = detailContent.replace(/<div className=\"flex-1 overflow-auto custom-scrollbar\">/, '<div className=\"overflow-x-auto\">');
laborContent = laborContent.replace(/<div className=\"flex-1 overflow-auto custom-scrollbar\">/, '<div className=\"overflow-x-auto\">');

// Detail header insertion:
const addExpenseBtn = `
                    <button 
                      onClick={() => setIsNewExpenseOpen(true)}
                      className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-dark transition-colors shadow-sm ml-auto"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Thêm phiếu chi
                    </button>
`;
// Replace the top bar of DETAIL
detailContent = detailContent.replace(/<div className=\"flex border-b border-slate-200 bg-white px-4 py-2 gap-3 sticky top-0 z-20 items-center justify-between text-xs text-slate-600 flex-wrap\">/,
    '<div className="flex border-b border-slate-100 bg-slate-50 px-5 py-3 gap-3 sticky top-0 z-20 items-center justify-between text-xs text-slate-600 flex-wrap">' +
    '<h2 className="text-[14px] font-extrabold text-slate-800 flex items-center gap-2 uppercase tracking-wide whitespace-nowrap">' +
    '<span className="material-symbols-outlined text-primary text-[18px]">receipt_long</span> CHI TIẾT PHIẾU CHI </h2>');

// Insert add button at the end of the filter div wrapper
detailContent = detailContent.replace(/(<\/div>\s*)<\/div>\s*<div className="overflow-x-auto">/, `$1 ${addExpenseBtn} </div> <div className="overflow-x-auto">`);

// Labor header insertion:
const addLaborBtn = `
                    <button 
                      onClick={() => setIsNewLaborOpen(true)}
                      className="flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-primary-dark transition-colors shadow-sm ml-auto"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Thêm chấm công
                    </button>
`;
laborContent = laborContent.replace(/<div className=\"flex border-b border-slate-200 bg-white px-4 py-2 gap-3 sticky top-0 z-20 items-center justify-between text-xs text-slate-600 flex-wrap\">/,
    '<div className="flex border-b border-slate-100 bg-slate-50 px-5 py-3 gap-3 sticky top-0 z-20 items-center justify-between text-xs text-slate-600 flex-wrap">' +
    '<h2 className="text-[14px] font-extrabold text-slate-800 flex items-center gap-2 uppercase tracking-wide whitespace-nowrap">' +
    '<span className="material-symbols-outlined text-primary text-[18px]">engineering</span> LƯƠNG CÔNG NHẬT </h2>');

laborContent = laborContent.replace(/(<\/div>\s*)<\/div>\s*<div className="overflow-x-auto">/, `$1 ${addLaborBtn} </div> <div className="overflow-x-auto">`);


const newExpenseTab = `
        {/* EXPENSE TAB */}
        {activeTab === 'EXPENSE' && (
          <div className="h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-100 p-4 flex flex-col gap-6" id="expense-unified-view">
            
            {/* 1. TỔNG HỢP QUỸ */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
              <div className="px-5 py-4 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-20">
                <h2 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2 uppercase tracking-wide">
                  <span className="material-symbols-outlined text-primary text-[20px]">account_balance_wallet</span>
                  Tổng hợp quỹ
                </h2>
              </div>
              <div className="p-5">
                ${summaryContent}
              </div>
            </div>

            {/* 2. CHI TIẾT PHIẾU CHI */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 flex flex-col">
              ${detailContent}
            </div>

            {/* 3. LƯƠNG CÔNG NHẬT */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0 flex flex-col mb-10">
              ${laborContent}
            </div>

          </div>
        )}
`;

fs.writeFileSync('temp_expense_new.tsx', newExpenseTab);
console.log('Successfully wrote temp_expense_new.tsx');
