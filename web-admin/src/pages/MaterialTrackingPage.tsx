import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { Modal } from '../components/common/Modal';
import { Material, InventoryTransaction } from '../types';

const PURCHASE_STATUSES = ['Chưa đặt hàng', 'Đã đặt hàng', 'Đã có hàng', 'Hàng gia công'];
const CONSTRUCTION_STATUSES = ['Chưa thi công', 'Đang thi công', 'Đã thi công', 'VƯỚNG MẮC'];

const normalizeText = (value?: string) => (value || '').toLowerCase();

const normalizePurchaseStatus = (status?: string) => {
  if (!status || status === 'Not Ordered' || status.includes('ChÆ')) return 'Chưa đặt hàng';
  if (status === 'Ordered') return 'Đã đặt hàng';
  if (status === 'On-site' || status.includes('lÃ³') || status.includes('có hàng')) return 'Đã có hàng';
  if (status.includes('gia')) return 'Hàng gia công';
  return status;
};

const normalizeConstructionStatus = (status?: string) => {
  if (!status || status.includes('ChÆ') || status.includes('Chưa')) return 'Chưa thi công';
  if (status.includes('VƯ') || status.includes('VÆ')) return 'VƯỚNG MẮC';
  if (status.includes('Đang') || status.includes('Ä ang')) return 'Đang thi công';
  if (status.includes('Đã') || status.includes('Ä Ã£')) return 'Đã thi công';
  return status;
};

const purchaseBadgeClass = (status: string) => {
  if (status === 'Đã có hàng') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Đã đặt hàng') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'Hàng gia công') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
};

