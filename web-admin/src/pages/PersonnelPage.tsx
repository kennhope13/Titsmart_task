import { Permission } from '../types';
import { getDefaultPermissions } from '../services/authStore';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';
import { Toast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { CustomSelect } from '@/components/common/CustomSelect';

const filters = [
  { key: 'all', label: 'Tất cả' },
  { key: 'manager', label: 'Quản lý' },
  { key: 'worker', label: 'Nhân viên' },
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
  const [role, setRole] = useState('Nhân viên');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedProjectCodes, setSelectedProjectCodes] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [deletingPerson, setDeletingPerson] = useState<{ id: string; name: string } | null>(null);

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
    const data = people.map((p, index) => ({
      'STT': index + 1,
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

  const toggleLock = async (person: any) => {
    try {
      const newStatus = !person.locked;
      await updateEngineer(person.id, { isLocked: newStatus } as any);
      triggerToast(`Đã ${newStatus ? 'khóa' : 'mở khóa'} tài khoản ${person.name}`, 'success');
    } catch (e: any) {
      triggerToast(`Lỗi: ${e?.message}`, 'warning');
    }
  };

  const resetForm = () => {
    setEditingPersonId(null);
    setName('');
    setPhone('');
    setRole('Nhân viên');
    setUsername('');
    setPassword('');
    setSelectedProjectCodes([]);
    setPermissions(getDefaultPermissions('Nhân viên'));
  };

  const closeForm = () => {
    resetForm();
    setIsFormOpen(false);
  };

  const people = useMemo(() => engineers.map((engineer, index) => {
    let assignedProjects = [];
    
    // Combine all sources of assigned projects
    const allAssigned = [
      ...(engineer.managedProjects || []),
      ...(engineer.memberProjects || []),
    ];
    
    if (engineer.projectCodes && Array.isArray(engineer.projectCodes)) {
      engineer.projectCodes.forEach((code: string) => {
        const found = projects.find(p => p.code === code);
        if (found) {
          allAssigned.push({ code: found.code, name: found.name });
        }
      });
    }

    // Filter out duplicates and projects that no longer exist in the projects list
    assignedProjects = allAssigned.filter((value, assignedIndex, self) => 
      projects.some(p => p.code === value.code) && // Ensure project still exists
      self.findIndex((item) => item.code === value.code) === assignedIndex
    );

    let rawRole = (engineer as any).role || engineer.title?.trim() || 'Nhân viên';
    if (rawRole === 'Nhân viên/Thợ') rawRole = 'Nhân viên';
    
    const removeAccents = (str: string) => {
      return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
    };
    
    const cleanRole = removeAccents(rawRole).toUpperCase().replace(/\s+/g, '-');
    const cleanName = removeAccents(engineer.name).toUpperCase().replace(/\s+/g, '-');

    let legacyCode = engineer.code || '';
    if (legacyCode.includes('/THO')) {
      legacyCode = legacyCode.replace('/THO', '');
    }

    return {
      ...engineer,
      assignedProjects,
      code: legacyCode || `TSM-${cleanRole}-${cleanName}`,
      
      team: assignedProjects[0]?.name || 'Chưa gán dự án',
      locked: (engineer as any).isLocked || false,
      username: (engineer as any).username || '',
      role: rawRole,
    };
  }).filter((person) => {
    if (person.role === 'Quản trị viên' || person.username === 'admin') return false;
    
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
  }), [engineers, filter, searchTerm]);

  const openCreateModal = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditModal = (person: typeof people[number]) => {
    setEditingPersonId(person.id);
    setName(person.name || '');
    setPermissions((person.permissions?.length ?? 0) > 0 ? person.permissions! : getDefaultPermissions(person.role || 'Nhân viên'));
    setPhone(person.phone || '');
    setRole(person.role || 'Nhân viên');
    setUsername((person as any).username || '');
    setPassword('');
    setSelectedProjectCodes(person.assignedProjects.map((project: any) => project.code));
    setIsFormOpen(true);
  };

  const handleSavePerson = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || submitting) return;
    if (role !== 'Quản lý dự án' && selectedProjectCodes.length === 0) {
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
          role,
          ...(username ? { username: username.trim() } : {}),
          ...(password ? { password } : {}),
          projectCodes: selectedProjectCodes,
            permissions,
        });
        triggerToast(`Đã cập nhật nhân sự "${name.trim()}" thành công!`, 'success');
      } else {
        await createEngineer({
          name: name.trim(),
          phone,
          title: role,
          role,
          username: username.trim(),
          password,
          projectCodes: selectedProjectCodes,
            permissions,
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
    try {
      await deleteEngineer(id);
      triggerToast(`Đã xóa nhân sự "${name}"`, 'success');
    } catch (err: any) {
      triggerToast(`Lỗi khi xóa nhân sự: ${err?.response?.data?.error || err.message}`, 'warning');
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-hidden">
      <section className={`border-b border-slate-200 bg-white pl-3 pr-14 py-4 md:py-0 md:h-12 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-4">
          <div><h2 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">TÀI KHOẢN & NHÂN SỰ</h2></div>
        </div>

        

        <div className="flex items-center gap-3">
          <span className="h-[40px] px-4 rounded-full flex items-center bg-blue-50 text-primary text-[13px] font-bold border border-blue-100">{engineers.filter(e => e.role !== 'Quản trị viên' && e.username !== 'admin').length} nhân sự</span>
          <button 
            onClick={handleExportExcel} 
            className="flex items-center gap-2 border border-slate-200 bg-white h-[40px] px-5 rounded-lg text-[13px] font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <span className="material-symbols-outlined text-sm">file_download</span>
            Xuất Excel
          </button>
          <button
            onClick={openCreateModal}
            className="bg-primary text-white h-[40px] px-5 rounded-lg text-[13px] font-bold hover:opacity-90 flex items-center gap-2 shadow-xs"
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
                {filters.map((item) => <button key={item.key} onClick={() => setFilter(item.key)} className={`app-tab-button flex items-center gap-2.5 px-3 py-1.5 border-b-2 transition-all whitespace-nowrap ${filter === item.key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>{item.label}</button>)}
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
              <thead className="sticky top-0 z-20 bg-slate-50 text-slate-500 uppercase text-[11px] shadow-[0_1px_2px_rgba(0,0,0,0.05)] border-b border-slate-200"><tr><th className="text-center p-3 bg-slate-50 w-10 whitespace-nowrap">STT</th><th className="text-left p-3 bg-slate-50 whitespace-nowrap">Họ tên</th><th className="text-left p-3 bg-slate-50 whitespace-nowrap">Mã NV</th><th className="text-left p-3 bg-slate-50 whitespace-nowrap">Tài khoản</th><th className="text-left p-3 bg-slate-50 whitespace-nowrap">Vai trò</th><th className="text-left p-3 bg-slate-50 whitespace-nowrap">Dự án</th><th className="text-left p-3 bg-slate-50 whitespace-nowrap">SĐT</th><th className="text-left p-3 bg-slate-50 whitespace-nowrap">Trạng thái</th><th className="text-left p-3 bg-slate-50 whitespace-nowrap">Chức năng</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {people.map((person, index) => (
                  <tr
                    key={person.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => openEditModal(person)}
                  >
                    <td className="p-3 text-center font-mono font-bold text-slate-400 whitespace-nowrap">{index + 1}</td>
                    <td className="p-3 text-sm font-semibold text-slate-900 tracking-tight">
                      <div className="break-words">{person.name}</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-primary break-all">{person.code}</td>
                    <td className="p-3 text-slate-700 font-semibold break-all">{person.username || '-'}</td>
                    <td className="p-3 break-words">
                      <span className={`text-[11px] font-bold ${
                        person.role === 'Quản trị viên' ? 'text-purple-700' :
                        person.role === 'Quản lý dự án' ? 'text-blue-700' :
                        person.role === 'Kỹ sư hiện trường' ? 'text-orange-700' :
                        'text-slate-700'
                      }`}>
                        {person.role}
                      </span>
                    </td>
                    <td className="p-3">
                      {person.role === 'Quản lý dự án' ? (
                        <span className="text-blue-700 text-[11px] font-bold">Tất cả dự án</span>
                      ) : person.assignedProjects.length > 0 ? (
                        <div className="flex flex-wrap gap-y-0.5">
                          {person.assignedProjects.map((mp: any, i: number, arr: any[]) => (
  <span key={mp.code} className="text-primary text-[11px] font-bold break-words">
    {mp.name}{i < arr.length - 1 ? ', ' : ''}
  </span>
))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Chưa gán</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">{person.phone || 'Chưa cập nhật'}</td>
                    <td className="p-3 whitespace-nowrap"><span className={`text-[11px] font-bold ${person.locked ? 'text-red-700' : 'text-emerald-700'}`}>{person.locked ? 'Bị khóa' : 'Đang hoạt động'}</span></td>
                    <td className="p-3 min-w-[150px] whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleLock(person);
                          }}
                          className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[11px] font-bold active:scale-95 transition-all ${person.locked ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'}`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{person.locked ? 'lock_open' : 'lock'}</span>
                          {person.locked ? 'Mở khóa' : 'Khóa'}
                        </button>
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeletingPerson({ id: person.id, name: person.name });
                          }}
                          className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-red-200 bg-white text-[11px] font-bold text-red-600 hover:bg-red-50 hover:border-red-300 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>Xóa
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

      <Modal size='xl' isOpen={isFormOpen} onClose={closeForm} title={editingPersonId ? 'Chỉnh sửa nhân sự' : 'Thêm nhân sự'}>
        <form onSubmit={handleSavePerson} className="p-1">
<div className="flex flex-col lg:flex-row gap-4">
<div className="lg:w-[40%] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-slate-700">Họ tên <span className="text-red-500">*</span></label>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Nhập họ tên" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" required />
            </div>
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-slate-700">Số điện thoại</label>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Nhập SĐT" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-slate-700">Vai trò</label>
              <CustomSelect value={role} onChange={(event) => { const newRole = event.target.value; setRole(newRole); setPermissions(getDefaultPermissions(newRole)); }} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary focus:outline-none">
                <option value="Quản lý dự án">Quản lý dự án</option>
                <option value="Kỹ sư hiện trường">Kỹ sư hiện trường</option>
                <option value="Nhân viên">Nhân viên</option>
              </CustomSelect>
            </div>
            <div className="space-y-1">
              <label className="text-[13px] font-bold text-slate-700">Tên đăng nhập</label>
              <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nhập tên đăng nhập" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[13px] font-bold text-slate-700">Mật khẩu {editingPersonId && <span className="text-slate-400 font-normal">(Bỏ trống nếu không đổi)</span>}</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={editingPersonId ? "••••••••" : "Nhập mật khẩu"} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
          </div>

          
          
            
<div className="pt-4 mt-3 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={closeForm} className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 transition-colors">Hủy</button>
            <button
              type="submit"
              disabled={submitting || projects.length === 0 || !name.trim()}
              className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50 shadow-sm transition-all"
            >
              {submitting ? 'Đang xử lý...' : (editingPersonId ? 'Lưu thay đổi' : 'Thêm nhân sự')}
            </button>
          </div>
</div>
<div className="lg:w-[60%] border-t lg:border-t-0 lg:border-l lg:pl-4 border-slate-100">
<div className="mt-2">
{role !== 'Quản lý dự án' && (
            <div>
              <label className="block text-[13px] font-bold text-slate-700 mb-1.5">
                Phân quyền Dự án <span className="text-red-500">*</span>
              </label>
              <div className={`max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1.5 bg-slate-50 custom-scrollbar ${selectedProjectCodes.length === 0 ? 'border-red-300' : 'border-slate-200'}`}>
                {projects.length === 0 && <p className="text-[11px] text-slate-400 p-2">Chưa có dự án nào trong hệ thống.</p>}
                {projects.map((p) => (
                  <label key={p.code} className="flex items-center gap-2 text-sm p-1.5 hover:bg-slate-100 rounded cursor-pointer transition-colors">
                    <input type="checkbox" checked={selectedProjectCodes.includes(p.code)} onChange={() => toggleProjectCode(p.code)} className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
                    <span className="font-semibold text-slate-700">{p.name}</span>
                    <span className="text-slate-400 text-xs">({p.code})</span>
                  </label>
                ))}
              </div>
              {selectedProjectCodes.length === 0 && (
                <p className="mt-1 text-[11px] text-red-500">Bắt buộc chọn ít nhất 1 dự án để nhân sự có quyền truy cập.</p>
              )}
            </div>
          )}
<div className="border-t border-slate-100 my-2"></div>

              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[13px] font-bold text-slate-700 uppercase">Phân quyền chi tiết</h3>
                
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {/* DỰ ÁN */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-1">Dự án & Tổng quan</h4>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_PROJECTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_PROJECTS']) : setPermissions(p => p.filter(x => x !== 'VIEW_PROJECTS'))} className="accent-primary w-3.5 h-3.5"/>Xem danh sách dự án</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('CREATE_PROJECTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'CREATE_PROJECTS']) : setPermissions(p => p.filter(x => x !== 'CREATE_PROJECTS'))} className="accent-primary w-3.5 h-3.5"/>Tạo dự án mới</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EDIT_PROJECTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EDIT_PROJECTS']) : setPermissions(p => p.filter(x => x !== 'EDIT_PROJECTS'))} className="accent-primary w-3.5 h-3.5"/>Sửa thông tin dự án</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('DELETE_PROJECTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'DELETE_PROJECTS']) : setPermissions(p => p.filter(x => x !== 'DELETE_PROJECTS'))} className="accent-primary w-3.5 h-3.5"/>Xóa dự án</label>
                </div>
                {/* TIẾN ĐỘ */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-1">Tiến độ công việc</h4>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_TASKS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_TASKS']) : setPermissions(p => p.filter(x => x !== 'VIEW_TASKS'))} className="accent-primary w-3.5 h-3.5"/>Xem tiến độ</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('IMPORT_TASKS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'IMPORT_TASKS']) : setPermissions(p => p.filter(x => x !== 'IMPORT_TASKS'))} className="accent-primary w-3.5 h-3.5"/>Nhập Excel/OCR</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EDIT_TASKS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EDIT_TASKS']) : setPermissions(p => p.filter(x => x !== 'EDIT_TASKS'))} className="accent-primary w-3.5 h-3.5"/>Thêm/Sửa/Xóa công việc</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('ASSIGN_TASKS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'ASSIGN_TASKS']) : setPermissions(p => p.filter(x => x !== 'ASSIGN_TASKS'))} className="accent-primary w-3.5 h-3.5"/>Giao việc</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('UPDATE_TASK_PROGRESS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'UPDATE_TASK_PROGRESS']) : setPermissions(p => p.filter(x => x !== 'UPDATE_TASK_PROGRESS'))} className="accent-primary w-3.5 h-3.5"/>Cập nhật % và Trạng thái</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('APPROVE_TASKS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'APPROVE_TASKS']) : setPermissions(p => p.filter(x => x !== 'APPROVE_TASKS'))} className="accent-primary w-3.5 h-3.5"/>Nghiệm thu công việc</label>
                </div>
                {/* VẬT TƯ */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-1">Kế hoạch Vật tư</h4>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_MATERIALS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_MATERIALS']) : setPermissions(p => p.filter(x => x !== 'VIEW_MATERIALS'))} className="accent-primary w-3.5 h-3.5"/>Xem danh sách vật tư</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('IMPORT_MATERIALS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'IMPORT_MATERIALS']) : setPermissions(p => p.filter(x => x !== 'IMPORT_MATERIALS'))} className="accent-primary w-3.5 h-3.5"/>Nhập Excel vật tư</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EDIT_MATERIALS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EDIT_MATERIALS']) : setPermissions(p => p.filter(x => x !== 'EDIT_MATERIALS'))} className="accent-primary w-3.5 h-3.5"/>Sửa/Xóa vật tư</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('UPDATE_MATERIAL_STATUS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'UPDATE_MATERIAL_STATUS']) : setPermissions(p => p.filter(x => x !== 'UPDATE_MATERIAL_STATUS'))} className="accent-primary w-3.5 h-3.5"/>Cập nhật trạng thái</label>
                </div>
                {/* TÀI CHÍNH */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-1">Tài chính & Hợp đồng</h4>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_FINANCE')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_FINANCE']) : setPermissions(p => p.filter(x => x !== 'VIEW_FINANCE'))} className="accent-primary w-3.5 h-3.5"/>Xem bảng giá</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EDIT_PRICES')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EDIT_PRICES']) : setPermissions(p => p.filter(x => x !== 'EDIT_PRICES'))} className="accent-primary w-3.5 h-3.5"/>Cập nhật giá, VAT</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_PAYMENTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_PAYMENTS']) : setPermissions(p => p.filter(x => x !== 'VIEW_PAYMENTS'))} className="accent-primary w-3.5 h-3.5"/>Xem Kế hoạch thanh toán</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EDIT_PAYMENTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EDIT_PAYMENTS']) : setPermissions(p => p.filter(x => x !== 'EDIT_PAYMENTS'))} className="accent-primary w-3.5 h-3.5"/>Cập nhật thanh toán</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_EXPENSES')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_EXPENSES']) : setPermissions(p => p.filter(x => x !== 'VIEW_EXPENSES'))} className="accent-primary w-3.5 h-3.5"/>Xem chi phí công trình</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EDIT_EXPENSES')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EDIT_EXPENSES']) : setPermissions(p => p.filter(x => x !== 'EDIT_EXPENSES'))} className="accent-primary w-3.5 h-3.5"/>Quản lý chi phí công trình</label>
                </div>
                {/* HỆ THỐNG */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-1">Nhân sự & Hệ thống</h4>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_USERS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_USERS']) : setPermissions(p => p.filter(x => x !== 'VIEW_USERS'))} className="accent-primary w-3.5 h-3.5"/>Xem nhân sự</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('MANAGE_USERS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'MANAGE_USERS']) : setPermissions(p => p.filter(x => x !== 'MANAGE_USERS'))} className="accent-primary w-3.5 h-3.5"/>Quản lý nhân sự</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('MANAGE_PERMISSIONS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'MANAGE_PERMISSIONS']) : setPermissions(p => p.filter(x => x !== 'MANAGE_PERMISSIONS'))} className="accent-primary w-3.5 h-3.5"/>Cấp quyền hệ thống</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('MANAGE_PAYROLL')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'MANAGE_PAYROLL']) : setPermissions(p => p.filter(x => x !== 'MANAGE_PAYROLL'))} className="accent-primary w-3.5 h-3.5"/>Bảng chấm công</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('EXPORT_DATA')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'EXPORT_DATA']) : setPermissions(p => p.filter(x => x !== 'EXPORT_DATA'))} className="accent-primary w-3.5 h-3.5"/>Xuất báo cáo (Excel/PDF)</label>
                </div>
                {/* HỒ SƠ */}
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase border-b pb-1">Hồ sơ & Tài liệu</h4>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('VIEW_DOCUMENTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'VIEW_DOCUMENTS']) : setPermissions(p => p.filter(x => x !== 'VIEW_DOCUMENTS'))} className="accent-primary w-3.5 h-3.5"/>Xem hồ sơ</label>
                  <label className="flex items-center gap-2 text-[13px] text-slate-700 font-medium"><input type="checkbox" checked={permissions.includes('MANAGE_DOCUMENTS')} onChange={(e) => e.target.checked ? setPermissions(p => [...p, 'MANAGE_DOCUMENTS']) : setPermissions(p => p.filter(x => x !== 'MANAGE_DOCUMENTS'))} className="accent-primary w-3.5 h-3.5"/>Quản lý hồ sơ</label>
                </div></div></div></div>
</div>
</form>
      </Modal>
      {deletingPerson && (
        <Modal isOpen={!!deletingPerson} onClose={() => setDeletingPerson(null)} title="Xác nhận xóa">
          <div className="py-4">
            <p className="mb-8 text-sm font-medium text-slate-700">Bạn chắc chắn muốn xóa nhân sự "{deletingPerson.name}"?</p>
            <div className="flex justify-end gap-3 border-t pt-4">
              <button onClick={() => setDeletingPerson(null)} className="h-[40px] px-5 border border-slate-300 text-slate-700 bg-white rounded hover:bg-slate-50 transition-colors font-medium">Hủy</button>
              <button onClick={() => { const { id, name } = deletingPerson; setDeletingPerson(null); handleDeletePerson(id, name); }} className="h-[40px] px-5 bg-[#e53935] text-white rounded hover:bg-red-700 transition-colors font-bold shadow-md">Xóa</button>
            </div>
          </div>
        </Modal>
      )}
      <Toast show={toastState.show} message={toastState.message} type={toastState.type} />
    </div>
  );
};
