const fs = require('fs');
const file = 'src/pages/ProjectCostPlanPage.tsx';
let code = fs.readFileSync(file, 'utf8');

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

code = code.replace(
  /(<div className="grid grid-cols-3 gap-3">\s*<div><label className="block font-bold mb-1">VAT \(đ\)<\/label><input type="number" step="any" value=\{String\(editingExpense\.taxAmount \|\| 0\)\})/g,
  match => renderAdditionalItemsUI + '\n            ' + match
);

fs.writeFileSync(file, code, 'utf8');
console.log("Injected into Cập nhật modal successfully");
