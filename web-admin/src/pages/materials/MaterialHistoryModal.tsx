import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Material, InventoryTransaction } from '../../types';
import { formatNumber } from './inventoryUtils';
import { useRealtimeStore } from '../../services/realtimeStore';

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
  const { updateInventoryTransaction, deleteInventoryTransaction } = useRealtimeStore();
  const [editingTx, setEditingTx] = useState<InventoryTransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<InventoryTransaction | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setLoading(true);
    try {
      const formattedDate = editingTx.date ? (editingTx.date.includes('T') ? editingTx.date.split('T')[0] : editingTx.date.slice(0, 10)) : undefined;
      await updateInventoryTransaction(editingTx.id, {
        quantity: Number(editingTx.quantity || 0),
        sourceOrProject: editingTx.sourceOrProject,
        receiverName: editingTx.receiverName,
        notes: editingTx.notes,
        date: formattedDate
      });
      setEditingTx(null);
    } catch(err) {
      console.error('Update transaction failed:', err);
    }
    setLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    setLoading(true);
    try {
      await deleteInventoryTransaction(deletingTx.id);
      setDeletingTx(null);
    } catch(err) {
      console.error('Delete transaction failed:', err);
    }
    setLoading(false);
  };

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
                  <th className="w-10 p-2.5 text-center">STT</th>
                  <th className="w-24 p-2.5">Ngày</th>
                  <th className="w-24 p-2.5 text-center">Loại GD</th>
                  <th className="w-24 p-2.5 text-right">Số lượng</th>
                  <th className="p-2.5">Nguồn nhập / Dự án nhận</th>
                  <th className="w-28 p-2.5">Người nhận</th>
                  <th className="p-2.5">Ghi chú</th>
                  <th className="w-20 p-2.5 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {history.map((tx, idx) => {
                  const isImport = tx.type === 'IMPORT';
                  return (
                    <tr key={tx.id || idx} className="hover:bg-slate-50 transition-colors align-middle">
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
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingTx(tx)}
                            className="p-1 text-slate-400 hover:text-primary rounded hover:bg-slate-100 transition-colors"
                            title="Sửa giao dịch"
                          >
                            <span className="material-symbols-outlined text-[16px]">edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTx(tx)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded hover:bg-slate-100 transition-colors"
                            title="Xóa giao dịch"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {history.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                      Chưa có lịch sử giao dịch nhập/xuất kho cho vật tư này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Edit Transaction */}
        {editingTx && (
          <Modal
            isOpen={true}
            onClose={() => setEditingTx(null)}
            title={`Sửa Giao Dịch (${editingTx.type === 'IMPORT' ? 'Nhập Kho' : 'Xuất Kho'})`}
          >
            <form onSubmit={handleSaveEdit} className="space-y-3 p-1 text-xs">
              <div>
                <label className="block font-bold mb-1">Ngày giao dịch</label>
                <input
                  type="date"
                  value={editingTx.date ? (editingTx.date.includes('T') ? editingTx.date.split('T')[0] : editingTx.date.slice(0, 10)) : ''}
                  onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-white"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Số lượng</label>
                <input
                  type="number"
                  step="any"
                  value={editingTx.quantity || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, quantity: e.target.value === '' ? '' as any : Number(e.target.value) })}
                  className="w-full border rounded-lg p-2 font-bold bg-white"
                  required
                />
              </div>
              <div>
                <label className="block font-bold mb-1">
                  {editingTx.type === 'IMPORT' ? 'Nguồn nhập' : 'Dự án nhận'}
                </label>
                <input
                  type="text"
                  value={editingTx.sourceOrProject || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, sourceOrProject: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-white"
                />
              </div>
              {editingTx.type === 'EXPORT' && (
                <div>
                  <label className="block font-bold mb-1">Người nhận</label>
                  <input
                    type="text"
                    value={editingTx.receiverName || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, receiverName: e.target.value })}
                    className="w-full border rounded-lg p-2 bg-white"
                  />
                </div>
              )}
              <div>
                <label className="block font-bold mb-1">Ghi chú</label>
                <input
                  type="text"
                  value={editingTx.notes || ''}
                  onChange={(e) => setEditingTx({ ...editingTx, notes: e.target.value })}
                  className="w-full border rounded-lg p-2 bg-white"
                />
              </div>
              <div className="pt-3 border-t flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold disabled:opacity-50"
                >
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Modal Delete Confirmation */}
        {deletingTx && (
          <Modal
            isOpen={true}
            onClose={() => setDeletingTx(null)}
            title="Xác nhận xóa giao dịch"
            icon="warning"
          >
            <div className="p-2 space-y-4 text-xs">
              <p className="text-slate-700">
                Bạn có chắc muốn xóa phiếu <strong className="text-rose-600">{deletingTx.type === 'IMPORT' ? 'Nhập kho' : 'Xuất kho'}</strong> với số lượng <strong className="font-bold">{deletingTx.quantity} {material.unit}</strong> không?
              </p>
              <p className="text-slate-500 italic text-[11px]">
                * Sau khi xóa, tồn kho hiện tại sẽ được tự động tính toán lại.
              </p>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setDeletingTx(null)}
                  className="px-4 py-1.5 border rounded-lg font-semibold hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="px-4 py-1.5 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 shadow-xs"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </Modal>
        )}

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

