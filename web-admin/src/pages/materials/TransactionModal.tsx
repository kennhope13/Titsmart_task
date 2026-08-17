import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { InventoryTransaction, Material } from '../../types';
import { formatNumber, materialCurrentStock } from './inventoryUtils';
import { CustomSelect } from '@/components/common/CustomSelect';

interface TransactionModalProps {
  isOpen: boolean;
  type: 'IMPORT' | 'EXPORT';
  materials: Material[];
  defaultMaterialId?: string;
  onClose: () => void;
  onSave: (transaction: Omit<InventoryTransaction, 'id' | 'createdAt'>) => void;
}

const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white';

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, type, materials, defaultMaterialId, onClose, onSave }) => {
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sourceOrProject, setSourceOrProject] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [notes, setNotes] = useState('');

  const selectedMaterial = useMemo(() => materials.find((material) => material.id === materialId), [materialId, materials]);

  useEffect(() => {
    if (!isOpen) return;
    setMaterialId(defaultMaterialId || materials[0]?.id || '');
    setQuantity(1);
    setDate(new Date().toISOString().split('T')[0]);
    setSourceOrProject('');
    setReceiverName('');
    setNotes('');
  }, [defaultMaterialId, isOpen, materials]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedMaterial) return;

    if (type === 'EXPORT' && quantity > materialCurrentStock(selectedMaterial)) {
      const confirmed = window.confirm(`Số lượng xuất (${quantity}) lớn hơn tồn kho hiện tại (${materialCurrentStock(selectedMaterial)}). Bạn có muốn xuất kho âm không?`);
      if (!confirmed) return;
    }

    onSave({
      type,
      date,
      materialId: selectedMaterial.id,
      materialCode: selectedMaterial.code,
      materialName: selectedMaterial.name,
      category: selectedMaterial.category || '',
      specs: selectedMaterial.specs || selectedMaterial.englishName || '',
      unit: selectedMaterial.unit,
      quantity,
      sourceOrProject,
      receiverName: type === 'EXPORT' ? receiverName : '',
      notes,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={type === 'IMPORT' ? 'Tạo Phiếu Nhập Kho' : 'Tạo Phiếu Xuất Kho'}>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <Field label="Chọn Vật tư *">
          <CustomSelect required value={materialId} onChange={(event) => setMaterialId(event.target.value)} className={inputClass}>
            <option value="" disabled>-- Chọn vật tư --</option>
            {materials.map((material) => (
              <option key={material.id} value={material.id}>[{material.code}] {material.name} (Tồn: {formatNumber(materialCurrentStock(material))} {material.unit})</option>
            ))}
          </CustomSelect>
        </Field>
        {selectedMaterial && (
          <div className="grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200 rounded-lg p-3 text-[11px] text-slate-600">
            <div><b>Danh mục:</b> {selectedMaterial.category || '-'}</div>
            <div><b>Quy cách:</b> {selectedMaterial.specs || selectedMaterial.englishName || '-'}</div>
            <div><b>ĐVT:</b> {selectedMaterial.unit || '-'}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Ngày ${type === 'IMPORT' ? 'nhập' : 'xuất'} *`}><input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></Field>
          <Field label="Số lượng *"><input type="number" required min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className={inputClass} /></Field>
        </div>
        <Field label={type === 'IMPORT' ? 'Nguồn Nhập / Dự Án Dư *' : 'Mã Dự Án / Tên Công Trình *'}><input required value={sourceOrProject} onChange={(event) => setSourceOrProject(event.target.value)} className={inputClass} /></Field>
        {type === 'EXPORT' && <Field label="Người Nhận Vật Tư"><input value={receiverName} onChange={(event) => setReceiverName(event.target.value)} className={inputClass} /></Field>}
        <Field label="Ghi Chú"><input value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} /></Field>
        <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
          <button type="submit" className={`px-5 py-1.5 text-white rounded-lg font-bold hover:opacity-90 ${type === 'IMPORT' ? 'bg-emerald-600' : 'bg-amber-500'}`}>Lưu {type === 'IMPORT' ? 'Nhập Kho' : 'Xuất Kho'}</button>
        </div>
      </form>
    </Modal>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block font-bold text-slate-700 space-y-1">
    <span>{label}</span>
    {children}
  </label>
);
