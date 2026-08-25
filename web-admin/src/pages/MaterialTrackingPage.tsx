import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { Modal } from '../components/common/Modal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { Toast } from '../components/common/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import { Material, InventoryTransaction } from '../types';
import { CustomSelect } from '@/components/common/CustomSelect';

const PURCHASE_STATUSES = ['Chưa đặt hàng', 'Đã đặt hàng', 'Đã có hàng', 'Hàng gia công'];
const CONSTRUCTION_STATUSES = ['Chưa thi công', 'Đang thi công', 'Đã thi công', 'VƯỚNG MẮC'];

const normalizeText = (value?: string) => (value || '').toLowerCase();

const normalizePurchaseStatus = (status?: string) => {
  if (!status || status === 'Not Ordered' || status.includes('Chưa')) return 'Chưa đặt hàng';
  if (status === 'Ordered') return 'Đã đặt hàng';
  if (status === 'On-site' || status.includes('lÃ³') || status.includes('có hàng')) return 'Đã có hàng';
  if (status.includes('gia')) return 'Hàng gia công';
  return status;
};

const generateMaterialCode = (name: string, suffix?: string) => {
  const normalized = name
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-') // replace non-alphanumeric with hyphen
    .replace(/-+/g, '-') // remove consecutive hyphens
    .replace(/^-|-$/g, ''); // trim hyphens
  return `TSM-${normalized}${suffix ? `-${suffix}` : ''}`.substring(0, 100);
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
  const { projectId } = useParams();
  const { materials, projects, inventoryTransactions, addMaterial, addMaterialsBatch, updateMaterial, deleteMaterial, addInventoryTransaction, addInventoryTransactionsBatch, logActivity } = useRealtimeStore();

  const currentProject = projects.find(p => p.id === projectId || p.code === projectId);
  const projectCodeFilter = currentProject ? currentProject.code : null;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        const inventoryKeywords = ['TỒN', 'NHẬP', 'XUẤT', 'TON', 'NHAP', 'XUAT'];
        const hasInventorySheets = wb.SheetNames.length === 1 || wb.SheetNames.some(name => 
          inventoryKeywords.some(keyword => name.toUpperCase().includes(keyword))
        );
        if (!hasInventorySheets) {
          triggerToast('File này không phải là file Quản lý Kho (thiếu các sheet Tồn/Nhập/Xuất)!', 'warning');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const parseExcelDate = (dateVal: any) => {
          if (!dateVal) return '';
          if (typeof dateVal === 'string') return dateVal;
          try {
            const date = new Date((dateVal - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
          } catch (e) {
            return String(dateVal);
          }
        };

        const numVal = (val: any) => {
          if (val === null || val === undefined) return 0;
          if (typeof val === 'number') return val;
          const cleaned = String(val).replace(/[^0-9.-]/g, '');
          const parsed = parseFloat(cleaned);
          return isNaN(parsed) ? 0 : parsed;
        };

        let targetSheetName = '';
        if (activeTab === 'OVERVIEW') {
          targetSheetName = wb.SheetNames.find(s => s.includes('TỒN') || s.includes('TonKho') || s.includes('Overview')) || wb.SheetNames[0];
        } else if (activeTab === 'IMPORT') {
          targetSheetName = wb.SheetNames.find(s => s.includes('NHẬP') || s.includes('NhapKho') || s.includes('Import')) || wb.SheetNames[0];
        } else if (activeTab === 'EXPORT') {
          targetSheetName = wb.SheetNames.find(s => s.includes('XUẤT') || s.includes('XuatKho') || s.includes('Export')) || wb.SheetNames[0];
        }

        if (!targetSheetName) {
          triggerToast('Không tìm thấy sheet phù hợp trong file Excel!', 'warning');
          return;
        }

        const ws = wb.Sheets[targetSheetName];
        const rawData = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });
        let startRowIndex = -1;
        for (let i = 0; i < Math.min(rawData.length, 15); i++) {
          const r = rawData[i] || [];
          if (r.some((cell: any) => String(cell).toUpperCase() === 'STT')) {
            startRowIndex = i + 1;
            break;
          }
        }

        if (startRowIndex === -1) {
          triggerToast('Không tìm thấy dòng tiêu đề (STT) trong file Excel!', 'warning');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        const dataRows = rawData.slice(startRowIndex).filter((row: any[]) => row && row.length > 1 && (row[0] || row[1] || row[2] || row[3]));

        if (dataRows.length === 0) {
          triggerToast('File không có dữ liệu!', 'warning');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        let importCount = 0;

        if (activeTab === 'OVERVIEW') {
          let lastCategory = '';
          let lastName = '';
          
          const materialsToAdd: any[] = [];

          const usedCodes = new Set<string>();
          materials.forEach(m => usedCodes.add(m.code));

          dataRows.forEach((row) => {
            const category = row[1] || lastCategory;
            const name = row[2] || lastName;
            
            if (!name && !row[3]) return; // Skip completely empty rows
            
            lastCategory = category;
            lastName = name;
            
            let finalName = String(name).trim();
            const specs = String(row[4] || '').trim();
            
            const sttVal = numVal(row[0]) || (importCount + materialsToAdd.length + 1);
            
            const unit = String(row[6] || 'Cái').trim();
            
            let finalCode = String(row[3] || '').trim();
            if (!finalCode) {
              let suffixNum = 0;
              let codeBase = specs ? specs : finalName;
              finalCode = generateMaterialCode(codeBase);
              while (usedCodes.has(finalCode)) {
                suffixNum++;
                finalCode = generateMaterialCode(codeBase, String(suffixNum));
              }
            } else {
              // If user provided a code, but it's a duplicate, try appending specs
              if (usedCodes.has(finalCode)) {
                let codeWithSpecs = finalCode;
                if (specs) codeWithSpecs += `-${generateMaterialCode(specs).replace('TSM-', '')}`;
                finalCode = codeWithSpecs;
                
                // If it's STILL a duplicate even after adding specs, then append a number as last resort
                let suffixNum = 0;
                let originalUserCode = finalCode;
                while (usedCodes.has(finalCode)) {
                  suffixNum++;
                  finalCode = `${originalUserCode}-${suffixNum}`;
                }
              }
            }
            usedCodes.add(finalCode);
            
            materialsToAdd.push({
              stt: sttVal,
              code: finalCode,
              name: finalName,
              category: String(category || 'Vật tư chung'),
              englishName: finalName,
              projectCode: currentProject ? currentProject.code : 'COMPANY',
              projectName: currentProject ? currentProject.name : 'Kho Công Ty',
              specs: specs,
              unit: unit || 'Cái',
              initialStock: numVal(row[7] || 0),
              currentStock: numVal(row[8] || numVal(row[7] || 0)),
              totalImport: numVal(row[9] || 0),
              totalExport: numVal(row[10] || 0),
              notes: String(row[11] || ''),
              volume: numVal(row[7] || 0),
              status: 'Đã có hàng',
            });
          });

          // Add the entire batch sequentially in the exact top-to-bottom order from Excel
          const doImport = async () => {
            setLoading(true);
            setLoadingMessage('Đang nhập dữ liệu vào kho, vui lòng chờ...');
            try {
              const createdMats = await addMaterialsBatch(materialsToAdd);
              
              if (createdMats && createdMats.length > 0) {
                const importTransactions = createdMats
                  .filter(m => (m.currentStock || m.initialStock || 0) > 0)
                  .map(m => ({
                    type: 'IMPORT' as 'IMPORT',
                    date: new Date().toISOString().split('T')[0],
                    materialId: m.id,
                    materialCode: m.code,
                    materialName: m.name,
                    specs: m.specs || '',
                    quantity: m.currentStock || m.initialStock || 0,
                    unit: m.unit || 'Cái',
                    sourceOrProject: 'Tồn đầu kỳ / Import',
                    notes: 'Nhập tự động từ file Tồn Kho Tổng Hợp'
                  }));
                
                if (importTransactions.length > 0) {
                  await addInventoryTransactionsBatch(importTransactions);
                }
              }

              importCount += materialsToAdd.length;
              triggerToast(`Đã nhập thành công ${importCount} vật tư vào Tồn Kho!`, 'success');
              if (fileInputRef.current) fileInputRef.current.value = '';
            } finally {
              setLoading(false);
              setLoadingMessage('');
            }
          };
          await doImport();
          return; // Exit here for OVERVIEW so it doesn't trigger the toast at the bottom
        } else {
          const isImport = activeTab === 'IMPORT';
          const headerString = rawData[startRowIndex-1]?.join(' ') || '';
          const hasKeyword = headerString.includes('mã') || headerString.includes('số lượng') || headerString.includes('ngày') || (isImport ? headerString.includes('nguồn') : headerString.includes('người nhận') || headerString.includes('dự án'));
          if (!hasKeyword) {
            triggerToast(`File không đúng cấu trúc Nhật ký ${isImport ? 'Nhập' : 'Xuất'} kho!`, 'warning');
            return;
          }

          dataRows.forEach((row) => {
            const matCode = String(row[2] || '');
            if (!matCode) return;

            const mat = materials.find(m => m.code.toUpperCase() === matCode.toUpperCase());
            const matId = mat ? mat.id : `mat-temp-${Date.now()}-${importCount}`;
            const matName = mat ? mat.name : String(row[3] || 'Vật tư chưa đăng ký');

            addInventoryTransaction({
              type: isImport ? 'IMPORT' : 'EXPORT',
              date: parseExcelDate(row[1]),
              materialId: matId,
              materialCode: matCode,
              materialName: matName,
              specs: String(row[4] || ''),
              unit: String(row[5] || 'cái'),
              quantity: numVal(row[6]),
              sourceOrProject: String(row[7] || ''),
              receiverName: isImport ? '' : String(row[8] || ''),
              notes: String(row[9] || '')
            });
            importCount++;
          });
        }

        triggerToast(`Đã nhập thành công ${importCount} dòng dữ liệu vào Nhật ký ${activeTab === 'IMPORT' ? 'Nhập Kho' : 'Xuất Kho'}!`, 'success');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        triggerToast('Lỗi phân tích Excel: ' + err.message, 'warning');
      }
    };
    reader.readAsBinaryString(file);
    }
  };

  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'IMPORT' | 'EXPORT'>('OVERVIEW');

  const [isPlaceOrderModalOpen, setIsPlaceOrderModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  const [transactionType, setTransactionType] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);

  // Filter state
  const [filterCategory, setFilterCategory] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Sticky header dynamic height
  const stickyHeaderRef = useRef<HTMLDivElement>(null);
  const [stickyHeight, setStickyHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      if (stickyHeaderRef.current) {
        setStickyHeight(stickyHeaderRef.current.offsetHeight);
      }
    };
    
    // Initial check
    updateHeight();
    
    // Small delay to ensure rendering is complete
    const timeoutId = setTimeout(updateHeight, 100);
    
    window.addEventListener('resize', updateHeight);
    return () => {
      window.removeEventListener('resize', updateHeight);
      clearTimeout(timeoutId);
    };
  }, [activeTab]);

  // New Material form state
  const [newMatCode, setNewMatCode] = useState('');
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

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string | React.ReactNode;
    onConfirm: () => void;
    icon?: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

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

  const uniqueCategories = useMemo(() => Array.from(new Set(materials.map(m => m.category || 'Vật tư chung').filter(Boolean))).sort(), [materials]);
  const uniqueNames = useMemo(() => Array.from(new Set(materials.map(m => m.name || '').filter(Boolean))).sort(), [materials]);
  const uniqueUnits = useMemo(() => Array.from(new Set(materials.map(m => m.unit || '').filter(Boolean))).sort(), [materials]);

  const filteredMaterials = useMemo(() => {
    let result = materials.filter(m => {
      if (projectCodeFilter && m.projectCode !== projectCodeFilter) return false;
      if (filterCategory && (m.category || 'Vật tư chung') !== filterCategory) return false;
      if (filterName && m.name !== filterName) return false;
      if (filterUnit && m.unit !== filterUnit) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const codeMatch = (m.code || '').toLowerCase().includes(q);
        const nameMatch = (m.name || '').toLowerCase().includes(q);
        const descMatch = (m.specs || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !descMatch) return false;
      }

      // OVERVIEW matches everything
      if (activeTab === 'IMPORT' && m.totalImport === 0) return false;
      if (activeTab === 'EXPORT' && m.totalExport === 0) return false;
      return true;
    });

    // Sắp xếp theo STT (từ nhỏ đến lớn)
    result.sort((a, b) => {
      const sttA = a.stt ?? Number.MAX_SAFE_INTEGER;
      const sttB = b.stt ?? Number.MAX_SAFE_INTEGER;
      return sttA - sttB;
    });

    return result;
  }, [materials, activeTab, filterCategory, filterName, filterUnit, searchQuery]);

  const imports = inventoryTransactions
    .filter(tx => tx.type === "IMPORT" && (!projectCodeFilter || materials.find(m => m.id === tx.materialId)?.projectCode === projectCodeFilter))
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const exports = inventoryTransactions
    .filter(tx => tx.type === "EXPORT" && (!projectCodeFilter || materials.find(m => m.id === tx.materialId)?.projectCode === projectCodeFilter))
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

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

  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName) {
      triggerToast('Vui lòng nhập tên vật tư!', 'warning');
      return;
    }

    const maxStt = materials.reduce((max, m) => Math.max(max, m.stt || 0), 0);
    const nextStt = maxStt + 1;

    let finalCode = newMatCode;
    if (!finalCode) {
      let suffixNum = 0;
      let codeBase = description ? description : matName;
      finalCode = generateMaterialCode(codeBase);
      const usedCodes = new Set(materials.map(m => m.code));
      while (usedCodes.has(finalCode)) {
        suffixNum++;
        finalCode = generateMaterialCode(codeBase, String(suffixNum));
      }
    }

    const newMat = {
      stt: nextStt,
      code: finalCode,
      name: matName.trim(),
      englishName: description.trim() || matName.trim(),
      projectCode: currentProject ? currentProject.code : 'COMPANY',
      projectName: currentProject ? currentProject.name : 'Kho Công Ty',
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
    };
    
    addMaterial(newMat);

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

    const commitTransaction = () => {
      addInventoryTransaction({
        type: transactionType,
        date: txDate,
        materialId: material.id,
        materialCode: material.code,
        materialName: material.name,
        specs: material.specs || material.englishName || '',
        unit: material.unit,
        quantity: txQuantity,
        sourceOrProject: txSourceOrProject,
        receiverName: txReceiverName,
        notes: txNotes,
        // Truyền thêm để backend dùng khi vật tư chưa tồn tại trong DB
        initialStock: material.initialStock || 0,
        category: material.category || '',
        volume: material.volume || 0,
        unitPrice: material.unitPrice || 0,
        supplier: material.supplier || '',
      } as any);
      setIsTransactionModalOpen(false);
    };

    if (transactionType === 'EXPORT') {
      const current = material.currentStock !== undefined ? material.currentStock : (material.initialStock || 0);
      if (txQuantity > current) {
        setConfirmConfig({
          isOpen: true,
          title: 'Cảnh báo xuất kho âm',
          message: `Số lượng xuất (${txQuantity}) lớn hơn Tồn kho hiện tại (${current}). Bạn có chắc chắn muốn tiếp tục xuất kho âm?`,
          icon: 'warning',
          isDestructive: true,
          confirmText: 'Xuất kho',
          onConfirm: commitTransaction,
        });
        return;
      }
    }

    commitTransaction();
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-slate-50 relative overflow-hidden">
      <section className="border-b border-slate-200 bg-white pl-3 pr-[140px] py-4 md:py-0 md:h-12 flex flex-col xl:flex-row justify-between xl:items-center gap-3">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">QUẢN LÝ KHO & VẬT TƯ</h2>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="flex items-center gap-1 border border-slate-200 bg-white h-[34px] px-4 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-base">file_upload</span>
            Nhập Excel
          </button>
          <button onClick={handleExportExcel} className="flex items-center gap-1 border border-slate-200 bg-white h-[34px] px-4 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs">
            <span className="material-symbols-outlined text-base">file_download</span>
            Xuất Excel
          </button>
          <button onClick={() => handleOpenTransaction('IMPORT')} className="flex items-center gap-1 bg-emerald-600 text-white h-[34px] px-4 rounded-lg text-xs font-bold hover:bg-emerald-700 active:scale-95 transition-all shadow-xs">
            <span className="material-symbols-outlined text-base">arrow_downward</span>
            Nhập Kho
          </button>
          <button onClick={() => handleOpenTransaction('EXPORT')} className="flex items-center gap-1 bg-amber-500 text-white h-[34px] px-4 rounded-lg text-xs font-bold hover:bg-amber-600 active:scale-95 transition-all shadow-xs">
            <span className="material-symbols-outlined text-base">arrow_upward</span>
            Xuất Kho
          </button>
        </div>
      </section>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <section className="bg-white flex flex-col flex-1 min-w-0 min-h-0">

        {/* TABS & FILTERS */}
        <div ref={stickyHeaderRef} className="flex flex-col border-b border-slate-200 bg-white z-20">
          <div className="flex items-center gap-4 px-4 pt-1">
            {[
              { id: 'OVERVIEW', label: 'Tồn Kho Tổng Hợp', icon: 'inventory' },
              { id: 'IMPORT', label: 'Nhật Ký Nhập Kho', icon: 'login' },
              { id: 'EXPORT', label: 'Nhật Ký Xuất Kho', icon: 'logout' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-base leading-none">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
          
          {/* Lọc chi tiết */}
          <div className="h-[34px] px-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-3 overflow-x-auto custom-scrollbar justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold text-xs whitespace-nowrap pr-1">
                <span className="material-symbols-outlined text-[16px]">filter_list</span>
                Lọc chi tiết:
              </div>
              
              <CustomSelect 
                className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-[150px] max-w-[200px] truncate cursor-pointer hover:bg-slate-50 transition-colors"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">Danh mục: Tất cả</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </CustomSelect>

              <CustomSelect 
                className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-[150px] max-w-[200px] truncate cursor-pointer hover:bg-slate-50 transition-colors"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              >
                <option value="">Tên Vật Tư: Tất cả</option>
                {uniqueNames.map(n => <option key={n} value={n}>{n}</option>)}
              </CustomSelect>

              <CustomSelect 
                className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary/20 min-w-[100px] max-w-[150px] truncate cursor-pointer hover:bg-slate-50 transition-colors"
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
              >
                <option value="">ĐVT: Tất cả</option>
                {uniqueUnits.map(u => <option key={u} value={u}>{u}</option>)}
              </CustomSelect>
            </div>
            
            <div className="flex items-center flex-shrink-0">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
                <input
                  type="text"
                  placeholder="Tìm tên, mã vật tư..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-7 pr-2 py-1 border border-slate-200 rounded text-xs w-[180px] focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'OVERVIEW' && (
          <>
            <div className="overflow-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-collapse">
                 <thead 
                   style={{ top: 0 }}
                   className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky z-10 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] before:absolute before:inset-0 before:border-b before:border-slate-200"
                 >
                 <tr>
                   <th className="p-2 w-10 text-center bg-slate-50">STT</th>
                   <th className="p-2 w-[8%] bg-slate-50">Danh mục</th>
                   <th className="p-2 w-[15%] bg-slate-50">Tên Vật Tư</th>
                   <th className="p-2 w-[8%] bg-slate-50">Mã Vật Tư</th>
                   <th className="p-2 w-[12%] bg-slate-50">Thông Số Kỹ Thuật</th>
                   <th className="p-2 text-center w-[6%] bg-slate-50">ĐVT</th>
                   <th className="p-2 text-right w-[7%] bg-slate-50">Tồn Đầu</th>
                   <th className="p-2 text-right w-[7%] bg-slate-50">Nhập</th>
                   <th className="p-2 text-right w-[7%] bg-slate-50">Xuất</th>
                   <th className="p-2 text-right w-[7%] bg-slate-50">Tồn Kho</th>
                   <th className="p-2 w-[10%] bg-slate-50">Ghi Chú</th>
                   <th className="p-2 text-center w-[5%] bg-slate-50">Thao tác</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredMaterials.map((material, index) => {
                    const purchase = normalizePurchaseStatus(material.status);
                    return (
                      <tr key={material.id} onClick={() => openEditMaterial(material)} className="hover:bg-blue-50/50 transition-colors align-top cursor-pointer">
                        <td className="p-3.5 text-center text-slate-500 font-medium">{material.stt || (index + 1)}</td>
                        <td className="p-3.5 text-slate-600 text-xs">{material.category || 'Vật tư chung'}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900 leading-snug">{material.name}</div>
                        </td>
                        <td className="p-3.5 font-mono text-slate-500 text-xs">{material.code}</td>
                        <td className="p-3.5 text-slate-600 text-xs">
                          {material.specs || '-'}
                        </td>
                        <td className="p-3.5 text-center text-slate-600">{material.unit}</td>
                        <td className="p-3.5 text-right text-slate-500">{material.initialStock || 0}</td>
                        <td className="p-3.5 text-right text-emerald-600 font-bold">+{material.totalImport || 0}</td>
                        <td className="p-3.5 text-right text-amber-600 font-bold">-{material.totalExport || 0}</td>
                        <td className="p-3.5 text-right font-bold text-primary text-sm">{(material.currentStock !== undefined ? material.currentStock : (material.initialStock || 0)).toLocaleString('vi-VN')}</td>
                        <td className="p-3.5 text-slate-600 text-xs max-w-xs truncate" title={material.notes || ''}>{material.notes || '-'}</td>
                        <td className="p-3.5 text-center" onClick={(event) => event.stopPropagation()}>
                          <button type="button" onClick={() => {
                            setConfirmConfig({
                              isOpen: true,
                              title: 'Xóa vật tư',
                              message: `Bạn chắc chắn muốn xóa vật tư "${material.name}"?`,
                              icon: 'delete',
                              isDestructive: true,
                              confirmText: 'Xóa',
                              onConfirm: () => deleteMaterial(material.id),
                            });
                          }} className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors" title="Xóa vật tư">
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMaterials.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-slate-500">Không có vật tư nào.</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'IMPORT' && (
          <div className="w-full overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse">
              <thead 
                style={{ top: 0 }}
                className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky z-10 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] before:absolute before:inset-0 before:border-b before:border-slate-200"
              >
                <tr>
                  <th className="p-3.5 w-10 text-center bg-slate-50">STT</th>
                  <th className="p-3.5 bg-slate-50">Ngày Nhập</th>
                  <th className="p-3.5 bg-slate-50">Mã Vật Tư</th>
                  <th className="p-3.5 min-w-64 bg-slate-50">Tên Vật Tư</th>
                  <th className="p-3.5 text-slate-500 bg-slate-50">Quy Cách</th>
                  <th className="p-3.5 text-right bg-slate-50">S.Lượng Nhập</th>
                  <th className="p-3.5 text-center bg-slate-50">ĐVT</th>
                  <th className="p-3.5 bg-slate-50">Nguồn / Nhà Cung Cấp</th>
                  <th className="p-3.5 min-w-40 bg-slate-50">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {imports.map((tx, index) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 text-center text-slate-500 font-medium">{index + 1}</td>
                    <td className="p-3.5 font-bold text-slate-900">{tx.date ? new Date(tx.date).toLocaleDateString("vi-VN") : "-"}</td>
                    <td className="p-3.5 font-mono text-slate-500">{tx.materialCode}</td>
                    <td className="p-3.5 font-bold text-slate-800">{tx.materialName}</td>
                    <td className="p-3.5 text-slate-500">{tx.specs || '-'}</td>
                    <td className="p-3.5 text-right font-bold text-emerald-600">+{tx.quantity.toLocaleString('vi-VN')}</td>
                    <td className="p-3.5 text-center text-slate-500">{tx.unit}</td>
                    <td className="p-3.5 text-slate-600">{tx.sourceOrProject || '-'}</td>
                    <td className="p-3.5 text-slate-500 italic">{tx.notes || '-'}</td>
                  </tr>
                ))}
                {imports.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-slate-500">Chưa có giao dịch nhập kho nào.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'EXPORT' && (
          <div className="w-full overflow-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse">
              <thead 
                style={{ top: 0 }}
                className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider sticky z-10 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)] before:absolute before:inset-0 before:border-b before:border-slate-200"
              >
                <tr>
                  <th className="p-3.5 w-10 text-center bg-slate-50">STT</th>
                  <th className="p-3.5 bg-slate-50">Ngày Xuất</th>
                  <th className="p-3.5 bg-slate-50">Mã Vật Tư</th>
                  <th className="p-3.5 min-w-64 bg-slate-50">Tên Vật Tư</th>
                  <th className="p-3.5 text-slate-500 bg-slate-50">Quy Cách</th>
                  <th className="p-3.5 text-right bg-slate-50">S.Lượng Xuất</th>
                  <th className="p-3.5 text-center bg-slate-50">ĐVT</th>
                  <th className="p-3.5 bg-slate-50">Dự Án Nhận</th>
                  <th className="p-3.5 bg-slate-50">Người Nhận</th>
                  <th className="p-3.5 min-w-40 bg-slate-50">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                {exports.map((tx, index) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3.5 text-center text-slate-500 font-medium">{index + 1}</td>
                    <td className="p-3.5 font-bold text-slate-900">{tx.date ? new Date(tx.date).toLocaleDateString("vi-VN") : "-"}</td>
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
                {exports.length === 0 && <tr><td colSpan={10} className="p-8 text-center text-slate-500">Chưa có giao dịch xuất kho nào.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>

      {/* MODAL CẬP NHẬT VẬT TƯ */}
      <Modal isOpen={!!editingMaterial} onClose={() => setEditingMaterial(null)} title="Cập nhật Thông tin Vật tư">
        {editingMaterial && (
          <form onSubmit={handleSaveMaterial} className="space-y-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="font-bold text-slate-900">{editingMaterial.name}</div>
              <div className="text-[11px] text-slate-500 mt-1">{editingMaterial.code}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block font-bold text-slate-700 mb-1">Tình trạng mua hàng</label><CustomSelect value={editPurchaseStatus} onChange={(event) => setEditPurchaseStatus(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">{PURCHASE_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</CustomSelect></div>
              <div><label className="block font-bold text-slate-700 mb-1">Tình trạng thi công</label><CustomSelect value={editConstrStatus} onChange={(event) => setEditConstrStatus(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">{CONSTRUCTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</CustomSelect></div>
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
        <form onSubmit={handleAddMaterial} className="space-y-3 text-xs">
          <div><label className="block font-bold text-slate-700 mb-1">Mã vật tư (Tùy chọn)</label><input type="text" placeholder="Bỏ trống để tự động tạo (VD: MAT-186)" value={newMatCode} onChange={(event) => setNewMatCode(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-mono" /></div>
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
            <div className="flex items-center justify-between mb-1">
              <label className="block font-bold text-slate-700">Chọn Vật tư *</label>
              <button 
                type="button" 
                onClick={(e) => {
                  e.preventDefault();
                  setIsTransactionModalOpen(false);
                  setIsPlaceOrderModalOpen(true);
                }} 
                className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5"
                title="Tạo mã vật tư mới vào danh mục kho"
              >
                <span className="material-symbols-outlined text-[14px]">add_circle</span>
                Thêm vật tư mới
              </button>
            </div>
            <CustomSelect required searchable value={txMaterialId} onChange={(e) => setTxMaterialId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white">
              
              {materials.map(m => (
                <option key={m.id} value={m.id}>[{m.code}] {m.name} (Tồn: {m.currentStock ?? (m.initialStock || 0)} {m.unit})</option>
              ))}
            </CustomSelect>
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
      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        icon={confirmConfig.icon}
        isDestructive={confirmConfig.isDestructive}
        confirmText={confirmConfig.confirmText}
        cancelText={confirmConfig.cancelText}
      />
      
      <LoadingSpinner loading={loading} message={loadingMessage} />

    </div>
  );
};
