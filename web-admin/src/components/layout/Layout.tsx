import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Modal } from '../common/Modal';
import { Toast } from '../common/Toast';
import { useRealtimeStore } from '../../services/realtimeStore';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { addProject, addEngineer, engineers } = useRealtimeStore();
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [toastState, setToastState] = useState({ show: false, message: '' });

  const [projName, setProjName] = useState('');
  const [projCode, setProjCode] = useState('');
  const [projLocation, setProjLocation] = useState('');
  const [projManager, setProjManager] = useState('Kỹ sư Nam');
  const [newManagerName, setNewManagerName] = useState('');
  const [newManagerTitle, setNewManagerTitle] = useState('Chỉ huy trưởng công trình');

  const triggerToast = (message: string) => {
    setToastState({ show: true, message });
    setTimeout(() => setToastState({ show: false, message: '' }), 3500);
  };

  const handleCreateProject = (event: React.FormEvent) => {
    event.preventDefault();
    if (!projName.trim()) return;

    const createdManager =
      projManager === '__NEW__' && newManagerName.trim()
        ? addEngineer({
            name: newManagerName.trim(),
            title: newManagerTitle.trim() || 'Chỉ huy trưởng công trình',
            avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=150&q=80',
            phone: '',
            email: '',
          })
        : null;

    const managerName = createdManager?.name || projManager;

    addProject({
      code: projCode || 'PROJ-' + Math.floor(Math.random() * 1000),
      name: projName,
      location: projLocation || 'Công trường mới',
      progressPercent: 0,
      status: 'active',
      activeTeams: 1,
      totalTasks: 0,
      completedTasks: 0,
      issueTasksCount: 0,
      managerName,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2025-12-31',
    });

    setIsNewProjectModalOpen(false);
    setProjName('');
    setProjCode('');
    setProjLocation('');
    setProjManager(createdManager?.name || engineers[0]?.name || 'Kỹ sư Nam');
    setNewManagerName('');
    setNewManagerTitle('Chỉ huy trưởng công trình');
    triggerToast(`Đã tạo dự án "${projName}" thành công!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      <Sidebar onOpenNewProject={() => setIsNewProjectModalOpen(true)} />

      <div className="ml-60 flex flex-col min-h-screen flex-1">
        <main className="flex-1 bg-slate-50">{children}</main>
      </div>

      <Toast show={toastState.show} message={toastState.message} />

      <Modal isOpen={isNewProjectModalOpen} onClose={() => setIsNewProjectModalOpen(false)} title="Tạo mới Dự án / Công trình">
        <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Tên Dự án / Công trình *</label>
            <input
              type="text"
              required
              placeholder="VD: Khu Căn hộ Cao cấp Landmark Phase 3"
              value={projName}
              onChange={(event) => setProjName(event.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Mã Dự án</label>
              <input
                type="text"
                placeholder="VD: LM-PH3"
                value={projCode}
                onChange={(event) => setProjCode(event.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Chỉ huy trưởng</label>
              <div className="flex items-center gap-2">
                <select
                  value={projManager}
                  onChange={(event) => setProjManager(event.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                >
                  {engineers.map((engineer) => (
                    <option key={engineer.id} value={engineer.name}>{engineer.name}</option>
                  ))}
                  <option value="__NEW__">+ Thêm người mới...</option>
                </select>
                <button type="button" onClick={() => setProjManager('__NEW__')} className="flex-shrink-0 w-9 h-9 flex items-center justify-center border border-blue-300 bg-blue-50 text-primary rounded-lg text-base font-bold hover:bg-blue-100" title="Thêm người mới">+</button>
              </div>
            </div>
          </div>

          {projManager === '__NEW__' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên người mới *</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Kỹ sư Minh"
                  value={newManagerName}
                  onChange={(event) => setNewManagerName(event.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chức danh</label>
                <input
                  type="text"
                  placeholder="VD: Chỉ huy trưởng công trình"
                  value={newManagerTitle}
                  onChange={(event) => setNewManagerTitle(event.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Địa điểm công trình</label>
            <input
              type="text"
              placeholder="VD: Phường An Phú, TP. Thủ Đức, Ho Chi Minh City"
              value={projLocation}
              onChange={(event) => setProjLocation(event.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none bg-white"
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button type="button" onClick={() => setIsNewProjectModalOpen(false)} className="px-4 py-1.5 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-100">Hủy</button>
            <button type="submit" className="px-5 py-1.5 bg-primary text-white rounded-lg font-bold hover:opacity-90">Khởi tạo Dự án</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
