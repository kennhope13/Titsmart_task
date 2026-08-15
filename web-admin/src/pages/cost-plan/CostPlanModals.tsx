import React from 'react';
import { ProjectMaterialPlan, ProjectPurchasing, ProjectExpense, LaborPayroll } from '../../types';
import { Modal } from '../../components/common/Modal';
import { ImageUpload } from '../../components/common/ImageUpload';

interface ModalsProps {
  // Plan Modal
  isNewPlanOpen: boolean;
  setIsNewPlanOpen: (v: boolean) => void;
  editingPlan: ProjectMaterialPlan | null;
  setEditingPlan: (v: ProjectMaterialPlan | null) => void;
  selectedProject: string;
  onSavePlan: (p: any) => void;
  
  // Purchasing Modal
  isNewPurchasingOpen: boolean;
  setIsNewPurchasingOpen: (v: boolean) => void;
  editingPurchasing: ProjectPurchasing | null;
  setEditingPurchasing: (v: ProjectPurchasing | null) => void;
  onSavePurchasing: (p: any) => void;

  // Expense Modal
  isNewExpenseOpen: boolean;
  setIsNewExpenseOpen: (v: boolean) => void;
  editingExpense: ProjectExpense | null;
  setEditingExpense: (v: ProjectExpense | null) => void;
  onSaveExpense: (p: any) => void;

  // Labor Modal
  isNewLaborOpen: boolean;
  setIsNewLaborOpen: (v: boolean) => void;
  editingLabor: LaborPayroll | null;
  setEditingLabor: (v: LaborPayroll | null) => void;
  onSaveLabor: (p: any) => void;
}

