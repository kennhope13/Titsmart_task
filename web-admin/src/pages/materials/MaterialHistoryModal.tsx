import React from 'react';
import { Modal } from '../../components/common/Modal';
import { Material, InventoryTransaction } from '../../types';
import { formatNumber, materialCurrentStock } from './inventoryUtils';

interface MaterialHistoryModalProps {
  isOpen: boolean;
  material: Material | null;
  transactions: InventoryTransaction[];
  onClose: () => void;
}

export const MaterialHistoryModal: React.FC<MaterialHistoryModalProps> = ({
  isOpen,
  material,
  transactions,
  onClose,
}) => {
  if (!material) return null;

  // Filter transactions belonging to this material
  const history = transactions
    .filter((tx) => {
      if (tx.materialId === material.id) return true;
      if (tx.materialCode && material.code && tx.materialCode.trim().toLowerCase() === material.code.trim().toLowerCase()) return true;
      
      // Fallback matching by specs / materialName if code was updated or normalized
      const cleanTxCode = (tx.materialCode || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const cleanMatCode = (material.code || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      if (cleanTxCode && cleanMatCode && (cleanTxCode.includes(cleanMatCode) || cleanMatCode.includes(cleanTxCode))) return true;

      if (material.specs && tx.specs && material.specs.trim().toLowerCase() === tx.specs.trim().toLowerCase()) {
        const matName = (material.name || '').toLowerCase();
        const txName = (tx.materialName || '').toLowerCase();
        if (!matName || !txName || matName.includes(txName) || txName.includes(matName)) return true;
      }
      return false;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt || b.date || 0).getTime() -
        new Date(a.createdAt || a.date || 0).getTime()
    );

  const totalImported = history
    .filter((tx) => tx.type === 'IMPORT')
    .reduce((sum, tx) => sum + (tx.quantity || 0), 0);

  const totalExported = history
    .filter((tx) => tx.type === 'EXPORT')
    .reduce((sum, tx) => sum + (tx.quantity || 0), 0);

  // Tồn kho hiện tại = Tồn đầu kỳ + Tổng Nhập từ giao dịch - Tổng Xuất từ giao dịch
  const currentStock = (material.initialStock || 0) + (totalImported || material.totalImport || 0) - (totalExported || material.totalExport || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Lịch sử Giao dịch: [${material.code}] ${material.name}`}
      size="xl"
    >
      <div className="space-y-4 text-xs">
        {/* Header Summary Cards */}
        <div className="grid grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
          <div className="bg-white p-2.5 rounded-lg border border-slate-100 shadow-sm">
            <div className="text-[11px] text-slate-500 font-medium">Tồn đầu kỳ</div>
            <div className="text-base font-bold text-slate-800 mt-0.5">
              {formatNumber(material.initialStock || 0)} <span className="text-xs font-normal text-slate-500">{material.unit}</span>
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-emerald-100 shadow-sm">
            <div className="text-[11px] text-emerald-600 font-medium">Tổng Nhập Kho</div>
            <div className="text-base font-bold text-emerald-600 mt-0.5">
              +{formatNumber(totalImported || material.totalImport || 0)}{' '}
              <span className="text-xs font-normal text-slate-500">{material.unit}</span>
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-amber-100 shadow-sm">
            <div className="text-[11px] text-amber-600 font-medium">Tổng Xuất Kho</div>
            <div className="text-base font-bold text-amber-600 mt-0.5">
              -{formatNumber(totalExported || material.totalExport || 0)}{' '}
              <span className="text-xs font-normal text-slate-500">{material.unit}</span>
            </div>
          </div>
          <div className="bg-white p-2.5 rounded-lg border border-blue-100 shadow-sm">
            <div className="text-[11px] text-primary font-medium">Tồn Kho Hiện Tại</div>
            <div className="text-base font-bold text-primary mt-0.5">
              {formatNumber(currentStock)}{' '}
              <span className="text-xs font-normal text-slate-500">{material.unit}</span>
            </div>
          </div>
        </div>

        {/* Info Specs */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-slate-600 text-xs px-1">
          <div><span className="font-semibold text-slate-700">Kho / Dự án:</span> {material.projectName || 'Kho Tổng'}</div>
          <div><span className="font-semibold text-slate-700">Danh mục:</span> {material.category || 'Vật tư chung'}</div>
          {material.specs && <div><span className="font-semibold text-slate-700">Quy cách:</span> {material.specs}</div>}
        </div>

        {/* Transaction History Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
          <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                <tr>
                  <th className="w-12 p-2.5 text-center">STT</th>
                  <th className="w-24 p-2.5">Ngày</th>
                  <th className="w-24 p-2.5 text-center">Loại GD</th>
                  <th className="w-24 p-2.5 text-right">Số lượng</th>
                  <th className="p-2.5">Nguồn nhập / Dự án nhận</th>
                  <th className="w-28 p-2.5">Người nhận</th>
                  <th className="p-2.5">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {history.map((tx, idx) => {
                  const isImport = tx.type === 'IMPORT';
                  return (
                    <tr key={tx.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                      <td className="p-2.5 font-semibold text-slate-800">
                        {tx.date ? new Date(tx.date).toLocaleDateString('vi-VN') : '-'}
                      </td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold ${
                            isImport ? 'text-emerald-700' : 'text-amber-700'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {isImport ? 'arrow_downward' : 'arrow_upward'}
                          </span>
                          {isImport ? 'Nhập kho' : 'Xuất kho'}
                        </span>
                      </td>
                      <td
                        className={`p-2.5 text-right font-bold text-sm ${
                          isImport ? 'text-emerald-600' : 'text-amber-600'
                        }`}
                      >
                        {isImport ? '+' : '-'}{formatNumber(tx.quantity)}
                      </td>
                      <td className="p-2.5 font-medium text-slate-800">
                        {tx.sourceOrProject || '-'}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {tx.receiverName || '-'}
                      </td>
                      <td className="p-2.5 text-slate-500 italic">
                        {tx.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                      Chưa có lịch sử giao dịch nhập/xuất kho cho vật tư này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-2 flex justify-end border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};