const constructionBadgeClass = (status: string) => {
  if (status === 'Đã thi công') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Đang thi công') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'VƯỚNG MẮC') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

export const MaterialTrackingPage: React.FC = () => {
  const { materials, projects, inventoryTransactions, updateMaterial, deleteMaterial, addMaterial, addInventoryTransaction } = useRealtimeStore();

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'IMPORT' | 'EXPORT'>('OVERVIEW');

  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isPlaceOrderModalOpen, setIsPlaceOrderModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  const [transactionType, setTransactionType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  // New Material form state
  const [matName, setMatName] = useState('');
  const [description, setDescription] = useState('');
  const [volume, setVolume] = useState(1);
  const [unit, setUnit] = useState('cái');
  const [unitPrice, setUnitPrice] = useState(0);
  const [supplier, setSupplier] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState('Chưa đặt hàng');
  const [constrStatus, setConstrStatus] = useState('Chưa thi công');

  // Edit Material form state
  const [editPurchaseStatus, setEditPurchaseStatus] = useState('Chưa đặt hàng');
  const [editConstrStatus, setEditConstrStatus] = useState('Chưa thi công');
  const [editSupplier, setEditSupplier] = useState('');
  const [editInitialStock, setEditInitialStock] = useState(0);
  const [editUnit, setEditUnit] = useState('cái');
  const [editUnitPrice, setEditUnitPrice] = useState(0);

  // Transaction form state
  const [txMaterialId, setTxMaterialId] = useState('');
  const [txQuantity, setTxQuantity] = useState(1);
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txSourceOrProject, setTxSourceOrProject] = useState('');
  const [txReceiverName, setTxReceiverName] = useState('');
  const [txNotes, setTxNotes] = useState('');

  const projectOptions = useMemo(() => {
    const byCode = new Map(projects.map((project) => [project.code, project]));
    materials.forEach((mat) => {
      if (!byCode.has(mat.projectCode)) {
        byCode.set(mat.projectCode, {
          id: mat.projectCode,
          code: mat.projectCode,
          name: mat.projectName,
          location: '',
          progressPercent: 0,
          status: 'active',
          totalTasks: 0,
          completedTasks: 0,
          issueTasksCount: 0,
          managerName: '',
        });
      }
    });
    return Array.from(byCode.values());
  }, [materials, projects]);

  const filteredMaterials = materials.filter((material) => {
    const purchase = normalizePurchaseStatus(material.status);
    const construction = normalizeConstructionStatus(material.constrStatus);
    const query = searchTerm.trim().toLowerCase();
    const matchStatus = selectedStatus === 'all' || purchase === selectedStatus || construction === selectedStatus;
    const matchSearch =
      !query ||
      normalizeText(material.name).includes(query) ||
      normalizeText(material.englishName).includes(query) ||
      normalizeText(material.supplier).includes(query);

    return matchStatus && matchSearch;
  });

  const imports = inventoryTransactions.filter(tx => tx.type === 'IMPORT');
  const exports = inventoryTransactions.filter(tx => tx.type === 'EXPORT');

  const summaryCards = [
    { label: 'Tổng vật tư', value: filteredMaterials.length, icon: 'inventory_2', tone: 'text-slate-700 bg-slate-100' },
    { label: 'Cần đặt hàng', value: filteredMaterials.filter((m) => normalizePurchaseStatus(m.status) === 'Chưa đặt hàng').length, icon: 'shopping_cart_checkout', tone: 'text-red-700 bg-red-50' },
    { label: 'Đang chờ hàng', value: filteredMaterials.filter((m) => normalizePurchaseStatus(m.status) === 'Đã đặt hàng').length, icon: 'local_shipping', tone: 'text-blue-700 bg-blue-50' },
    { label: 'Đã có hàng', value: filteredMaterials.filter((m) => normalizePurchaseStatus(m.status) === 'Đã có hàng').length, icon: 'warehouse', tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Lượt Nhập Kho', value: imports.length, icon: 'arrow_downward', tone: 'text-primary bg-blue-50' },
    { label: 'Lượt Xuất Kho', value: exports.length, icon: 'arrow_upward', tone: 'text-amber-700 bg-amber-50' },
  ];

  const openEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setEditPurchaseStatus(normalizePurchaseStatus(material.status));
    setEditConstrStatus(normalizeConstructionStatus(material.constrStatus));
    setEditSupplier(material.supplier || '');
    setEditInitialStock(material.initialStock || 0);
    setEditUnit(material.unit || 'cái');
    setEditUnitPrice(material.unitPrice || 0);
  };

  const handleSaveMaterial = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingMaterial) return;

    // Recalculate current stock based on new initial stock and transactions
    const totalImp = editingMaterial.totalImport || 0;
    const totalExp = editingMaterial.totalExport || 0;
    const currentStock = editInitialStock + totalImp - totalExp;

    updateMaterial(editingMaterial.id, {
      status: editPurchaseStatus,
      constrStatus: editConstrStatus,
      supplier: editSupplier,
      initialStock: editInitialStock,
      currentStock,
      unit: editUnit,
      unitPrice: editUnitPrice,
    });
    setEditingMaterial(null);
  };

  const handleExportExcel = () => {
    let data: any[] = [];
    let filename = '';
    
    if (activeTab === 'OVERVIEW') {
      data = filteredMaterials.map((material) => ({
        'Mã vật tư': material.code,
        'Tên vật tư / thiết bị': material.name,
        'Mô tả / quy cách': material.englishName || '',
        'Tồn đầu kỳ': material.initialStock || 0,
        'Tổng nhập': material.totalImport || 0,
        'Tổng xuất': material.totalExport || 0,
        'Tồn hiện tại': material.currentStock || material.initialStock || 0,
        'Đơn vị': material.unit,
        'Tình trạng mua hàng': normalizePurchaseStatus(material.status),
        'Tình trạng thi công': normalizeConstructionStatus(material.constrStatus),
        'Nhà cung cấp': material.supplier || '',
      }));
      filename = `Ton_Kho_Tong_Hop_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (activeTab === 'IMPORT') {
      data = imports.map((tx, idx) => ({
        'STT': idx + 1,
        'Ngày Nhập': tx.date,
        'Mã Vật Tư': tx.materialCode,
        'Tên Vật Tư': tx.materialName,
        'Quy Cách / Thông Số': tx.specs || '',
        'ĐVT': tx.unit,
        'Số Lượng Nhập': tx.quantity,
        'Nguồn Nhập / Dự Án Dư': tx.sourceOrProject,
        'Ghi Chú': tx.notes || ''
      }));
      filename = `Nhat_Ky_Nhap_Kho_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else if (activeTab === 'EXPORT') {
      data = exports.map((tx, idx) => ({
        'STT': idx + 1,
        'Ngày Xuất': tx.date,
        'Mã Vật Tư': tx.materialCode,
        'Tên Vật Tư': tx.materialName,
        'Quy Cách / Thông Số': tx.specs || '',
        'ĐVT': tx.unit,
        'Số Lượng Xuất': tx.quantity,
        'Mã Dự Án / Tên Công Trình': tx.sourceOrProject,
        'Người Nhận Vật Tư': tx.receiverName || '',
        'Ghi Chú': tx.notes || ''
      }));
      filename = `Nhat_Ky_Xuat_Kho_${new Date().toISOString().split('T')[0]}.xlsx`;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, activeTab);
    XLSX.writeFile(workbook, filename);
  };

  const handleCreateOrder = (event: React.FormEvent) => {
    event.preventDefault();
    if (!matName.trim()) return;

    addMaterial({
      code: `MAT-${Math.floor(100 + Math.random() * 900)}`,
      name: matName.trim(),
      englishName: description.trim() || matName.trim(),
      projectCode: 'COMPANY',
      projectName: 'Kho Công Ty',
      volume,
      initialStock: volume,
      currentStock: volume,
      totalImport: 0,
      totalExport: 0,
      unit,
      unitPrice,
      status: purchaseStatus,
      constrStatus,
      supplier,
    });

    setIsPlaceOrderModalOpen(false);
    setMatName('');
    setDescription('');
    setVolume(1);
    setUnit('cái');
    setUnitPrice(0);
    setSupplier('');
    setPurchaseStatus('Chưa đặt hàng');
    setConstrStatus('Chưa thi công');
  };

  const handleOpenTransaction = (type: 'IMPORT' | 'EXPORT') => {
    setTransactionType(type);
    setTxMaterialId(filteredMaterials.length > 0 ? filteredMaterials[0].id : '');
    setTxQuantity(1);
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxSourceOrProject('');
    setTxReceiverName('');
    setTxNotes('');
    setIsTransactionModalOpen(true);
  };

  const handleSubmitTransaction = (event: React.FormEvent) => {
    event.preventDefault();
    const material = materials.find(m => m.id === txMaterialId);
    if (!material) return;

    if (transactionType === 'EXPORT') {
      const current = material.currentStock !== undefined ? material.currentStock : (material.initialStock || 0);
      if (txQuantity > current) {
        if (!window.confirm(`Cảnh báo: Số lượng xuất (${txQuantity}) lớn hơn Tồn kho hiện tại (${current}). Bạn có chắc chắn muốn xuất kho âm?`)) {
          return;
        }
      }
    }

    addInventoryTransaction({
      type: transactionType,
      date: txDate,
      materialId: material.id,
      materialCode: material.code,
      materialName: material.name,
      specs: material.englishName || '',
      unit: material.unit,
      quantity: txQuantity,
      sourceOrProject: txSourceOrProject,
      receiverName: txReceiverName,
      notes: txNotes
    });

    setIsTransactionModalOpen(false);
  };

  return (
    <div className="px-0 pt-0 pb-4 space-y-3">
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 flex flex-col xl:flex-row justify-between xl:items-center gap-3 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-xl">warehouse</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-extrabold text-slate-900">Quản lý Kho & Vật tư</h2>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportExcel} className="flex items-center gap-1 border border-slate-200 bg-white px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs">
              <span className="material-symbols-outlined text-base">file_download</span>
              Xuất Excel
            </button>
            <button onClick={() => handleOpenTransaction('IMPORT')} className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-xs">
              <span className="material-symbols-outlined text-base">arrow_downward</span>
              Nhập Kho
            </button>
            <button onClick={() => handleOpenTransaction('EXPORT')} className="flex items-center gap-1 bg-amber-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-amber-600 active:scale-95 transition-all shadow-xs">
              <span className="material-symbols-outlined text-base">arrow_upward</span>
              Xuất Kho
            </button>
            <button onClick={() => setIsPlaceOrderModalOpen(true)} className="flex items-center gap-1 bg-primary text-white px-3 py-2 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs">
              <span className="material-symbols-outlined text-base">add</span>
              Tạo Vật Tư Mới
            </button>
          </div>
        </div>

        <div className="p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 border-b border-slate-100">
          {summaryCards.map((card) => (
            <div key={card.label} className="border border-slate-200 rounded-lg p-3 bg-slate-50/40">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">{card.label}</span>
                <span className={`material-symbols-outlined text-base rounded-md p-1 ${card.tone}`}>{card.icon}</span>
              </div>
              <div className="text-2xl font-extrabold text-slate-900 mt-2">{card.value}</div>
            </div>
          ))}
        </div>

        {/* TABS */}
        <div className="flex items-center gap-6 px-5 border-b border-slate-200 bg-slate-50">
          {[
            { id: 'OVERVIEW', label: 'Tồn Kho Tổng Hợp', icon: 'inventory' },
            { id: 'IMPORT', label: 'Nhật Ký Nhập Kho', icon: 'login' },
            { id: 'EXPORT', label: 'Nhật Ký Xuất Kho', icon: 'logout' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 text-sm font-bold border-b-2 transition-all ${
                activeTab === tab.id 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'OVERVIEW' && (
          <>
            <div className="p-4 flex flex-col xl:flex-row justify-between gap-3 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm vật tư, nhà cung cấp..." className="w-80 max-w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white" />
              </div>

              <div className="flex flex-wrap bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
                {[{ label: 'Tất cả', val: 'all' }, { label: 'Chưa đặt', val: 'Chưa đặt hàng' }, { label: 'Đã đặt', val: 'Đã đặt hàng' }, { label: 'Đã có hàng', val: 'Đã có hàng' }].map((item) => (
                  <button key={item.val} onClick={() => setSelectedStatus(item.val)} className={`px-3 py-1.5 rounded-md transition-all ${selectedStatus === item.val ? 'bg-white shadow-xs text-primary font-bold' : 'text-slate-500 hover:text-slate-800'}`}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 min-w-80">Vật tư / Thiết bị</th>
                    <th className="p-3.5 text-right">Tồn Đầu</th>
                    <th className="p-3.5 text-right">Nhập</th>
                    <th className="p-3.5 text-right">Xuất</th>
                    <th className="p-3.5 text-right">Tồn Kho</th>
                    <th className="p-3.5 text-center">ĐVT</th>
                    <th className="p-3.5 text-center">Tình Trạng</th>
                    <th className="p-3.5 text-center min-w-20">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredMaterials.map((material) => {
                    const purchase = normalizePurchaseStatus(material.status);
                    return (
                      <tr key={material.id} onClick={() => openEditMaterial(material)} className="hover:bg-blue-50/50 transition-colors align-top cursor-pointer">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 leading-snug">{material.name}</div>
                          <div className="text-[11px] text-slate-400 font-normal mt-1">{material.code} {material.englishName ? `- ${material.englishName}` : ''}</div>
                        </td>
                        <td className="p-3.5 text-right text-slate-500">{material.initialStock || 0}</td>
                        <td className="p-3.5 text-right text-emerald-600 font-bold">+{material.totalImport || 0}</td>
                        <td className="p-3.5 text-right text-amber-600 font-bold">-{material.totalExport || 0}</td>
                        <td className="p-3.5 text-right font-bold text-primary text-sm">{(material.currentStock !== undefined ? material.currentStock : (material.initialStock || 0)).toLocaleString('vi-VN')}</td>
                        <td className="p-3.5 text-center">{material.unit}</td>
                        <td className="p-3.5 text-center"><span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold ${purchaseBadgeClass(purchase)}`}>{purchase}</span></td>
                        <td className="p-3.5 text-center" onClick={(event) => event.stopPropagation()}>
                          <button type="button" onClick={() => { if (window.confirm(`Xóa vật tư "${material.name}"?`)) deleteMaterial(material.id); }} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors" title="Xóa vật tư">
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMaterials.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-500">Không có vật tư nào.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'IMPORT' && (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Ngày Nhập</th>
                  <th className="p-3.5">Mã Vật Tư</th>
                  <th className="p-3.5 min-w-64">Tên Vật Tư</th>
                  <th className="p-3.5">Quy Cách</th>
                  <th className="p-3.5 text-right">S.Lượng Nhập</th>
                  <th className="p-3.5 text-center">ĐVT</th>
                  <th className="p-3.5">Nguồn / Nhà Cung Cấp</th>
                  <th className="p-3.5 min-w-40">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {imports.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{tx.date}</td>
                    <td className="p-3.5 font-mono text-slate-500">{tx.materialCode}</td>
                    <td className="p-3.5 font-bold text-slate-800">{tx.materialName}</td>
                    <td className="p-3.5 text-slate-500">{tx.specs || '-'}</td>
                    <td className="p-3.5 text-right font-bold text-emerald-600">+{tx.quantity.toLocaleString('vi-VN')}</td>
                    <td className="p-3.5 text-center text-slate-500">{tx.unit}</td>
                    <td className="p-3.5 text-slate-600">{tx.sourceOrProject || '-'}</td>
                    <td className="p-3.5 text-slate-500 italic">{tx.notes || '-'}</td>
                  </tr>
                ))}
                {imports.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-500">Chưa có giao dịch nhập kho nào.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'EXPORT' && (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="p-3.5">Ngày Xuất</th>
                  <th className="p-3.5">Mã Vật Tư</th>
                  <th className="p-3.5 min-w-64">Tên Vật Tư</th>
                  <th className="p-3.5">Quy Cách</th>
                  <th className="p-3.5 text-right">S.Lượng Xuất</th>
                  <th className="p-3.5 text-center">ĐVT</th>
                  <th className="p-3.5">Dự Án Nhận</th>
                  <th className="p-3.5">Người Nhận</th>
                  <th className="p-3.5 min-w-40">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {exports.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{tx.date}</td>
                    <td className="p-3.5 font-mono text-slate-500">{tx.materialCode}</td>
                    <td className="p-3.5 font-bold text-slate-800">{tx.materialName}</td>
                    <td className="p-3.5 text-slate-500">{tx.specs || '-'}</td>
                    <td className="p-3.5 text-right font-bold text-amber-600">-{tx.quantity.toLocaleString('vi-VN')}</td>
                    <td className="p-3.5 text-center text-slate-500">{tx.unit}</td>
                    <td className="p-3.5 font-bold text-slate-700">{tx.sourceOrProject || '-'}</td>
                    <td className="p-3.5 text-slate-600">{tx.receiverName || '-'}</td>
                    <td className="p-3.5 text-slate-500 italic">{tx.notes || '-'}</td>
                  </tr>
                ))}
                {exports.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-500">Chưa có giao dịch xuất kho nào.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* MODAL CẬP NHẬT VẬT TƯ */}
      <Modal isOpen={!!editingMaterial} onClose={() => setEditingMaterial(null)} title="Cập nhật Thông tin Vật tư">
        {editingMaterial && (
          <form onSubmit={handleSaveMaterial} className="space-y-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="font-bold text-slate-900">{editingMaterial.name}</div>
              <div className="text-[11px] text-slate-500 mt-1">{editingMaterial.code}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold text-slate-700 mb-1">Tình trạng mua hàng</label><select value={editPurchaseStatus} onChange={(event) => setEditPurchaseStatus(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">{PURCHASE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
              <div><label className="block font-bold text-slate-700 mb-1">Tình trạng thi công</label><select value={editConstrStatus} onChange={(event) => setEditConstrStatus(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">{CONSTRUCTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold text-slate-700 mb-1">Tồn đầu kỳ</label><input type="number" value={editInitialStock} onChange={(event) => setEditInitialStock(Number(event.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
              <div><label className="block font-bold text-slate-700 mb-1">Đơn vị</label><input type="text" value={editUnit} onChange={(event) => setEditUnit(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
              <div><label className="block font-bold text-slate-700 mb-1">Đơn giá</label><input type="number" value={editUnitPrice} onChange={(event) => setEditUnitPrice(Number(event.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
            </div>
            <div><label className="block font-bold text-slate-700 mb-1">Nhà cung cấp mặc định</label><input type="text" value={editSupplier} onChange={(event) => setEditSupplier(event.target.value)} placeholder="VD: Kho công ty, nhà cung cấp A..." className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100"><button type="button" onClick={() => setEditingMaterial(null)} className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold hover:opacity-90">Lưu cập nhật</button></div>
          </form>
        )}
      </Modal>

      {/* MODAL TẠO VẬT TƯ MỚI */}
      <Modal isOpen={isPlaceOrderModalOpen} onClose={() => setIsPlaceOrderModalOpen(false)} title="Thêm Vật Tư Mới (Tồn đầu kỳ)">
        <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
          <div><label className="block font-bold text-slate-700 mb-1">Tên vật tư / thiết bị *</label><input type="text" required placeholder="VD: Cáp Cu/XLPE/PVC 2x2.5mm2" value={matName} onChange={(event) => setMatName(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold" /></div>
          <div><label className="block font-bold text-slate-700 mb-1">Mô tả / quy cách</label><input type="text" placeholder="VD: chống nhiễu, chống cháy..." value={description} onChange={(event) => setDescription(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
          <div><label className="block font-bold text-slate-700 mb-1">Nhà cung cấp mặc định</label><input type="text" placeholder="VD: Kho công ty" value={supplier} onChange={(event) => setSupplier(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
          <div className="grid grid-cols-3 gap-3"><div><label className="block font-bold text-slate-700 mb-1">Tồn kho ban đầu</label><input type="number" min="0" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div><div><label className="block font-bold text-slate-700 mb-1">Đơn vị</label><input type="text" value={unit} onChange={(event) => setUnit(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div><div><label className="block font-bold text-slate-700 mb-1">Đơn giá</label><input type="number" value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div></div>
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100"><button type="button" onClick={() => setIsPlaceOrderModalOpen(false)} className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold hover:opacity-90">Tạo mới</button></div>
        </form>
      </Modal>

      {/* MODAL GIAO DỊCH NHẬP/XUẤT KHO */}
      <Modal isOpen={isTransactionModalOpen} onClose={() => setIsTransactionModalOpen(false)} title={transactionType === 'IMPORT' ? 'Tạo Phiếu Nhập Kho' : 'Tạo Phiếu Xuất Kho'}>
        <form onSubmit={handleSubmitTransaction} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Chọn Vật tư *</label>
            <select required value={txMaterialId} onChange={(e) => setTxMaterialId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">
              <option value="" disabled>-- Chọn vật tư --</option>
              {materials.map(m => (
                <option key={m.id} value={m.id}>[{m.code}] {m.name} (Tồn: {m.currentStock ?? (m.initialStock || 0)} {m.unit})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block font-bold text-slate-700 mb-1">Ngày {transactionType === 'IMPORT' ? 'nhập' : 'xuất'} *</label><input type="date" required value={txDate} onChange={(e) => setTxDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
            <div><label className="block font-bold text-slate-700 mb-1">Số lượng *</label><input type="number" required min="1" value={txQuantity} onChange={(e) => setTxQuantity(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{transactionType === 'IMPORT' ? 'Nguồn nhập hàng' : 'Dự án / Nơi xuất đến'} *</label>
            <input type="text" required placeholder={transactionType === 'IMPORT' ? "VD: Nhà cung cấp A, Dự án B trả về..." : "VD: Dự án Phước Tân..."} value={txSourceOrProject} onChange={(e) => setTxSourceOrProject(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" />
          </div>
          {transactionType === 'EXPORT' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Người nhận</label>
              <input type="text" placeholder="VD: Kỹ sư Nguyễn Văn A" value={txReceiverName} onChange={(e) => setTxReceiverName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" />
            </div>
          )}
          <div>
            <label className="block font-bold text-slate-700 mb-1">Ghi chú</label>
            <input type="text" placeholder="Ghi chú thêm (nếu có)" value={txNotes} onChange={(e) => setTxNotes(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" />
          </div>
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsTransactionModalOpen(false)} className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
            <button type="submit" className={`px-5 py-1.5 text-white rounded-lg font-bold hover:opacity-90 ${transactionType === 'IMPORT' ? 'bg-emerald-600' : 'bg-amber-500'}`}>
              Lưu {transactionType === 'IMPORT' ? 'Nhập Kho' : 'Xuất Kho'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
