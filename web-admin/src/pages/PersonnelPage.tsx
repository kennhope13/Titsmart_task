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
  const { engineers, projects, createEngineer, updateEngineer, deleteEngineer, fetchProjects } = useRealtimeStore();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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
      code: engineer.code || `NV-${String(index + 1).padStart(3, '0')}`,
      role: engineer.title?.trim() || 'Nhân viên/Thợ',
      team: assignedProjects[0]?.name || 'Chưa gán dự án',
      locked: lockedIds.includes(engineer.id),
    };
  }).filter((person) => {
    const term = searchTerm.toLowerCase();
    const matchSearch = !term 
      || person.name.toLowerCase().includes(term)
      || person.code.toLowerCase().includes(term)
      || person.role.toLowerCase().includes(term)
      || (person.phone && person.phone.toLowerCase().includes(term));

    const matchFilter = filter === 'all'
      || (filter === 'manager' && person.role.includes('Quản lý'))
      || (filter === 'worker' && person.role.includes('Nhân viên'))
      || (filter === 'active' && !person.locked)
      || (filter === 'locked' && person.locked);
    return matchFilter && matchSearch;
  }), [engineers, filter, lockedIds, searchTerm]);

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

  const handleDeletePerson = async (id: string, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhân sự "${name}"?`)) return;
    try {
      await deleteEngineer(id);
      triggerToast(`Đã xóa nhân sự "${name}"`, 'success');
    } catch (err: any) {
      triggerToast(`Lỗi khi xóa nhân sự: ${err?.response?.data?.error || err.message}`, 'warning');
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-hidden">
      <section className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-xl">groups</span></div>
          <div><h2 className="page-title text-2xl font-extrabold text-slate-900">Nhân sự</h2></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-primary text-xs font-bold border border-blue-100">{engineers.length} nhân sự</span>
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

      <div className="flex-1 w-full max-w-full overflow-hidden flex flex-col pb-4">
      <section className="flex-1 grid grid-cols-1 gap-0 overflow-hidden">
        <div className="bg-white border-b border-r border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-white">
              <div className="flex flex-wrap gap-2">
                {filters.map((item) => <button key={item.key} onClick={() => setFilter(item.key)} className={`app-tab-button flex items-center gap-1.5 px-3 py-1.5 border-b-2 transition-all whitespace-nowrap ${filter === item.key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>{item.label}</button>)}
              </div>
              <div className="relative w-full max-w-xs">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm nhân sự..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </div>
          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar relative">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-50 text-slate-500 uppercase text-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200"><tr><th className="text-left p-3 bg-slate-50">Họ tên</th><th className="text-left p-3 bg-slate-50">Mã NV</th><th className="text-left p-3 bg-slate-50">Vai trò</th><th className="text-left p-3 bg-slate-50">Dự án</th><th className="text-left p-3 bg-slate-50">SĐT</th><th className="text-left p-3 bg-slate-50">Trạng thái</th><th className="text-left p-3 bg-slate-50">Chức năng</th></tr></thead>
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
                    <td className="p-3 font-mono font-bold text-primary whitespace-nowrap">{person.code}</td>
                    <td className="p-3 font-semibold text-slate-700 whitespace-nowrap">{person.role}</td>
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
                    <td className="p-3 text-slate-600 whitespace-nowrap">{person.phone || 'Chưa cập nhật'}</td>
                    <td className="p-3 whitespace-nowrap"><span className={`px-2 py-1 rounded-full text-[11px] font-bold ${person.locked ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{person.locked ? 'Bị khóa' : 'Đang hoạt động'}</span></td>
                    <td className="p-3 min-w-[130px]">
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
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDeletePerson(person.id, person.name);
                          }}
                          className="px-2 py-1 rounded border border-red-200 font-bold text-red-600 hover:bg-red-50"
                        >
                          Xóa
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
