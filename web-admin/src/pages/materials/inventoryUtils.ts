import { Material } from '../../types';

export type InventoryTab = 'CATALOG' | 'IMPORT' | 'EXPORT';
export type ToastType = 'success' | 'info' | 'warning';

export const PURCHASE_STATUSES = ['Ch\u01b0a \u0111\u1eb7t h\u00e0ng', '\u0110\u00e3 \u0111\u1eb7t h\u00e0ng', '\u0110\u00e3 c\u00f3 h\u00e0ng', 'H\u00e0ng gia c\u00f4ng'];
export const CONSTRUCTION_STATUSES = ['Ch\u01b0a thi c\u00f4ng', '\u0110ang thi c\u00f4ng', '\u0110\u00e3 thi c\u00f4ng', 'V\u01b0\u1edbng m\u1eafc'];

export const normalizeText = (value?: string) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\u0111\u0110]/g, 'd')
  .toLowerCase();

export const generateMaterialCode = (name?: string): string => {
  if (!name || !name.trim()) return `TSM-${Math.floor(100 + Math.random() * 900)}`;
  const normalized = String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9\s]/g, '')
    .replace(/\s+/g, '_');
  return `TSM-${normalized}`;
};


export const normalizeExcelKey = (val: unknown) => normalizeText(String(val || '').trim())
  .replace(/[^a-z0-9]/g, '');

export const normalizePurchaseStatus = (status?: string) => {
  if (!status) return 'Ch\u01b0a \u0111\u1eb7t h\u00e0ng';
  const val = normalizeText(status);
  if (val.includes('chua') || val.includes('not')) return 'Ch\u01b0a \u0111\u1eb7t h\u00e0ng';
  if (val.includes('da dat') || val.includes('order')) return '\u0110\u00e3 \u0111\u1eb7t h\u00e0ng';
  if (val.includes('co hang') || val.includes('on-site') || val.includes('da co')) return '\u0110\u00e3 c\u00f3 h\u00e0ng';
  if (val.includes('gia cong')) return 'H\u00e0ng gia c\u00f4ng';
  return status;
};

export const normalizeConstructionStatus = (status?: string) => {
  if (!status) return 'Ch\u01b0a thi c\u00f4ng';
  const val = normalizeText(status);
  if (val.includes('chua') || val.includes('not')) return 'Ch\u01b0a thi c\u00f4ng';
  if (val.includes('vuong') || val.includes('ton')) return 'V\u01b0\u1edbng m\u1eafc';
  if (val.includes('dang') || val.includes('doing')) return '\u0110ang thi c\u00f4ng';
  if (val.includes('da thi') || val.includes('done') || val.includes('hoan thanh')) return '\u0110\u00e3 thi c\u00f4ng';
  return status;
};

export const purchaseBadgeClass = (status: string) => {
  if (status === '\u0110\u00e3 c\u00f3 h\u00e0ng') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === '\u0110\u00e3 \u0111\u1eb7t h\u00e0ng') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'H\u00e0ng gia c\u00f4ng') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-red-50 text-red-700 border-red-200';
};

export const constructionBadgeClass = (status: string) => {
  if (status === '\u0110\u00e3 thi c\u00f4ng') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === '\u0110ang thi c\u00f4ng') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (status === 'V\u01b0\u1edbng m\u1eafc') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
};

export const formatNumber = (val: unknown): string => {
  const n = Number(val || 0);
  return n ? n.toLocaleString('vi-VN') : '0';
};

export const numVal = (val: unknown): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const parseExcelDate = (val: unknown): string => {
  if (!val) return '';
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  const dateStr = String(val).trim();
  const d = new Date(dateStr);
  if (!Number.isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return dateStr;
};

export const materialCurrentStock = (material: Material): number => {
  const initial = Number(material.initialStock || 0);
  const imports = Number(material.totalImport || 0);
  const exports = Number(material.totalExport || 0);
  return initial + imports - exports;
};

export const makeHeaderReader = (headerRow: unknown[]) => {
  const normHeaders = headerRow.map((cell) => normalizeExcelKey(cell));
  const indexOf = (...aliases: string[]) => {
    for (const alias of aliases) {
      const idx = normHeaders.indexOf(normalizeExcelKey(alias));
      if (idx >= 0) return idx;
    }
    return -1;
  };
  return {
    value: (row: unknown[], ...aliases: string[]) => {
      const index = indexOf(...aliases);
      return index >= 0 ? row[index] : undefined;
    },
  };
};

export const findHeaderRow = (rows: unknown[][]) => {
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    const row = rows[i] || [];
    if (row.some((cell) => normalizeExcelKey(cell) === 'stt')) return { headerRow: row, startRowIndex: i + 1 };
  }
  return null;
};

export const findInventorySheetName = (sheetNames: string[], activeTab: InventoryTab) => {
  const targets: Record<InventoryTab, string[]> = {
    CATALOG: ['tonkhotonghop', 'ton kho', 'ton', 'danh muc', 'overview'],
    IMPORT: ['nhapkho', 'nhap kho', 'nhap', 'import'],
    EXPORT: ['xuatkho', 'xuat kho', 'xuat', 'export'],
  };
  return sheetNames.find((name) => targets[activeTab].some((target) => normalizeExcelKey(name).includes(normalizeExcelKey(target)))) || sheetNames[0];
};
