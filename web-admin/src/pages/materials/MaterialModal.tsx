import React, { useEffect, useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Material } from '../../types';
import { CONSTRUCTION_STATUSES, normalizeConstructionStatus, normalizePurchaseStatus, PURCHASE_STATUSES, generateMaterialCode } from './inventoryUtils';
import { CustomSelect } from '@/components/common/CustomSelect';

interface MaterialModalProps {
  isOpen: boolean;
  material: Material | null;
  onClose: () => void;
  onSave: (material: Material | null, payload: Omit<Material, 'id'>) => void;
}

const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white';

export const MaterialModal: React.FC<MaterialModalProps> = ({ isOpen, material, onClose, onSave }) => {
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [specs, setSpecs] = useState('');
  const [initialStock, setInitialStock] = useState(0);
  const [unit, setUnit] = useState('Cái');
  const [unitPrice, setUnitPrice] = useState(0);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState('Đã có hàng');
  const [constructionStatus, setConstructionStatus] = useState('Chưa thi công');

  useEffect(() => {
    if (!isOpen) return;
    setCode(material?.code || '');
    setCategory(material?.category || '');
    setName(material?.name || '');
    setSpecs(material?.specs || material?.englishName || '');
    setInitialStock(material?.initialStock || 0);
    setUnit(material?.unit || 'Cái');
    setUnitPrice(material?.unitPrice || 0);
    setSupplier(material?.supplier || '');
    setNotes(material?.notes || '');
    setPurchaseStatus(normalizePurchaseStatus(material?.status));
    setConstructionStatus(normalizeConstructionStatus(material?.constrStatus));
  }, [isOpen, material]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    const totalImport = material?.totalImport || 0;
    const totalExport = material?.totalExport || 0;
    onSave(material, {
      code: code.trim() || generateMaterialCode(name),
      category: category.trim(),
      name: name.trim(),
      englishName: specs.trim(),
      specs: specs.trim(),
      projectCode: material?.projectCode || 'COMPANY',
      projectName: material?.projectName || 'Kho Công Ty',
      volume: initialStock,
      initialStock,
      currentStock: initialStock + totalImport - totalExport,
      totalImport,
      totalExport,
      unit: unit.trim() || 'Cái',
      unitPrice,
      status: purchaseStatus,
      constrStatus: constructionStatus,
      supplier: supplier.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={material ? 'Cập nhật thông tin vật tư' : 'Thêm vật tư mới'}>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        {material && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
            <div className="font-bold text-slate-900">{material.name}</div>
            <div className="text-[11px] text-slate-500 mt-1">{material.code}</div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mã Vật Tư"><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Tạo tự động theo tên" className={`${inputClass} font-mono`} /></Field>
          <Field label="Danh mục"><input value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} /></Field>
        </div>
        <Field label="Tên Vật Tư / Thiết Bị *"><input required value={name} onChange={(event) => setName(event.target.value)} className={`${inputClass} font-bold`} /></Field>
        <Field label="Thông Số Kỹ Thuật / Quy Cách"><input value={specs} onChange={(event) => setSpecs(event.target.value)} className={inputClass} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tồn kho đầu kỳ"><input type="number" step="any" value={initialStock} onChange={(event) => setInitialStock(Number(event.target.value))} className={inputClass} /></Field>
          <Field label="Đơn Vị Tính"><input value={unit} onChange={(event) => setUnit(event.target.value)} className={inputClass} /></Field>
          <Field label="Đơn giá"><input type="number" step="any" value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value))} className={inputClass} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tình trạng mua hàng"><CustomSelect value={purchaseStatus} onChange={(event) => setPurchaseStatus(event.target.value)} className={inputClass}>{PURCHASE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</CustomSelect></Field>
          <Field label="Tình trạng thi công"><CustomSelect value={constructionStatus} onChange={(event) => setConstructionStatus(event.target.value)} className={inputClass}>{CONSTRUCTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</CustomSelect></Field>
        </div>
        <Field label="Nguồn/NCC mặc định"><input value={supplier} onChange={(event) => setSupplier(event.target.value)} className={inputClass} /></Field>
        <Field label="Ghi Chú"><input value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} /></Field>
        <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
          <button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold hover:opacity-90">Lưu</button>
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
