import React, { useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useRealtimeStore } from '../services/realtimeStore';

const tabs = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'approved', label: 'Đã duyệt' },
  { key: 'rejected', label: 'Bị từ chối' },
  { key: 'stats', label: 'Thống kê' },
  { key: 'attendance', label: 'Điểm danh' },
  { key: 'summary', label: 'Tổng hợp dự án' },
];

export const ReportExportPage: React.FC = () => {
  const { tasks, engineers, updateTask, updateTaskProgress, projects, expenses, laborPayrolls, purchasingPlans, materialPlans } = useRealtimeStore();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [summarySearch, setSummarySearch] = useState('');
  const updateColumnFilter = (key: string, value: string) => {
    setColumnFilters(prev => ({ ...prev, [key]: value }));
  };
  const clearColumnFilters = () => setColumnFilters({});

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

  const filteredEngineers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return engineers.map((engineer, index) => ({ ...engineer, code: `NV-${String(index + 1).padStart(3, '0')}` })).filter((eng) => {
      const matchSearch = !q ||
        (eng.name || '').toLowerCase().includes(q) ||
        (eng.title || '').toLowerCase().includes(q);
      const cf = columnFilters;
      const matchColumn =
        (!cf.name || (eng.name || '').toLowerCase().includes((cf.name || '').toLowerCase())) &&
        (!cf.title || (eng.title || '').toLowerCase().includes((cf.title || '').toLowerCase()));
      return matchSearch && matchColumn;
    });
  }, [engineers, searchTerm, columnFilters]);

  const projectSummaries = useMemo(() => {
    const q = summarySearch.trim().toLowerCase();
    return projects
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
      .map((p) => {
        const ptasks = pureTasks.filter((t) => t.projectCode === p.code);
        const total = ptasks.length;
        const done = ptasks.filter((t) => t.isDone || t.progress >= 1).length;
        const doing = ptasks.filter((t) => t.progress > 0 && t.progress < 1).length;
        const late = ptasks.filter((t) => t.issue && !(t.isDone || t.progress >= 1)).length;
        const progress = total ? Math.round((done / total) * 100) : 0;
        const expenseTotal = expenses.filter((e) => e.projectCode === p.code).reduce((s, e) => s + Number(e.totalAmount || 0), 0);
        const laborTotal = laborPayrolls.filter((l) => l.projectCode === p.code).reduce((s, l) => s + Number(l.totalAmount || 0), 0);
        const purchaseTotal = purchasingPlans.filter((pp) => pp.projectCode === p.code).reduce((s, pp) => s + Number(pp.totalAmount || 0), 0);
        const matPlansCount = materialPlans.filter((m) => m.projectCode === p.code).length;
        const contract = Number(p.contractValue || 0);
        const totalCost = expenseTotal + laborTotal + purchaseTotal;
        return {
          ...p,
          total,
          done,
          doing,
          late,
          progress,
          expenseTotal,
          laborTotal,
          purchaseTotal,
          matPlansCount,
          totalCost,
          contract,
          diff: contract ? totalCost - contract : null,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [projects, pureTasks, expenses, laborPayrolls, purchasingPlans, materialPlans, summarySearch]);

  const summaryTotals = useMemo(() => {
    return projectSummaries.reduce(
      (acc, p) => ({
        projects: acc.projects + 1,
        tasks: acc.tasks + p.total,
        done: acc.done + p.done,
        totalCost: acc.totalCost + p.totalCost,
        contract: acc.contract + p.contract,
        materials: acc.materials + p.matPlansCount,
      }),
      { projects: 0, tasks: 0, done: 0, totalCost: 0, contract: 0, materials: 0 }
    );
  }, [projectSummaries]);

  const formatVND = (n: number) => (n || 0).toLocaleString('vi-VN');

  const exportSummary = () => {
    const data = projectSummaries.map((p) => ({
      'Mã dự án': p.code,
      'Tên dự án': p.name,
      'Chủ đầu tư': p.client || '',
      'Tổng công việc': p.total,
      'Đang làm': p.doing,
      'Hoàn thành': p.done,
      'Trễ hạn': p.late,
      'Tiến độ (%)': p.progress,
      'Chi phí thực tế (đ)': p.expenseTotal,
      'Lương (đ)': p.laborTotal,
      'Mua sắm vật tư (đ)': p.purchaseTotal,
      'Tổng chi (đ)': p.totalCost,
      'Dự toán / Hợp đồng (đ)': p.contract,
      'Chênh lệch (đ)': p.diff ?? '',
      'Số hạng mục vật tư': p.matPlansCount,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 }, { wch: 34 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TongHopDuAn');
    XLSX.writeFile(wb, `Bao_Cao_Tong_Hop_Du_An_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const approve = (id: string) => {
    updateTaskProgress(id, 1, true);
    updateTask(id, { issue: '', issueStatus: 'Đã duyệt' });
  };

  const reject = (id: string) => {
    updateTask(id, { issue: '', issueStatus: 'Yêu cầu sửa' });
  };

  return (
    <div className="flex flex-col flex-1 min-h-full bg-slate-50 relative overflow-y-auto">
      <section className="border-b border-slate-200 bg-white pl-6 pr-[140px] py-4 md:py-0 md:h-[72px] flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div><h2 className="page-title text-2xl font-extrabold text-slate-900 border-l-4 border-primary pl-4 uppercase">BÁO CÁO</h2></div>
        </div>
        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100 whitespace-nowrap">{pending} chờ duyệt</span>
      </section>

      <div className="px-0 pt-0 pb-4 space-y-0 w-full max-w-full overflow-hidden">
      <section className="bg-white border-b border-r border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2 sticky top-0 z-10 bg-white">
          {tabs.map((tab) => <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`app-tab-button flex items-center gap-1.5 px-3 py-3 border-b-2 transition-all whitespace-nowrap ${activeTab === tab.key ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}`}>{tab.label}</button>)}
        </div>

        {['pending', 'approved', 'rejected'].includes(activeTab) && (
          <div className="p-4 space-y-3">

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
            <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-white">
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Tìm nhân viên..." className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white" />
              {(searchTerm || Object.values(columnFilters).some(v => v)) && (
                <button type="button" onClick={() => { setSearchTerm(''); clearColumnFilters(); }} className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50">Xóa lọc</button>
              )}
            </div>
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px]"><tr><th className="text-left p-3">Nhân viên</th><th className="text-left p-3">Mã NV</th><th className="text-left p-3">Vai trò</th><th className="text-left p-3">Điểm danh</th></tr></thead>
              <tfoot className="bg-slate-50/80 border-t border-slate-200">
                <tr>
                  <td className="p-1"><input value={columnFilters.name || ''} onChange={e => updateColumnFilter('name', e.target.value)} placeholder="Nhân viên..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
                  <td className="p-1"></td>
                  <td className="p-1"><input value={columnFilters.title || ''} onChange={e => updateColumnFilter('title', e.target.value)} placeholder="Vai trò..." className="w-full border border-slate-200 rounded px-1 py-1 text-[10px] bg-white" /></td>
                  <td className="p-1"></td>
                </tr>
              </tfoot>
              <tbody className="divide-y divide-slate-100">
                {filteredEngineers.map((engineer, index) => <tr key={engineer.id} className="hover:bg-slate-50"><td className="p-3 font-extrabold text-slate-900">{engineer.name}</td><td className="p-3 font-mono font-bold text-primary">{engineer.code}</td><td className="p-3 text-slate-600 font-semibold">{engineer.title}</td><td className="p-3"><span className={`px-2 py-1 rounded-full text-[11px] font-bold ${index < attended ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{index < attended ? 'Đã điểm danh' : 'Chưa điểm danh'}</span></td></tr>)}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="overflow-x-auto">
            <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-white flex-wrap">
              <input value={summarySearch} onChange={(e) => setSummarySearch(e.target.value)} placeholder="Tìm theo tên hoặc mã dự án..." className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-primary focus:outline-none bg-white min-w-[240px]" />
              {summarySearch && <button type="button" onClick={() => setSummarySearch('')} className="px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-slate-50">Xóa lọc</button>}
              <div className="ml-auto flex items-center gap-2">
                <button type="button" onClick={exportSummary} className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:opacity-90 inline-flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">download</span>Xuất Excel</button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 bg-slate-50/60 border-b border-slate-100">
              <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[11px] font-bold text-slate-500 uppercase">Dự án</div><div className="text-xl font-extrabold text-slate-900 mt-0.5">{summaryTotals.projects}</div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[11px] font-bold text-slate-500 uppercase">Công việc</div><div className="text-xl font-extrabold text-slate-900 mt-0.5">{summaryTotals.tasks}</div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[11px] font-bold text-slate-500 uppercase">Hoàn thành</div><div className="text-xl font-extrabold text-emerald-600 mt-0.5">{summaryTotals.done}</div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[11px] font-bold text-slate-500 uppercase">Hạng mục vật tư</div><div className="text-xl font-extrabold text-slate-900 mt-0.5">{summaryTotals.materials}</div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[11px] font-bold text-slate-500 uppercase">Tổng chi</div><div className="text-lg font-extrabold text-red-600 mt-0.5">{formatVND(summaryTotals.totalCost)}</div></div>
              <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[11px] font-bold text-slate-500 uppercase">Dự toán / HĐ</div><div className="text-lg font-extrabold text-slate-900 mt-0.5">{formatVND(summaryTotals.contract)}</div></div>
            </div>

            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px]">
                <tr>
                  <th className="text-left p-3">Dự án</th>
                  <th className="text-center p-3">Công việc</th>
                  <th className="text-center p-3">Tiến độ</th>
                  <th className="text-right p-3">Chi phí</th>
                  <th className="text-right p-3">Lương</th>
                  <th className="text-right p-3">Mua sắm VT</th>
                  <th className="text-right p-3">Tổng chi</th>
                  <th className="text-right p-3">Dự toán / HĐ</th>
                  <th className="text-right p-3">Chênh lệch</th>
                  <th className="text-center p-3">Vật tư</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectSummaries.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900">{p.name}</div>
                      <div className="text-[11px] font-mono font-bold text-primary">{p.code}</div>
                      {p.client && <div className="text-[11px] text-slate-500">{p.client}</div>}
                    </td>
                    <td className="p-3 text-center text-slate-600 font-semibold">
                      {p.total}
                      <div className="text-[10px] text-slate-400 font-bold">{p.doing} đang làm • {p.late} trễ</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 justify-center">
                        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${p.progress}%` }}></div>
                        </div>
                        <span className={`text-[11px] font-extrabold ${p.progress >= 100 ? 'text-emerald-600' : p.progress >= 50 ? 'text-primary' : 'text-amber-600'}`}>{p.progress}%</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold text-center">{p.done}/{p.total} việc</div>
                    </td>
                    <td className="p-3 text-right text-slate-600 font-semibold">{formatVND(p.expenseTotal)}</td>
                    <td className="p-3 text-right text-slate-600 font-semibold">{formatVND(p.laborTotal)}</td>
                    <td className="p-3 text-right text-slate-600 font-semibold">{formatVND(p.purchaseTotal)}</td>
                    <td className="p-3 text-right font-extrabold text-red-600">{formatVND(p.totalCost)}</td>
                    <td className="p-3 text-right font-semibold text-slate-600">{formatVND(p.contract)}</td>
                    <td className={`p-3 text-right font-extrabold ${p.diff === null ? 'text-slate-400' : p.diff > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{p.diff === null ? '—' : formatVND(p.diff)}</td>
                    <td className="p-3 text-center text-slate-600 font-semibold">{p.matPlansCount}</td>
                  </tr>
                ))}
                {projectSummaries.length === 0 && <tr><td colSpan={10} className="p-10 text-center text-xs font-semibold text-slate-400">Không có dự án nào.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>
      </div>
    </div>
  );
};

const Stat = ({ label, value, icon }: { label: string; value: number; icon: string }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-between">
    <div><div className="text-xs font-bold text-slate-500 uppercase">{label}</div><div className="text-2xl font-extrabold text-slate-900 mt-1">{value}</div></div>
    <div className="w-10 h-10 rounded-lg bg-blue-50 text-primary flex items-center justify-center"><span className="material-symbols-outlined text-xl">{icon}</span></div>
  </div>
);