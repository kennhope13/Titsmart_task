import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { Modal } from '../components/common/Modal';
import { Material } from '../types';

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
  if (status.includes('Đang') || status.includes('Äang')) return 'Đang thi công';
  if (status.includes('Đã') || status.includes('ÄÃ£')) return 'Đã thi công';
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
  const { materials, projects, updateMaterial, deleteMaterial, addMaterial } = useRealtimeStore();

  const [selectedProject, setSelectedProject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPlaceOrderModalOpen, setIsPlaceOrderModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const [matName, setMatName] = useState('');
  const [description, setDescription] = useState('');
  const [projCode, setProjCode] = useState(projects[0]?.code || 'DAKRLAP');
  const [volume, setVolume] = useState(1);
  const [unit, setUnit] = useState('cái');
  const [unitPrice, setUnitPrice] = useState(0);
  const [supplier, setSupplier] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState('Chưa đặt hàng');
  const [constrStatus, setConstrStatus] = useState('Chưa thi công');

  const [editPurchaseStatus, setEditPurchaseStatus] = useState('Chưa đặt hàng');
  const [editConstrStatus, setEditConstrStatus] = useState('Chưa thi công');
  const [editSupplier, setEditSupplier] = useState('');
  const [editVolume, setEditVolume] = useState(1);
  const [editUnit, setEditUnit] = useState('cái');
  const [editUnitPrice, setEditUnitPrice] = useState(0);

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
    const matchProject = selectedProject === 'all' || material.projectCode === selectedProject;
    const matchStatus = selectedStatus === 'all' || purchase === selectedStatus || construction === selectedStatus;
    const matchSearch =
      !query ||
      normalizeText(material.name).includes(query) ||
      normalizeText(material.englishName).includes(query) ||
      normalizeText(material.projectName).includes(query) ||
      normalizeText(material.supplier).includes(query);

    return matchProject && matchStatus && matchSearch;
  });

  const summaryCards = [
    { label: 'Tổng vật tư', value: filteredMaterials.length, icon: 'inventory_2', tone: 'text-slate-700 bg-slate-100' },
    { label: 'Cần đặt hàng', value: filteredMaterials.filter((m) => normalizePurchaseStatus(m.status) === 'Chưa đặt hàng').length, icon: 'shopping_cart_checkout', tone: 'text-red-700 bg-red-50' },
    { label: 'Đang chờ hàng', value: filteredMaterials.filter((m) => normalizePurchaseStatus(m.status) === 'Đã đặt hàng').length, icon: 'local_shipping', tone: 'text-blue-700 bg-blue-50' },
    { label: 'Đã có hàng', value: filteredMaterials.filter((m) => normalizePurchaseStatus(m.status) === 'Đã có hàng').length, icon: 'warehouse', tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Đã thi công', value: filteredMaterials.filter((m) => normalizeConstructionStatus(m.constrStatus) === 'Đã thi công').length, icon: 'task_alt', tone: 'text-primary bg-blue-50' },
    { label: 'Vướng mắc', value: filteredMaterials.filter((m) => normalizeConstructionStatus(m.constrStatus) === 'VƯỚNG MẮC').length, icon: 'warning', tone: 'text-amber-700 bg-amber-50' },
  ];

  const openEditMaterial = (material: Material) => {
    setEditingMaterial(material);
    setEditPurchaseStatus(normalizePurchaseStatus(material.status));
    setEditConstrStatus(normalizeConstructionStatus(material.constrStatus));
    setEditSupplier(material.supplier || '');
    setEditVolume(material.volume || 0);
    setEditUnit(material.unit || 'cái');
    setEditUnitPrice(material.unitPrice || 0);
  };

  const handleSaveMaterial = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingMaterial) return;

    updateMaterial(editingMaterial.id, {
      status: editPurchaseStatus,
      constrStatus: editConstrStatus,
      supplier: editSupplier,
      volume: editVolume,
      unit: editUnit,
      unitPrice: editUnitPrice,
    });
    setEditingMaterial(null);
  };

  const handleExportExcel = () => {
    const data = filteredMaterials.map((material) => ({
      'Mã vật tư': material.code,
      'Tên vật tư / thiết bị': material.name,
      'Mô tả / quy cách': material.englishName || '',
      'Dự án': material.projectName,
      'Khối lượng': material.volume,
      'Đơn vị': material.unit,
      'Đơn giá': material.unitPrice || 0,
      'Tình trạng mua hàng': normalizePurchaseStatus(material.status),
      'Tình trạng thi công': normalizeConstructionStatus(material.constrStatus),
      'Nhà cung cấp': material.supplier || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Theo doi vat tu');
    XLSX.writeFile(workbook, `Theo_Doi_Vat_Tu_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleCreateOrder = (event: React.FormEvent) => {
    event.preventDefault();
    if (!matName.trim()) return;

    const project = projectOptions.find((item) => item.code === projCode);
    addMaterial({
      code: `MAT-${Math.floor(100 + Math.random() * 900)}`,
      name: matName.trim(),
      englishName: description.trim() || matName.trim(),
      projectCode: project?.code || projCode,
      projectName: project?.name || projCode,
      volume,
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

  return (
    <div className="px-0 pt-0 pb-4 space-y-3">
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-5 py-4 flex flex-col xl:flex-row justify-between xl:items-center gap-3 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-xl">inventory_2</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-extrabold text-slate-900">Quản lý Vật tư & Thiết bị</h2>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-primary text-xs font-bold border border-blue-100">{filteredMaterials.length} vật tư</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">Bấm vào từng dòng để cập nhật mua hàng, hàng về, thi công hoặc vướng mắc.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportExcel} className="flex items-center gap-1 border border-slate-200 bg-white px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs">
              <span className="material-symbols-outlined text-base">file_download</span>
              Xuất Excel
            </button>
            <button onClick={() => setIsPlaceOrderModalOpen(true)} className="flex items-center gap-1 bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs">
              <span className="material-symbols-outlined text-base">add_shopping_cart</span>
              Thêm / Đặt vật tư
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

        <div className="p-4 flex flex-col xl:flex-row justify-between gap-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-3">
            <select value={selectedProject} onChange={(event) => setSelectedProject(event.target.value)} className="bg-white border border-slate-200 rounded-lg text-xs font-semibold py-2 px-3 focus:ring-2 focus:ring-primary focus:outline-none min-w-52">
              <option value="all">Tất cả Dự án</option>
              {projectOptions.map((project) => <option key={project.code} value={project.code}>{project.name}</option>)}
            </select>
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Tìm vật tư, dự án, nhà cung cấp..." className="w-80 max-w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white" />
          </div>

          <div className="flex flex-wrap bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
            {[{ label: 'Tất cả', val: 'all' }, { label: 'Chưa đặt', val: 'Chưa đặt hàng' }, { label: 'Đã đặt', val: 'Đã đặt hàng' }, { label: 'Đã có hàng', val: 'Đã có hàng' }, { label: 'Đang thi công', val: 'Đang thi công' }, { label: 'Vướng mắc', val: 'VƯỚNG MẮC' }].map((item) => (
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
                <th className="p-3.5 min-w-48">Dự án</th>
                <th className="p-3.5 text-right min-w-28">Khối lượng</th>
                <th className="p-3.5 min-w-40">Mua hàng</th>
                <th className="p-3.5 min-w-40">Thi công</th>
                <th className="p-3.5 min-w-40">Nhà cung cấp</th>
                <th className="p-3.5 text-center min-w-20">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {filteredMaterials.map((material) => {
                const purchase = normalizePurchaseStatus(material.status);
                const construction = normalizeConstructionStatus(material.constrStatus);
                return (
                  <tr key={material.id} onClick={() => openEditMaterial(material)} className="hover:bg-blue-50/50 transition-colors align-top cursor-pointer">
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 leading-snug">{material.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal mt-1">{material.code} {material.englishName ? `- ${material.englishName}` : ''}</div>
                    </td>
                    <td className="p-3.5 text-slate-600">{material.projectName}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">{material.volume.toLocaleString('vi-VN')} {material.unit}</td>
                    <td className="p-3.5"><span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold ${purchaseBadgeClass(purchase)}`}>{purchase}</span></td>
                    <td className="p-3.5"><span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold ${constructionBadgeClass(construction)}`}>{construction}</span></td>
                    <td className="p-3.5 text-slate-600">{material.supplier || 'Chưa cập nhật'}</td>
                    <td className="p-3.5 text-center" onClick={(event) => event.stopPropagation()}>
                      <button type="button" onClick={() => { if (window.confirm(`Xóa vật tư "${material.name}"?`)) deleteMaterial(material.id); }} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors" title="Xóa vật tư">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {filteredMaterials.length === 0 && <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-sm text-slate-500">Không có vật tư phù hợp với bộ lọc hiện tại.</div>}

      <Modal isOpen={!!editingMaterial} onClose={() => setEditingMaterial(null)} title="Cập nhật Vật tư">
        {editingMaterial && (
          <form onSubmit={handleSaveMaterial} className="space-y-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="font-bold text-slate-900">{editingMaterial.name}</div>
              <div className="text-[11px] text-slate-500 mt-1">{editingMaterial.projectName} - {editingMaterial.code}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold text-slate-700 mb-1">Tình trạng mua hàng</label><select value={editPurchaseStatus} onChange={(event) => setEditPurchaseStatus(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">{PURCHASE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
              <div><label className="block font-bold text-slate-700 mb-1">Tình trạng thi công</label><select value={editConstrStatus} onChange={(event) => setEditConstrStatus(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">{CONSTRUCTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><label className="block font-bold text-slate-700 mb-1">Khối lượng</label><input type="number" value={editVolume} onChange={(event) => setEditVolume(Number(event.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
              <div><label className="block font-bold text-slate-700 mb-1">Đơn vị</label><input type="text" value={editUnit} onChange={(event) => setEditUnit(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
              <div><label className="block font-bold text-slate-700 mb-1">Đơn giá</label><input type="number" value={editUnitPrice} onChange={(event) => setEditUnitPrice(Number(event.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
            </div>
            <div><label className="block font-bold text-slate-700 mb-1">Nhà cung cấp / ghi chú nguồn hàng</label><input type="text" value={editSupplier} onChange={(event) => setEditSupplier(event.target.value)} placeholder="VD: Kho công ty, nhà cung cấp A, đang gia công..." className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100"><button type="button" onClick={() => setEditingMaterial(null)} className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold hover:opacity-90">Lưu cập nhật</button></div>
          </form>
        )}
      </Modal>

      <Modal isOpen={isPlaceOrderModalOpen} onClose={() => setIsPlaceOrderModalOpen(false)} title="Thêm / Đặt Vật tư">
        <form onSubmit={handleCreateOrder} className="space-y-3 text-xs">
          <div><label className="block font-bold text-slate-700 mb-1">Tên vật tư / thiết bị *</label><input type="text" required placeholder="VD: Cáp Cu/XLPE/PVC 2x2.5mm2" value={matName} onChange={(event) => setMatName(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold" /></div>
          <div><label className="block font-bold text-slate-700 mb-1">Mô tả / quy cách</label><input type="text" placeholder="VD: chống nhiễu, chống cháy, dùng cho hệ thống PCCC" value={description} onChange={(event) => setDescription(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block font-bold text-slate-700 mb-1">Dự án tiếp nhận</label><select value={projCode} onChange={(event) => setProjCode(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">{projectOptions.map((project) => <option key={project.code} value={project.code}>{project.name}</option>)}</select></div><div><label className="block font-bold text-slate-700 mb-1">Nhà cung cấp / nguồn hàng</label><input type="text" placeholder="VD: Kho công ty, nhà cung cấp A" value={supplier} onChange={(event) => setSupplier(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div></div>
          <div className="grid grid-cols-3 gap-3"><div><label className="block font-bold text-slate-700 mb-1">Khối lượng</label><input type="number" value={volume} onChange={(event) => setVolume(Number(event.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div><div><label className="block font-bold text-slate-700 mb-1">Đơn vị</label><input type="text" value={unit} onChange={(event) => setUnit(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div><div><label className="block font-bold text-slate-700 mb-1">Đơn giá</label><input type="number" value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white" /></div></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="block font-bold text-slate-700 mb-1">Tình trạng mua hàng</label><select value={purchaseStatus} onChange={(event) => setPurchaseStatus(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">{PURCHASE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></div><div><label className="block font-bold text-slate-700 mb-1">Tình trạng thi công</label><select value={constrStatus} onChange={(event) => setConstrStatus(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">{CONSTRUCTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></div></div>
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100"><button type="button" onClick={() => setIsPlaceOrderModalOpen(false)} className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">Hủy</button><button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold hover:opacity-90">Lưu vật tư</button></div>
        </form>
      </Modal>
    </div>
  );
};
