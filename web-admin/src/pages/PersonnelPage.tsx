import React, { useMemo, useState } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';

const filters = [
  { key: 'all', label: 'Tất cả' },
  { key: 'manager', label: 'Quản lý' },
  { key: 'worker', label: 'Nhân viên/Thợ' },
  { key: 'active', label: 'Đang hoạt động' },
  { key: 'locked', label: 'Bị khóa' },
];

export const PersonnelPage: React.FC = () => {
  const { engineers, addEngineer } = useRealtimeStore();
  const [filter, setFilter] = useState('all');
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('Nhân viên/Thợ');
  const [team, setTeam] = useState('Đội thi công 1');
  const [isFormOpen, setIsFormOpen] = useState(false);

  const people = useMemo(() => engineers.map((engineer, index) => ({
    ...engineer,
    code: `NV-${String(index + 1).padStart(3, '0')}`,
    role: index <= 1 ? 'Quản lý' : 'Nhân viên/Thợ',
    team: index % 2 === 0 ? 'Đội thi công 1' : 'Đội bảo trì',
    locked: lockedIds.includes(engineer.id),
  })).filter((person) => filter === 'all'
    || (filter === 'manager' && person.role.includes('Quản lý'))
    || (filter === 'worker' && person.role.includes('Nhân viên'))
    || (filter === 'active' && !person.locked)
    || (filter === 'locked' && person.locked)), [engineers, filter, lockedIds]);

  const handleAddPerson = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    addEngineer({
      name: name.trim(),
      title: role,
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
      phone,
      email: '',
    });
    setName('');
    setPhone('');
    setIsFormOpen(false);
  };

  const toggleLock = (id: string) => setLockedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return (
    <div className="px-0 pt-0 pb-4 space-y-4">
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-xl">groups</span></div>
          <div><h2 className="text-2xl font-extrabold text-slate-900">Nhân sự</h2></div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 rounded-full bg-blue-50 text-primary text-xs font-bold border border-blue-100">{engineers.length} nhân sự</span>
          <button onClick={() => setIsFormOpen(true)} className="bg-primary text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm align-[-2px]">add</span>Thêm nhân sự
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2">
            {filters.map((item) => <button key={item.key} onClick={() => setFilter(item.key)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${filter === item.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{item.label}</button>)}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px]"><tr><th className="text-left p-3">Họ tên</th><th className="text-left p-3">Mã NV</th><th className="text-left p-3">Vai trò</th><th className="text-left p-3">SĐT</th><th className="text-left p-3">Trạng thái</th><th className="text-left p-3">Chức năng</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {people.map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-slate-900">{person.name}<div className="text-[11px] font-semibold text-slate-500">{person.team}</div></td>
                    <td className="p-3 font-mono font-bold text-primary">{person.code}</td>
                    <td className="p-3 font-semibold text-slate-700">{person.role}</td>
                    <td className="p-3 text-slate-600">{person.phone || 'Chưa cập nhật'}</td>
                    <td className="p-3"><span className={`px-2 py-1 rounded-full text-[11px] font-bold ${person.locked ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{person.locked ? 'Bị khóa' : 'Đang hoạt động'}</span></td>
                    <td className="p-3"><div className="flex flex-wrap gap-1.5"><button className="px-2 py-1 rounded border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Sửa</button><button onClick={() => toggleLock(person.id)} className="px-2 py-1 rounded border border-slate-200 font-bold text-primary hover:bg-blue-50">{person.locked ? 'Mở khóa' : 'Khóa'}</button><button className="px-2 py-1 rounded border border-slate-200 font-bold text-slate-600 hover:bg-slate-50">Gán đội/QL</button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-lg text-slate-900">Thêm nhân sự</h3>
              <button type="button" onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddPerson} className="p-5 space-y-4">
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Họ tên" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Số điện thoại" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              <select value={role} onChange={(event) => setRole(event.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary focus:outline-none">
                <option>Quản lý</option><option>Nhân viên/Thợ</option>
              </select>
              <input value={team} onChange={(event) => setTeam(event.target.value)} placeholder="Đội/Nhóm" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:outline-none" />
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200">Hủy</button>
                <button type="submit" className="flex-1 bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90">Thêm nhân sự</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};