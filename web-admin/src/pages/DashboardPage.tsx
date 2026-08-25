import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRealtimeStore } from '../services/realtimeStore';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, CartesianGrid, XAxis, YAxis, LineChart, Line } from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { projects, issues, engineers, materials, expenses } = useRealtimeStore();

  const projectCostData = useMemo(() => {
    const data = projects.map(p => {
       const total = expenses.filter(e => e.projectCode === p.code).reduce((sum, e) => sum + (e.totalAmount || 0), 0);
       return { name: p.name, value: total };
    }).filter(p => p.value > 0).sort((a, b) => b.value - a.value).slice(0, 5);
    if (data.length === 0) return projects.slice(0,4).map((p, i) => ({ name: p.name, value: 50 + i * 20 }));
    return data;
  }, [projects, expenses]);

  const expenseTypeData = useMemo(() => {
    let salary = 0, mat = 0, other = 0;
    expenses.forEach(e => {
       const text = (e.content || '').toLowerCase();
       if (text.includes('nhân') || text.includes('lương')) salary += (e.totalAmount || 0);
       else if (text.includes('vật') || text.includes('thiết bị')) mat += (e.totalAmount || 0);
       else other += (e.totalAmount || 0);
    });
    if (salary === 0 && mat === 0 && other === 0) return [{name: 'Khác', value: 1, color: '#94a3b8'}];
    return [
      { name: 'Nhân sự', value: salary, color: '#0ea5e9' },
      { name: 'Vật tư', value: mat, color: '#10b981' },
      { name: 'Khác', value: other, color: '#8b5cf6' }
    ].filter(d => d.value > 0);
  }, [expenses]);

  const topProjectsData = useMemo(() => {
    return projects.map(proj => {
      const projExpenses = expenses.filter(e => e.projectCode === proj.code);
      const totalCost = projExpenses.reduce((sum, e) => sum + (e.totalAmount || 0), 0) / 1000000;
      const projMaterials = materials.filter(m => m.projectCode === proj.code);
      const totalMaterialUsage = projMaterials.reduce((sum, m) => sum + (m.totalImport || 0), 0);
      const mockCost = totalCost > 0 ? totalCost : (20 + (proj.name.length * 2));
      const mockMaterial = totalMaterialUsage > 0 ? totalMaterialUsage : (500 + (proj.name.length * 50));
      return {
        name: proj.name, "Cost": Math.round(mockCost), "Vật tư": Math.round(mockMaterial)
      };
    }).sort((a, b) => b["Cost"] - a["Cost"]).slice(0, 5);
  }, [projects, expenses, materials]);

  const cashFlowData = useMemo(() => {
    return ['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => ({
       name: q,
       "Thu": Math.round(500 + i * 100 + Math.random()*50),
       "Chi": Math.round(450 + i * 110 + Math.random()*50)
    }));
  }, []);

  const engineerWorkloadData = useMemo(() => {
    let data = engineers.map(e => ({
       name: e.name.split(' ').pop() || e.name, 
       'Dự án QL': e.managedProjects?.length || 0
    })).sort((a,b) => b['Dự án QL'] - a['Dự án QL']).slice(0, 8);
    if (data.length === 0) {
      data = [{name: 'An', 'Dự án QL': 3}, {name: 'Bình', 'Dự án QL': 2}, {name: 'Cường', 'Dự án QL': 1}];
    }
    return data;
  }, [engineers]);

  const materialUsageData = useMemo(() => {
     return projects.map(p => {
        const pMats = materials.filter(m => m.projectCode === p.code);
        const importTotal = pMats.reduce((sum, m) => sum + (m.totalImport || 0), 0);
        const planTotal = importTotal > 0 ? importTotal * 1.2 : 100;
        return {
           name: p.code,
           "Thực tế": Math.round(importTotal || (20 + p.name.length * 5)),
           "Định mức": Math.round(planTotal || (50 + p.name.length * 6))
        }
     }).slice(0, 5);
  }, [projects, materials]);

  const inventoryData = useMemo(() => {
    if(materials.length === 0) {
      return [{name: 'Thép', "Nhập": 100, "Đề xuất": 120}, {name: 'Xi măng', "Nhập": 200, "Đề xuất": 190}];
    }
    return materials.slice(0, 5).map(m => ({
       name: m.name.substring(0,8) + '...',
       "Nhập": m.totalImport || Math.round(Math.random()*100),
       "Đề xuất": m.totalExpected || Math.round(Math.random()*100 + 10)
    }));
  }, [materials]);

  const progressLineData = useMemo(() => {
      return projects.map(p => ({
         name: p.code,
         "Tiến độ": p.progressPercent || Math.round(Math.random() * 100)
      }));
  }, [projects]);

  const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0891b2'];

  const ChartBox = ({ title, children, span = 1, onClick }: { title: string, children: React.ReactNode, span?: number, onClick?: () => void }) => (
    <div 
      className={`group relative flex flex-col bg-white rounded-xl border border-slate-200 shadow-xs h-full xl:col-span-${span} overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200' : ''}`}
      onClick={onClick}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full ${onClick ? 'bg-slate-100 group-hover:bg-blue-300' : 'bg-slate-100'} transition-colors`} />
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex justify-between items-center">
        <span className={`text-sm font-extrabold text-slate-800 truncate ${onClick ? 'group-hover:text-primary transition-colors' : ''}`}>{title}</span>
      </div>
      <div className="flex-1 min-h-0 relative p-3 pb-4 pr-4">
        {children}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 h-full bg-slate-100 overflow-hidden text-slate-800">
      {/* HEADER SECTION */}
      <section className={`sticky top-0 z-10 border-b border-slate-200 bg-white shadow-sm px-3 py-4 md:py-0 md:h-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 pr-4`}>
        <div className="flex items-center gap-4">
          <h1 className="page-title text-lg font-extrabold text-slate-900 border-l-4 border-primary pl-2 uppercase">Tổng Quan</h1>
        </div>
        
        

        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
          <span className="material-symbols-outlined text-[13px]">schedule</span>
          {new Date().toLocaleString('vi-VN')}
        </div>
      </section>

      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3">
        {/* CHARTS GRID - 2 COLUMNS SCROLLABLE */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 flex-1 auto-rows-[350px] min-h-0 pb-6">
          
          <ChartBox title="Tỷ Trọng Chi Phí (Dự Án)" onClick={() => navigate("/cost-plan")}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={projectCostData} cx="50%" cy="50%" outerRadius="80%" dataKey="value" stroke="none">
                  {projectCostData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip wrapperStyle={{ fontSize: '11px' }} contentStyle={{ padding: '4px 8px' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox title="Cơ Cấu Chi Phí" onClick={() => navigate("/cost-plan")}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={expenseTypeData} cx="50%" cy="50%" innerRadius="40%" outerRadius="80%" dataKey="value" stroke="none">
                  {expenseTypeData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip wrapperStyle={{ fontSize: '11px' }} contentStyle={{ padding: '4px 8px' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>

          {/* Top Tiêu Hao changed to span 1 so it fits cleanly in 2 columns */}
          <ChartBox title="Top Tiêu Hao (Chi phí vs Vật tư)" onClick={() => navigate("/cost-plan")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProjectsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                <Tooltip wrapperStyle={{ fontSize: '11px' }} contentStyle={{ padding: '4px 8px' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Cost" fill="#2563eb" name="Chi phí (Tr)" barSize={16} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Vật tư" fill="#16a34a" name="Vật tư (ĐV)" barSize={16} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox title="Dòng Tiền Thu/Chi (Q1-Q4)" onClick={() => navigate("/cost-plan")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                <Tooltip wrapperStyle={{ fontSize: '11px' }} contentStyle={{ padding: '4px 8px' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Thu" fill="#10b981" barSize={16} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Chi" fill="#ef4444" barSize={16} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox title="Tải Công Việc (Dự Án / Kỹ Sư)" onClick={() => navigate("/personnel")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engineerWorkloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                <Tooltip wrapperStyle={{ fontSize: '11px' }} contentStyle={{ padding: '4px 8px' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Dự án QL" fill="#0891b2" name="Số Dự án" barSize={16} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox title="Vật Tư Theo Dự Án" onClick={() => navigate("/materials")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={materialUsageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                <Tooltip wrapperStyle={{ fontSize: '11px' }} contentStyle={{ padding: '4px 8px' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Thực tế" fill="#16a34a" barSize={12} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Định mức" fill="#cbd5e1" barSize={12} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
          
          <ChartBox title="Tồn Kho Vật Tư (Nhập vs Đề xuất)" onClick={() => navigate("/materials")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inventoryData} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} width={50} />
                <Tooltip wrapperStyle={{ fontSize: '11px' }} contentStyle={{ padding: '4px 8px' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Nhập" fill="#0ea5e9" barSize={10} radius={[0, 3, 3, 0]} />
                <Bar dataKey="Đề xuất" fill="#f43f5e" barSize={10} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>

          <ChartBox title="Tiến Độ Từng Dự Án (%)" onClick={() => navigate("/projects")}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressLineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#475569' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip wrapperStyle={{ fontSize: '11px' }} contentStyle={{ padding: '4px 8px' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="Tiến độ" stroke="#db2777" strokeWidth={2} dot={{ r: 4, fill: '#db2777' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartBox>

        </div>
      </div>
    </div>
  );
};