export const CostPlanModals: React.FC<ModalsProps> = ({
  isNewPlanOpen, setIsNewPlanOpen, editingPlan, setEditingPlan, selectedProject, onSavePlan,
  isNewPurchasingOpen, setIsNewPurchasingOpen, editingPurchasing, setEditingPurchasing, onSavePurchasing,
  isNewExpenseOpen, setIsNewExpenseOpen, editingExpense, setEditingExpense, onSaveExpense,
  isNewLaborOpen, setIsNewLaborOpen, editingLabor, setEditingLabor, onSaveLabor
}) => {
  // Forms use local state managed inside Modals or rely on editingPlan reference. 
  // For simplicity, we just use uncontrolled forms with defaultValue in this refactored version.
  
  const handlePlanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = Object.fromEntries(formData);
    data.projectCode = selectedProject;
    onSavePlan(data);
  };

  const handlePurchasingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = Object.fromEntries(formData);
    data.projectCode = selectedProject;
    data.volumeContract = Number(data.volumeContract || 0);
    data.volumeOrder = Number(data.volumeOrder || 0);
    data.unitPrice = Number(data.unitPrice || 0);
    data.totalAmount = Number(data.totalAmount || 0);
    data.prepayAmount = Number(data.prepayAmount || 0);
    data.remainingAmount = Number(data.remainingAmount || 0);
    data.prepayPercent = Number(data.prepayPercent || 0);
    onSavePurchasing(data);
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = Object.fromEntries(formData);
    data.projectCode = selectedProject;
    data.quantity = Number(data.quantity || 0);
    data.unitPrice = Number(data.unitPrice || 0);
    data.taxAmount = Number(data.taxAmount || 0);
    data.totalAmount = Number(data.totalAmount || 0);
    onSaveExpense(data);
  };

  const handleLaborSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data: any = Object.fromEntries(formData);
    data.projectCode = selectedProject;
    data.quantity = Number(data.quantity || 0);
    data.unitPrice = Number(data.unitPrice || 0);
    data.totalAmount = Number(data.totalAmount || 0);
    onSaveLabor(data);
  };

  // Helper calculation for Purchasing Form
  const calcPurchasing = (e: React.ChangeEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const volume = Number(form.volumeOrder.value || 0);
    const price = Number(form.unitPrice.value || 0);
    form.totalAmount.value = (volume * price).toString();
    const prepay = Number(form.prepayAmount.value || 0);
    if (prepay > 0 && form.totalAmount.value > 0) {
      form.prepayPercent.value = (prepay / Number(form.totalAmount.value)).toFixed(2);
    }
    form.remainingAmount.value = (Number(form.totalAmount.value) - prepay).toString();
  };

  const calcExpense = (e: React.ChangeEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const qty = Number(form.quantity.value || 0);
    const price = Number(form.unitPrice.value || 0);
    const tax = Number(form.taxAmount.value || 0);
    form.totalAmount.value = (qty * price + tax).toString();
  };

  const calcLabor = (e: React.ChangeEvent<HTMLFormElement>) => {
    const form = e.currentTarget;
    const qty = Number(form.quantity.value || 0);
    const price = Number(form.unitPrice.value || 0);
    form.totalAmount.value = (qty * price).toString();
  };

  return (
    <>
      {/* 1. Material Plan Modal */}
      {(isNewPlanOpen || editingPlan) && (
        <Modal 
          isOpen={true} 
          onClose={() => { setIsNewPlanOpen(false); setEditingPlan(null); }}
          title={editingPlan ? 'Chỉnh sửa Kế hoạch Vật tư' : 'Thêm Kế hoạch Vật tư mới'}
          size="lg"
        >
          <form onSubmit={handlePlanSubmit} className="space-y-6">
            {editingPlan && <input type="hidden" name="id" defaultValue={editingPlan.id} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-slate-700 mb-1">STT</label><input type="text" name="stt" defaultValue={editingPlan?.stt} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Hạng mục/Công việc/Thiết bị *</label><input type="text" name="jobContent" required defaultValue={editingPlan?.jobContent} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị tính</label><input type="text" name="unit" defaultValue={editingPlan?.unit} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Khối lượng Hợp đồng</label><input type="text" name="contractVolume" defaultValue={editingPlan?.contractVolume} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              
              <div className="md:col-span-2 border-t pt-4 mt-2"><h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-lg">engineering</span> Yêu cầu Kỹ thuật</h4></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">TCKT, Chủng loại, Model</label><input type="text" name="techSpecModel" defaultValue={editingPlan?.techSpecModel} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Xuất xứ, Nhà SX</label><input type="text" name="techSpecOrigin" defaultValue={editingPlan?.techSpecOrigin} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              
              <div className="md:col-span-2 border-t pt-4 mt-2"><h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-lg">local_shipping</span> Đặt hàng & Tiến độ</h4></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Khối lượng Đặt hàng</label><input type="number" step="any" name="orderedVolume" defaultValue={editingPlan?.orderedVolume} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái đặt</label>
                <select name="orderedStatus" defaultValue={editingPlan?.orderedStatus || 'Chưa đặt'} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                  <option>Chưa đặt</option><option>Đã đặt hàng</option><option>Đã nhận đủ</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tình trạng thi công</label>
                <select name="progressStatus" defaultValue={editingPlan?.progressStatus || 'Chưa thi công'} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                  <option>Chưa thi công</option><option>Đang thi công</option><option>Đã hoàn thành</option>
                </select>
              </div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Ngày cấp hàng DK</label><input type="date" name="expectedDate" defaultValue={editingPlan?.expectedDate} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              
              <div className="md:col-span-2 border-t pt-4 mt-2"><h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-lg">task</span> Chứng từ & Ghi chú</h4></div>
              <div className="flex items-center gap-6 md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="docCo" defaultChecked={editingPlan?.docCo} className="w-4 h-4 text-primary" /> Có C/O</label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="docCq" defaultChecked={editingPlan?.docCq} className="w-4 h-4 text-primary" /> Có C/Q</label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="docFireInspection" defaultChecked={editingPlan?.docFireInspection} className="w-4 h-4 text-primary" /> Kiểm định PCCC</label>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="dispatchToSite" defaultChecked={editingPlan?.dispatchToSite} className="w-4 h-4 text-primary" /> Gửi Công trường</label>
              </div>
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thêm</label><textarea name="notes" defaultValue={editingPlan?.notes} rows={2} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => { setIsNewPlanOpen(false); setEditingPlan(null); }} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-blue-700 rounded-lg shadow-md">Lưu Kế Hoạch</button>
            </div>
          </form>
        </Modal>
      )}

      {/* 2. Purchasing Modal */}
      {(isNewPurchasingOpen || editingPurchasing) && (
        <Modal 
          isOpen={true} 
          onClose={() => { setIsNewPurchasingOpen(false); setEditingPurchasing(null); }}
          title={editingPurchasing ? 'Chỉnh sửa Mua sắm' : 'Thêm Hạng mục Mua sắm'}
          size="lg"
        >
          <form onSubmit={handlePurchasingSubmit} onChange={calcPurchasing} className="space-y-6">
            {editingPurchasing && <input type="hidden" name="id" defaultValue={editingPurchasing.id} />}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><label className="block text-xs font-bold text-slate-700 mb-1">STT</label><input type="text" name="stt" defaultValue={editingPurchasing?.stt} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Nội dung Hàng hóa/Hợp đồng *</label><input type="text" name="content" required defaultValue={editingPurchasing?.content} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị tính</label><input type="text" name="unit" defaultValue={editingPurchasing?.unit} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Khối lượng Hợp đồng</label><input type="text" name="volumeContract" defaultValue={editingPurchasing?.volumeContract} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Khối lượng Đặt</label><input type="number" step="any" name="volumeOrder" defaultValue={editingPurchasing?.volumeOrder} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              
              <div className="md:col-span-3 border-t pt-4 mt-2"><h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-lg">payments</span> Đơn giá & Thanh toán (Tự động tính)</h4></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Đơn giá (đ)</label><input type="number" name="unitPrice" defaultValue={editingPurchasing?.unitPrice} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Thành tiền (có VAT)</label><input type="number" name="totalAmount" readOnly defaultValue={editingPurchasing?.totalAmount} className="w-full p-2 border border-blue-200 bg-blue-50 font-bold text-blue-700 rounded-lg outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Tạm ứng (đ)</label><input type="number" name="prepayAmount" defaultValue={editingPurchasing?.prepayAmount} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Tỷ lệ T.Ứng (Tự động)</label><input type="number" step="0.01" name="prepayPercent" readOnly defaultValue={editingPurchasing?.prepayPercent} className="w-full p-2 bg-slate-100 border rounded-lg outline-none" /></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Còn lại (đ)</label><input type="number" name="remainingAmount" readOnly defaultValue={editingPurchasing?.remainingAmount} className="w-full p-2 border border-emerald-200 bg-emerald-50 font-bold text-emerald-700 rounded-lg outline-none" /></div>
              
              <div className="md:col-span-3 border-t pt-4 mt-2"><h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-lg">local_shipping</span> Trạng thái</h4></div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái đặt hàng</label>
                <select name="orderStatus" defaultValue={editingPurchasing?.orderStatus || 'Chưa đặt hàng'} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                  <option>Chưa đặt hàng</option><option>Đã đặt hàng</option><option>Đang giao hàng</option><option>Đã nhận hàng</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái Hóa đơn</label>
                <select name="invoiceStatus" defaultValue={editingPurchasing?.invoiceStatus || 'Chưa nhận'} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                  <option>Chưa nhận</option><option>Đã nhận</option>
                </select>
              </div>
              <div className="md:col-span-3"><label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label><textarea name="notes" defaultValue={editingPurchasing?.notes} rows={2} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => { setIsNewPurchasingOpen(false); setEditingPurchasing(null); }} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-blue-700 rounded-lg shadow-md">Lưu Mua sắm</button>
            </div>
          </form>
        </Modal>
      )}

      {/* 3. Expense Modal */}
      {(isNewExpenseOpen || editingExpense) && (
        <Modal 
          isOpen={true} 
          onClose={() => { setIsNewExpenseOpen(false); setEditingExpense(null); }}
          title={editingExpense ? 'Chỉnh sửa Phiếu Chi' : 'Thêm Phiếu Chi mới'}
          size="lg"
        >
          <form onSubmit={handleExpenseSubmit} onChange={calcExpense} className="space-y-6">
            {editingExpense && <input type="hidden" name="id" defaultValue={editingExpense.id} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Ngày chi *</label><input type="date" name="date" required defaultValue={editingExpense?.date} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">STT/Số phiếu</label><input type="text" name="stt" defaultValue={editingExpense?.stt} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Nội dung chi *</label><input type="text" name="content" required defaultValue={editingExpense?.content} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Diễn giải chi tiết</label><textarea name="description" defaultValue={editingExpense?.description} rows={2} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị tính</label><input type="text" name="unit" defaultValue={editingExpense?.unit} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Số lượng</label><input type="number" step="any" name="quantity" defaultValue={editingExpense?.quantity} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              
              <div className="md:col-span-2 border-t pt-4 mt-2"><h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-lg">calculate</span> Tài chính</h4></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Đơn giá (đ)</label><input type="number" name="unitPrice" defaultValue={editingExpense?.unitPrice} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Thuế VAT (đ)</label><input type="number" name="taxAmount" defaultValue={editingExpense?.taxAmount} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Thành tiền (Tự động)</label><input type="number" name="totalAmount" readOnly defaultValue={editingExpense?.totalAmount} className="w-full p-2 border border-rose-200 bg-rose-50 font-bold text-rose-700 rounded-lg outline-none" /></div>
              
              <div className="md:col-span-2 border-t pt-4 mt-2"><h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-lg">receipt_long</span> Chứng từ & Ghi chú</h4></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Link ảnh Hóa đơn (URL)</label><input type="text" name="invoiceUrl" defaultValue={editingExpense?.invoiceUrl} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label><input type="text" name="notes" defaultValue={editingExpense?.notes} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => { setIsNewExpenseOpen(false); setEditingExpense(null); }} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-blue-700 rounded-lg shadow-md">Lưu Phiếu Chi</button>
            </div>
          </form>
        </Modal>
      )}

      {/* 4. Labor Modal */}
      {(isNewLaborOpen || editingLabor) && (
        <Modal 
          isOpen={true} 
          onClose={() => { setIsNewLaborOpen(false); setEditingLabor(null); }}
          title={editingLabor ? 'Chỉnh sửa Lương / Công nhật' : 'Thêm Lương / Công nhật'}
          size="lg"
        >
          <form onSubmit={handleLaborSubmit} onChange={calcLabor} className="space-y-6">
            {editingLabor && <input type="hidden" name="id" defaultValue={editingLabor.id} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Ngày làm *</label><input type="date" name="date" required defaultValue={editingLabor?.date} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">STT</label><input type="text" name="stt" defaultValue={editingLabor?.stt} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Họ tên nhân công *</label><input type="text" name="workerName" required defaultValue={editingLabor?.workerName} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Nội dung công việc</label><input type="text" name="content" defaultValue={editingLabor?.content} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Diễn giải chi tiết</label><textarea name="description" defaultValue={editingLabor?.description} rows={2} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị (công/ngày...)</label><input type="text" name="unit" defaultValue={editingLabor?.unit} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Số lượng</label><input type="number" step="any" name="quantity" defaultValue={editingLabor?.quantity} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              
              <div className="md:col-span-2 border-t pt-4 mt-2"><h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-lg">account_balance</span> Thông tin Tài khoản & Lương</h4></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Đơn giá (đ)</label><input type="number" name="unitPrice" defaultValue={editingLabor?.unitPrice} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Thành tiền (Tự động)</label><input type="number" name="totalAmount" readOnly defaultValue={editingLabor?.totalAmount} className="w-full p-2 border border-blue-200 bg-blue-50 font-bold text-blue-700 rounded-lg outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Tên Ngân hàng & Người nhận</label><input type="text" name="bankInfo" defaultValue={editingLabor?.bankInfo} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              <div><label className="block text-xs font-bold text-slate-700 mb-1">Số Tài khoản</label><input type="text" name="bankAccount" defaultValue={editingLabor?.bankAccount} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none font-mono" /></div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tình trạng thanh toán</label>
                <select name="paymentStatus" defaultValue={editingLabor?.paymentStatus || 'Chưa thanh toán'} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none">
                  <option>Chưa thanh toán</option><option>Đã thanh toán</option>
                </select>
              </div>
              
              <div className="md:col-span-2 border-t pt-4 mt-2"><h4 className="text-sm font-bold text-primary mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-lg">badge</span> Căn cước Công dân & Ghi chú</h4></div>
              <div><ImageUpload label="Ảnh CCCD (Mặt trước)" name="idCardFrontUrl" value={editingLabor?.idCardFrontUrl} /></div>
              <div><ImageUpload label="Ảnh CCCD (Mặt sau)" name="idCardBackUrl" value={editingLabor?.idCardBackUrl} /></div>
              <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú</label><input type="text" name="notes" defaultValue={editingLabor?.notes} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => { setIsNewLaborOpen(false); setEditingLabor(null); }} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg">Hủy</button>
              <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary hover:bg-blue-700 rounded-lg shadow-md">Lưu Nhân công</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
};
