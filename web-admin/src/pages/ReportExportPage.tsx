import React, { useMemo, useState } from 'react';
import { useRealtimeStore } from '../services/realtimeStore';

const tabs = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Bị từ chối' },
  { key: 'stats', label: 'Thống kê' },
  { key: 'attendance', label: 'Điểm danh' },
];

export const ReportExportPage: React.FC = () => {
  const { tasks, engineers, updateTask, updateTaskProgress } = useRealtimeStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectReason, setRejectReason] = useState('');
  const pureTasks = tasks.filter((task) => !task.isSectionHeader);

  const reportTasks = useMemo(() => {
    if (activeTab === 'pending') return pureTasks.filter((task) => task.issueStatus || (task.progress >= 0.9 && !task.isDone)).slice(0, 80);
    if (activeTab === 'approved') return pureTasks.filter((task) => task.isDone || task.progress >= 1).slice(0, 80);
    if (activeTab === 'rejected') return pureTasks.filter((task) => task.issue && task.issueStatus === 'Yêu cầu sửa').slice(0, 80);
    return [];
  }, [activeTab, pureTasks]);

  const completed = pureTasks.filter((task) => task.isDone || task.progress >= 1).length;
  const doing = pureTasks.filter((task) => task.progress > 0 && task.progress < 1).length;
  const pending = pureTasks.filter((task) => task.issueStatus || (task.progress >= 0.9 && !task.isDone)).length;
  const late = pureTasks.filter((task) => task.issue && !(task.isDone || task.progress >= 1)).length;
  const attended = Math.min(engineers.length, Math.max(1, doing % (engineers.length || 1) + 1));

  const approve = (id: string) => {
    updateTaskProgress(id, 1, true);
    updateTask(id, { issue: '', issueStatus: 'Đã duyệt' });
  };

  const reject = (id: string) => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối / yêu cầu sửa.');
      return;
    }
    updateTask(id, { issue: rejectReason.trim(), issueStatus: 'Yêu cầu sửa' });
    setRejectReason('');
  };

  return (
    <div className="px-0 pt-0 pb-4 space-y-4">
      <section className="bg-white border border-slate-200 rounded-xl shadow-xs px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-xl">analytics</span></div>
          <div><h2 className="text-2xl font-extrabold text-slate-900">Báo cáo</h2></div>
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100 whitespace-nowrap">{pending} chờ duyệt</span>
      </section>

      <section className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2">
          {tabs.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3 py-1.5 rounded-full text-xs font-bold ${activeTab === tab.key ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{tab.label}</button>)}
        </div>

        {['pending', 'approved', 'rejected'].includes(activeTab) && (
          <div className="p-4 space-y-3">
            {activeTab === 'pending' && <input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="Lý do từ chối / yêu cầu sửa" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none" />}
            {reportTasks.map((task) => (
              <div key={task.id} className="rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
                <div className="flex gap-3 min-w-0">
                  <img src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=220&q=70" alt="Ảnh minh chứng" className="w-24 h-16 rounded-lg object-cover bg-slate-100 flex-shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono font-bold text-primary">{task.code}</div>
                    <div className="text-sm font-extrabold text-slate-900 truncate">{task.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{task.assignedEngineerName || 'Chưa giao'} • {task.issueStatus || 'Nhân viên báo hoàn thành'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${activeTab === 'approved' ? 'bg-emerald-50 text-emerald-700' : activeTab === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{activeTab === 'approved' ? 'Đã duyệt' : activeTab === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt'}</span>
                  {activeTab === 'pending' && <button onClick={() => approve(task.id)} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90">Duyệt báo cáo</button>}
                  {activeTab === 'pending' && <button onClick={() => reject(task.id)} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:opacity-90">Từ chối</button>}
                </div>
              </div>
            ))}
            {reportTasks.length === 0 && <div className="p-10 text-center text-xs font-semibold text-slate-400">Chưa có báo cáo trong tab này.</div>}
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <Stat label="Tổng công việc" value={pureTasks.length} icon="assignment" />
            <Stat label="Đang làm" value={doing} icon="pending_actions" />
            <Stat label="Chờ duyệt" value={pending} icon="fact_check" />
            <Stat label="Hoàn thành" value={completed} icon="check_circle" />
            <Stat label="Trễ hạn" value={late} icon="warning" />
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px]"><tr><th className="text-left p-3">Nhân viên</th><th className="text-left p-3">Mã NV</th><th className="text-left p-3">Vai trò</th><th className="text-left p-3">Điểm danh</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {engineers.map((engineer, index) => <tr key={engineer.id} className="hover:bg-slate-50"><td className="p-3 font-extrabold text-slate-900">{engineer.name}</td><td className="p-3 font-mono font-bold text-primary">NV-{String(index + 1).padStart(3, '0')}</td><td className="p-3 text-slate-600 font-semibold">{engineer.title}</td><td className="p-3"><span className={`px-2 py-1 rounded-full text-[11px] font-bold ${index < attended ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{index < attended ? 'Đã điểm danh' : 'Chưa điểm danh'}</span></td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

const Stat = ({ label, value, icon }: { label: string; value: number; icon: string }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
    <div><div className="text-xs font-bold text-slate-500 uppercase">{label}</div><div className="text-2xl font-extrabold text-slate-900 mt-1">{value}</div></div>
    <div className="w-10 h-10 rounded-lg bg-blue-50 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-xl">{icon}</span></div>
  </div>
);