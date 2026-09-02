import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SharedTaskTabs } from '../components/common/SharedTaskTabs';
import { useRealtimeStore } from '../services/realtimeStore';
import { useAuthStore } from '../services/authStore';

export const TaskAssignmentPage: React.FC = () => {
  const { tasks, projects, engineers, updateTask } = useRealtimeStore();
  const user = useAuthStore(state => state.user);
  const location = useLocation();

  const [toastState, setToastState] = useState({ show: false, message: '', type: 'success' as 'success' | 'info' | 'warning' });
  const triggerToast = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setToastState({ show: true, message, type });
    setTimeout(() => setToastState({ show: false, message: '', type: 'success' }), 3000);
  };

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEngineerId, setSelectedEngineerId] = useState('');
  
  const [filterProjectCode, setFilterProjectCode] = useState('all');
  const [activeTab, setActiveTab] = useState<'unassigned' | 'assigned' | 'my-tasks'>(() => (location.state as any)?.tab || 'unassigned');

  useEffect(() => {
    if ((location.state as any)?.tab) {
      setActiveTab((location.state as any).tab);
    }
  }, [location.state]);

  const displayedTasks = useMemo(() => {
    let filtered = tasks.filter(t => !t.isSectionHeader);
    if (activeTab === 'unassigned') {
      filtered = filtered.filter(t => !t.assignedEngineerId || t.status === 'Chưa làm' || t.status === 'Chờ nhận việc');
    } else {
      filtered = filtered.filter(t => t.assignedEngineerId && t.status !== 'Chưa làm' && t.status !== 'Chờ nhận việc');
    }
    
    if (filterProjectCode !== 'all') {
      filtered = filtered.filter(t => t.projectCode === filterProjectCode);
    }
    return filtered;
  }, [tasks, filterProjectCode, activeTab]);

  const handleToggleSelectAll = () => {
    if (selectedTaskIds.length === displayedTasks.length && displayedTasks.length > 0) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(displayedTasks.map(t => t.id));
    }
  };

  const handleToggleTask = (id: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleAssign = () => {
    if (!selectedEngineerId) {
      triggerToast('Vui lòng chọn kỹ sư!', 'warning');
      return;
    }
    if (selectedTaskIds.length === 0) {
      triggerToast('Vui lòng chọn ít nhất 1 hạng mục!', 'warning');
      return;
    }

    const eng = engineers.find(e => e.id === selectedEngineerId);
    const engName = eng ? eng.name : '';

    selectedTaskIds.forEach(id => {
      updateTask(id, {
        assignedEngineerId: selectedEngineerId,
        assignedEngineerName: engName,
        assignerId: user?.id,
        status: 'Chờ nhận việc'
      });
    });

    triggerToast(`Đã giao ${selectedTaskIds.length} hạng mục cho ${engName}!`, 'success');
    setSelectedTaskIds([]);
    setIsModalOpen(false);
    setSelectedEngineerId('');
  };

  if (user?.role !== 'admin' && user?.role !== 'Quản trị viên') {
    return <div className="p-8 text-center text-red-500 font-bold">Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full overflow-hidden">
      <div className="bg-white border-b border-slate-200 pl-3 pr-24 py-4 md:py-3 lg:py-0 lg:min-h-[3rem] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shrink-0 shadow-sm flex-wrap">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-0 flex-wrap">
          <h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase shrink-0">
            CÔNG VIỆC
          </h1>
          <SharedTaskTabs activeTab={activeTab as any} onTabChange={(t) => { setActiveTab(t); setSelectedTaskIds([]); }} />
        </div>
        <div className="flex items-center gap-4">
          <select 
            value={filterProjectCode} 
            onChange={(e) => setFilterProjectCode(e.target.value)}
            className="border border-slate-300 rounded px-3 h-[36px] text-sm bg-white focus:outline-none focus:border-primary font-medium cursor-pointer"
          >
            <option value="all">-- Tất cả Dự án --</option>
            {projects.map(p => (
              <option key={p.id} value={p.code}>{p.name}</option>
            ))}
          </select>
          {activeTab === 'unassigned' && (
            <button 
              disabled={selectedTaskIds.length === 0}
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-bold shadow-sm transition-all ${
                selectedTaskIds.length > 0 ? 'bg-primary text-white hover:bg-primary/90' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined text-base">send</span>
              Giao {selectedTaskIds.length > 0 ? selectedTaskIds.length : ''} việc
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col border-t border-slate-200">
        <div className="w-full h-full overflow-auto custom-scrollbar bg-white">
          <table className="w-full text-left border-collapse text-sm min-w-[1000px]">
            <thead className="bg-slate-50 text-slate-500 font-bold text-[11px] uppercase sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
              <tr>
                {activeTab === 'unassigned' && (
                  <th className="sticky left-0 z-20 py-2.5 px-3 w-[50px] min-w-[50px] bg-slate-50 text-center border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 cursor-pointer accent-primary"
                      checked={displayedTasks.length > 0 && selectedTaskIds.length === displayedTasks.length}
                      onChange={handleToggleSelectAll}
                    />
                  </th>
                )}
                <th className="py-2.5 px-4 w-[250px] border-r border-slate-200">Dự án</th>
                <th className="py-2.5 px-4 border-r border-slate-200">Nội dung công việc</th>
                <th className="py-2.5 px-4 w-40 border-r border-slate-200">Người phụ trách</th>
                <th className="py-2.5 px-4 w-32 border-r border-slate-200">Trạng thái</th>
                <th className="py-2.5 px-4 w-20 text-center border-r border-slate-200">KL</th>
                <th className="py-2.5 px-4 w-20 text-center">ĐVT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-medium italic">Không có công việc nào</td>
                </tr>
              ) : (
                displayedTasks.map((t, idx) => {
                  const p = projects.find(proj => proj.code === t.projectCode);
                  const isChecked = selectedTaskIds.includes(t.id);
                  return (
                    <tr key={t.id} className={`hover:bg-blue-50/50 transition-colors cursor-pointer ${isChecked && activeTab === 'unassigned' ? 'bg-blue-50/50' : 'bg-white'}`} onClick={() => { if (activeTab === 'unassigned') handleToggleTask(t.id); }}>
                      {activeTab === 'unassigned' && (
                        <td className={`sticky left-0 z-10 py-2.5 px-3 text-center border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${isChecked ? 'bg-blue-50' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 cursor-pointer accent-primary"
                            checked={isChecked}
                            onChange={() => handleToggleTask(t.id)}
                          />
                        </td>
                      )}
                      <td className="py-2.5 px-4 font-bold text-slate-700 text-[11px] uppercase border-r border-slate-200">{p ? p.name : t.projectCode}</td>
                      <td className="py-2.5 px-4 font-medium text-slate-800 text-xs border-l border-slate-200 flex flex-col">
                        <span>{t.name}</span>
                        {t.sectionName && t.sectionName !== t.name && (
                          <span className="text-[10px] text-slate-500 mt-1">{t.sectionName}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-bold text-slate-700 border-l border-slate-200">
                        {t.assignedEngineerName ? t.assignedEngineerName.split('|')[0] : <span className="text-slate-400 font-normal italic">Chưa có</span>}
                      </td>
                      <td className="py-2.5 px-4 border-l border-slate-200">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          t.status === 'Chờ nhận việc' ? 'bg-amber-100 text-amber-700' :
                          t.status === 'Đang làm' ? 'bg-blue-100 text-blue-700' :
                          t.status === 'Chờ nghiệm thu' ? 'bg-emerald-100 text-emerald-700' :
                          t.status === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {t.status || 'Chưa làm'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center text-slate-600 font-medium text-xs border-l border-slate-200">{t.volume}</td>
                      <td className="py-2.5 px-4 text-center text-slate-600 font-medium text-xs border-l border-slate-200">{t.unit}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">assignment_add</span>
                Giao việc cho nhân viên
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="px-6 py-6 flex flex-col gap-4">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm font-medium border border-blue-100 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">info</span>
                Bạn đang chọn giao {selectedTaskIds.length} đầu mục công việc.
              </div>
              
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-slate-700">Chọn người phụ trách</label>
                <select 
                  value={selectedEngineerId} 
                  onChange={(e) => setSelectedEngineerId(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary w-full font-medium"
                >
                  <option value="">-- Chọn nhân viên / kỹ sư --</option>
                  {engineers.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors bg-white border border-slate-300">
                Hủy
              </button>
              <button onClick={handleAssign} className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 shadow-md transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {toastState.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
          <div className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 text-white font-medium ${
            toastState.type === 'success' ? 'bg-emerald-600' :
            toastState.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
          }`}>
            <span className="material-symbols-outlined">
              {toastState.type === 'success' ? 'check_circle' : toastState.type === 'warning' ? 'warning' : 'info'}
            </span>
            {toastState.message}
          </div>
        </div>
      )}
    </div>
  );
};
