import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { Toast } from '../components/common/Toast';

const filters = [
  { key: 'all', label: 'Tất cả' },
  { key: 'manager', label: 'Quản lý' },
  { key: 'worker', label: 'Nhân viên/Thợ' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'locked', label: 'Bị khóa' },
];

export const PersonnelPage: React.FC = () => {
  const { engineers, projects, addEngineer, createEngineer, updateEngineer, fetchProjects } = useRealtimeStore();
  const [filter, setFilter] = useState('all');

  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Nhân viên/Thợ');
  const [selectedProjectCodes, setSelectedProjectCodes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

  const toggleProjectCode = (code: string) => {
    setSelectedProjectCodes(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  useEffect(() => { fetchProjects(); }, []);

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const handleExportExcel = () => {
    const data = people.map(p => ({
      'Mã nhân viên': p.code,
      'Họ tên': p.name,
      'Vai trò': p.role,
      'Đội/Nhóm': p.team,
      'Số điện thoại': p.phone || 'Chưa cập nhật',
      'Trạng thái': p.locked ? 'Bị khóa' : 'Đang hoạt động'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NhanSu');
    XLSX.writeFile(wb, `Danh_Sach_Nhan_Su_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        if (!rows || rows.length === 0) { triggerToast('Sheet không có dữ liệu!', 'warning'); return; }
        let startRowIndex = -1;
        let headerRow: any[] = [];
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const r = rows[i];
          if (r && (r.includes('STT') || r.includes('stt') || r.includes('Stt') || r.some((cell: any) => String(cell).toLowerCase().includes('họ tên') || String(cell).toLowerCase().includes('mã nv')))) {
            startRowIndex = i + 1;
            headerRow = r;
            break;
          }
        }
        if (startRowIndex === -1) { triggerToast('Không tìm thấy dòng tiêu đề (Họ tên / Mã NV) trong file Excel!', 'warning'); return; }
        const headerString = headerRow.map(c => String(c || '').toLowerCase()).join('|');
        const isPersonnel = headerString.includes('họ tên') || headerString.includes('tên') || headerString.includes('vai trò') || headerString.includes('sđt') || headerString.includes('điện thoại');
        if (!isPersonnel) { triggerToast('File không đúng cấu trúc danh sách Nhân sự (thiếu cột Họ tên/SĐT)!', 'warning'); return; }
        const dataRows = rows.slice(startRowIndex);
        let importCount = 0;
        dataRows.forEach((row) => {
          const nameVal = row[1] || row[2];
          if (!nameVal) return;
          addEngineer({ name: String(nameVal).trim(), title: String(row[3] || 'Nhân viên/Thợ'), avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80', phone: String(row[4] || ''), email: '' });
          importCount++;
        });
        triggerToast(`Đã nhập thành công ${importCount} nhân sự từ file Excel!`, 'success');
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        triggerToast('Lỗi phân tích file Excel: ' + err.message, 'warning');
      }
    };
    reader.readAsBinaryString(file);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleLock = (id: string) => {
    setLockedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const resetForm = () => {
    setEditingPersonId(null);
    setName('');
    setPhone('');
    setRole('Nhân viên/Thợ');
    setSelectedProjectCodes([]);
  };

  const closeForm = () => {
    resetForm();
    setIsFormOpen(false);
  };

  const people = useMemo(() => engineers.map((engineer, index) => {
    const assignedProjects = [
      ...(engineer.managedProjects || []),
      ...(engineer.memberProjects || []),
    ].filter((value, assignedIndex, self) => self.findIndex((item) => item.code === value.code) === assignedIndex);

    return {
      ...engineer,
      assignedProjects,
      code: `NV-${String(index + 1).padStart(3, '0')}`,
      role: engineer.title?.trim() || 'Nhân viên/Thợ',
      team: assignedProjects[0]?.name || 'Chưa gán dự án',
      locked: lockedIds.includes(engineer.id),
    };
  }).filter((person) => {
    const matchFilter = filter === 'all'
      || (filter === 'manager' && person.role.includes('Quản lý'))
      || (filter === 'worker' && person.role.includes('Nhân viên'))
      || (filter === 'active' && !person.locked)
      || (filter === 'locked' && person.locked);
    return matchFilter;
  }), [engineers, filter, lockedIds]);

  const openCreateModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (person: typeof people[number]) => {
    setEditingPersonId(person.id);
    setName(person.name || '');
    setPhone(person.phone || '');
    setRole(person.role || 'Nhân viên/Thợ');
    setSelectedProjectCodes(person.assignedProjects.map((project) => project.code));
    setIsFormOpen(true);
  };

  const handleSavePerson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || submitting) return;
    if (selectedProjectCodes.length === 0) {
      triggerToast('Vui lòng chọn ít nhất 1 dự án cho nhân sự!', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      if (editingPersonId) {
        await updateEngineer(editingPersonId, {
          name: name.trim(),
          phone,
          title: role,
          projectCodes: selectedProjectCodes,
        });
        triggerToast(`Đã cập nhật nhân sự "${name.trim()}" thành công!`, 'success');
      } else {
        await createEngineer({
          name: name.trim(),
          phone,
          title: role,
          projectCodes: selectedProjectCodes,
        });
        triggerToast(`Đã thêm nhân sự "${name.trim()}" và gán ${selectedProjectCodes.length} dự án!`, 'success');
      }
      closeForm();
    } catch (e: any) {
      triggerToast(
        `${editingPersonId ? 'Lỗi khi cập nhật nhân sự: ' : 'Lỗi khi thêm nhân sự: '}${e?.response?.data?.error || e.message || 'Không xác định'}`,
        'warning'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-y-auto">
      <section className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-xl">groups</span></div>
          <div><h2 className="page-title text-2xl font-extrabold text-slate-900">Nhân sự</h2></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-primary text-xs font-bold border border-blue-100">{engineers.length} nhân sự</span>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportExcel} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            className="flex items-center gap-1 border border-slate-200 bg-white px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">file_upload</span>
            Nhập Excel
          </button>
          <button 
            onClick={handleExportExcel} 
            className="flex items-center gap-1 border border-slate-200 bg-white px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">file_download</span>
            Xuất Excel
          </button>
          <button
            onClick={openCreateModal}
            className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-1 shadow-xs"
          >
            <span className="material-symbols-outlined text-sm align-[-2px]">add</span>Thêm nhân sự
          </button>
        </div>
      </section>

      <div className="px-0 pt-0 pb-4 space-y-0 w-full max-w-full overflow-hidden">
      <section className="grid grid-cols-1 gap-0">
        <div className="bg-white border-b border-r border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2 sticky top-0 z-10 bg-white">
              {filters.map((item) => <button key={item.key} onClick={() => setFilter(item.key)} className={`app-tab-button flex items-center gap-1.5 px-3 py-1.5 border-b-2 transition-all whitespace-nowrap ${filter === item.key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>{item.label}</button>)}
            </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px]"><tr><th className="text-left p-3">Họ tên</th><th className="text-left p-3">Mã NV</th><th className="text-left p-3">Vai trò</th><th className="text-left p-3">Dự án</th><th className="text-left p-3">SĐT</th><th className="text-left p-3">Trạng thái</th><th className="text-left p-3">Chức năng</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {people.map((person) => (
                  <tr
                    key={person.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => openEditModal(person)}
                  >
                    <td className="p-3 text-sm font-semibold text-slate-900 tracking-tight">
                      <div className="truncate">{person.name}</div>
                      <div className="text-[11px] font-medium text-slate-500 mt-1">{person.team}</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-primary">{person.code}</td>
                    <td className="p-3 font-semibold text-slate-700">{person.role}</td>
                    <td className="p-3">
                      {person.assignedProjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {person.assignedProjects.map((mp) => (
                            <span key={mp.code} className="px-2 py-0.5 rounded-full bg-blue-50 text-primary text-[11px] font-bold border border-blue-100 whitespace-nowrap">{mp.name}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Chưa gán</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600">{person.phone || 'Chưa cập nhật'}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-[11px] font-bold ${person.locked ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{person.locked ? 'Bị khóa' : 'Đang hoạt động'}</span></td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(person);
                          }}
                          className="px-2 py-1 rounded border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleLock(person.id);
                          }}
                          className="px-2 py-1 rounded border border-slate-200 font-bold text-primary hover:bg-blue-50"
                        >
                          {person.locked ? 'Mở khóa' : 'Khóa'}
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditModal(person);
                          }}
                          className="px-2 py-1 rounded border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                        >
                          Gán đội/QL
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-lg text-slate-900">{editingPersonId ? 'Chỉnh sửa nhân sự' : 'Thêm nhân sự'}</h3>
              <button
                type="button"
                onClick={closeForm}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSavePerson} className="p-5 space-y-4">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Họ tên" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Số điện thoại" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              <select value={role} onChange={(event) => setRole(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary focus:outline-none">
                <option>Quản lý</option><option>Nhân viên/Thợ</option>
              </select>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Dự án <span className="text-red-500">*</span> <span className="font-normal text-slate-400">(chọn 1 hoặc nhiều)</span>
                </label>
                <div className={`max-h-36 overflow-y-auto border rounded-lg p-2 space-y-1.5 bg-slate-50 ${selectedProjectCodes.length === 0 ? 'border-red-200' : 'border-slate-200'}`}>
                  {projects.length === 0 && <p className="text-[11px] text-slate-400">Chưa có dự án nào.</p>}
                  {projects.map((p) => (
                    <label key={p.code} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input type="checkbox" checked={selectedProjectCodes.includes(p.code)} onChange={() => toggleProjectCode(p.code)} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                      <span className="font-semibold text-slate-700">{p.name}</span>
                      <span className="text-slate-400">({p.code})</span>
                    </label>
                  ))}
                </div>
                <p className={`mt-1 text-[11px] ${selectedProjectCodes.length > 0 ? 'text-primary' : 'text-red-500'}`}>
                  {selectedProjectCodes.length > 0
                    ? `Đã chọn ${selectedProjectCodes.length} dự án cho nhân sự này.`
                    : 'Bắt buộc chọn ít nhất 1 dự án khi tạo nhân sự.'}
                </p>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={closeForm} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200">Hủy</button>
                <button
                  type="submit"
                  disabled={submitting || projects.length === 0}
                  className="flex-1 bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? (editingPersonId ? 'Đang lưu...' : 'Đang thêm...') : (editingPersonId ? 'Lưu thay đổi' : 'Thêm nhân sự')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />
    </div>
  );
};
